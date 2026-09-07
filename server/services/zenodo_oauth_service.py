"""Zenodo OAuth broker: session lifecycle for anonymous Annotrieve clients."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi import HTTPException, Request, Response

from clients import zenodo_oauth as zenodo_client
from configs.app_settings import settings
from db.models import ZenodoOAuthRateLimit, ZenodoOAuthSession

SESSION_HEADER = "X-Zenodo-Session"
NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _require_configured() -> None:
    if not zenodo_client.is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Zenodo OAuth is not configured. Set ZENODO_CLIENT_ID, "
                "ZENODO_CLIENT_SECRET, and ZENODO_REDIRECT_URI."
            ),
        )


def _new_id() -> str:
    return secrets.token_urlsafe(32)


def client_ip_from_request(request: Request) -> str:
    """Leftmost X-Forwarded-For hop (Traefik), else ASGI client host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_oauth_rate_limit(ip: str, action: str) -> None:
    """
    Rolling 1h limit on oauth start/callback per IP.

    Raises HTTPException(429) when the combined start+callback budget is exhausted.
    """
    ip = ip or "unknown"
    now = _utcnow()
    window_start = now - timedelta(hours=1)
    used = ZenodoOAuthRateLimit.objects(ip=ip, created_at__gte=window_start).count()
    limit = max(1, settings.ZENODO_OAUTH_HOURLY_LIMIT)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Zenodo OAuth rate limit exceeded; try again later",
                "limit": limit,
                "window_hours": 1,
                "remaining": 0,
            },
        )
    ZenodoOAuthRateLimit(ip=ip, action=action, created_at=now).save()


def _attach_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=settings.ZENODO_SESSION_COOKIE,
        value=session_id,
        httponly=True,
        secure=settings.ZENODO_COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ZENODO_SESSION_TTL_SECONDS,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.ZENODO_SESSION_COOKIE,
        path="/",
    )


def resolve_session_id(request: Request) -> Optional[str]:
    header = request.headers.get(SESSION_HEADER)
    if header and header.strip():
        return header.strip()
    cookie = request.cookies.get(settings.ZENODO_SESSION_COOKIE)
    if cookie and cookie.strip():
        return cookie.strip()
    return None


def get_session(session_id: Optional[str]) -> Optional[ZenodoOAuthSession]:
    if not session_id:
        return None
    return ZenodoOAuthSession.objects(session_id=session_id).first()


def touch_session(session: ZenodoOAuthSession) -> None:
    session.last_seen_at = _utcnow()
    session.updated_at = session.last_seen_at
    session.save()


def _apply_token_payload(session: ZenodoOAuthSession, payload: Dict[str, Any]) -> None:
    session.access_token = payload["access_token"]
    if payload.get("refresh_token"):
        session.refresh_token = payload["refresh_token"]
    session.token_type = payload.get("token_type") or "Bearer"
    if payload.get("scope"):
        session.scope = payload["scope"]
    expires_in = payload.get("expires_in")
    if expires_in is not None:
        try:
            session.expires_at = _utcnow() + timedelta(seconds=int(expires_in))
        except (TypeError, ValueError):
            session.expires_at = None
    session.updated_at = _utcnow()
    session.last_seen_at = session.updated_at
    session.save()


def start_oauth(
    *,
    request: Request,
    response: Response,
    return_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a fresh broker session and return the Zenodo authorize URL.

    Always mints a new ``session_id`` (invalidates any prior cookie session) to
    reduce session-fixation risk. Sets the session cookie on ``response``.
    """
    _require_configured()
    enforce_oauth_rate_limit(client_ip_from_request(request), "start")

    prior = get_session(resolve_session_id(request))
    if prior is not None:
        prior.delete()

    state = _new_id()
    session = ZenodoOAuthSession(
        session_id=_new_id(),
        oauth_state=state,
        return_to=return_to,
    )
    session.save()

    _attach_session_cookie(response, session.session_id)
    authorize = zenodo_client.authorize_url(state=state)
    return {
        "authorize_url": authorize,
        "session_id": session.session_id,
        "configured": True,
    }


def handle_callback(
    *,
    request: Request,
    code: Optional[str],
    state: Optional[str],
    error: Optional[str] = None,
    error_description: Optional[str] = None,
) -> Tuple[str, Optional[ZenodoOAuthSession]]:
    """
    Exchange ``code`` for tokens when ``state`` matches the pending session
    **and** the browser presents that same session via cookie/header.

    On success, rotates ``session_id`` (session fixation mitigation).
    Returns (frontend_redirect_url, session_or_none).
    """
    enforce_oauth_rate_limit(client_ip_from_request(request), "callback")

    if error:
        return (
            _frontend_redirect(ok=False, reason=error, detail=error_description),
            None,
        )
    if not code or not state:
        return (
            _frontend_redirect(ok=False, reason="missing_code_or_state"),
            None,
        )

    session = ZenodoOAuthSession.objects(oauth_state=state).first()
    if session is None:
        return (
            _frontend_redirect(ok=False, reason="invalid_state"),
            None,
        )

    browser_sid = resolve_session_id(request)
    if not browser_sid or browser_sid != session.session_id:
        return (
            _frontend_redirect(
                ok=False,
                reason="session_mismatch",
                detail="OAuth callback is not bound to this browser session",
                return_to=session.return_to,
            ),
            None,
        )

    try:
        payload = zenodo_client.exchange_authorization_code(code)
    except zenodo_client.ZenodoOAuthError as exc:
        return (
            _frontend_redirect(
                ok=False,
                reason="token_exchange_failed",
                detail=str(exc),
                return_to=session.return_to,
            ),
            # Keep existing cookie/session id so the user can retry connect
            session,
        )

    _apply_token_payload(session, payload)
    # Rotate identifiers after successful login
    session.session_id = _new_id()
    session.oauth_state = _new_id()
    session.save()
    return (
        _frontend_redirect(ok=True, return_to=session.return_to),
        session,
    )


def status_for_request(request: Request) -> Dict[str, Any]:
    session = get_session(resolve_session_id(request))
    if session is None:
        return {
            "connected": False,
            "configured": zenodo_client.is_configured(),
        }
    touch_session(session)
    return {
        "connected": session.is_connected,
        "configured": zenodo_client.is_configured(),
        "scope": session.scope,
        "expires_at": session.expires_at.isoformat() + "Z" if session.expires_at else None,
        "session_id": session.session_id,
    }


def disconnect(request: Request, response: Response) -> Dict[str, Any]:
    session = get_session(resolve_session_id(request))
    if session is not None:
        session.delete()
    _clear_session_cookie(response)
    return {"connected": False, "configured": zenodo_client.is_configured()}


def get_valid_access_token(session: ZenodoOAuthSession) -> str:
    """
    Return a usable access token, refreshing when expired.

    Intended for future deposit jobs — not exposed via HTTP.
    """
    if not session.access_token:
        raise HTTPException(status_code=401, detail="Zenodo account is not connected")

    skew = timedelta(seconds=60)
    if session.expires_at and session.expires_at <= _utcnow() + skew:
        if not session.refresh_token:
            raise HTTPException(
                status_code=401,
                detail="Zenodo access token expired; reconnect required",
            )
        try:
            payload = zenodo_client.refresh_access_token(session.refresh_token)
        except zenodo_client.ZenodoOAuthError as exc:
            raise HTTPException(
                status_code=401,
                detail=f"Zenodo token refresh failed: {exc}",
            ) from exc
        _apply_token_payload(session, payload)
    else:
        touch_session(session)

    assert session.access_token
    return session.access_token


def _frontend_redirect(
    *,
    ok: bool,
    return_to: Optional[str] = None,
    reason: Optional[str] = None,
    detail: Optional[str] = None,
) -> str:
    base = (return_to or settings.ZENODO_FRONTEND_RETURN_URL or "/").strip()
    if not base:
        base = "/"
    # Only allow relative return paths (open-redirect guard)
    if return_to:
        parsed = urlsplit(return_to)
        if parsed.scheme or parsed.netloc:
            base = settings.ZENODO_FRONTEND_RETURN_URL or "/"
        else:
            base = return_to if return_to.startswith("/") else f"/{return_to}"

    parts = urlsplit(base)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["zenodo"] = "connected" if ok else "error"
    if reason and not ok:
        query["zenodo_error"] = reason
    if detail and not ok:
        query["zenodo_error_detail"] = detail[:200]
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path or "/", urlencode(query), parts.fragment)
    )
