"""Zenodo OAuth broker HTTP routes (auth only — no deposit yet)."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse

from configs.app_settings import settings
from services import zenodo_oauth_service as oauth

router = APIRouter(prefix="/zenodo", tags=["zenodo"])


def _json(payload: dict, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        content=payload,
        status_code=status_code,
        headers=dict(oauth.NO_STORE_HEADERS),
    )


@router.get("/oauth/start")
async def oauth_start(
    request: Request,
    response: Response,
    return_to: Optional[str] = Query(
        default=None,
        description="Relative frontend path to return to after OAuth callback",
    ),
):
    """
    Begin Zenodo authorization-code flow.

    Returns JSON with ``authorize_url`` and ``session_id``, and sets the
    httpOnly session cookie. The frontend should navigate to ``authorize_url``.
    """
    payload = oauth.start_oauth(request=request, response=response, return_to=return_to)
    # Preserve Set-Cookie from the Response dependency by copying onto JSONResponse
    out = _json(payload)
    set_cookie = response.headers.get("set-cookie")
    if set_cookie:
        out.headers.append("set-cookie", set_cookie)
    for key, value in oauth.NO_STORE_HEADERS.items():
        out.headers[key] = value
    # Re-apply cookie explicitly (TestClient / Starlette Response merge is fragile)
    sid = payload.get("session_id")
    if sid:
        out.set_cookie(
            key=settings.ZENODO_SESSION_COOKIE,
            value=sid,
            httponly=True,
            secure=settings.ZENODO_COOKIE_SECURE,
            samesite="lax",
            max_age=settings.ZENODO_SESSION_TTL_SECONDS,
            path="/",
        )
    return out


@router.get("/oauth/callback")
async def oauth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    """
    Zenodo redirects here after the user approves (or denies) the app.

    Requires the initiating session cookie (or X-Zenodo-Session) to match the
    pending ``state``. Exchanges the code server-side, rotates the session id,
    then redirects the browser back to the frontend.
    """
    redirect_url, session = oauth.handle_callback(
        request=request,
        code=code,
        state=state,
        error=error,
        error_description=error_description,
    )
    redirect = RedirectResponse(
        url=redirect_url,
        status_code=302,
        headers=dict(oauth.NO_STORE_HEADERS),
    )
    if session is not None and session.access_token:
        # Successful connect — set rotated session cookie
        redirect.set_cookie(
            key=settings.ZENODO_SESSION_COOKIE,
            value=session.session_id,
            httponly=True,
            secure=settings.ZENODO_COOKIE_SECURE,
            samesite="lax",
            max_age=settings.ZENODO_SESSION_TTL_SECONDS,
            path="/",
        )
    return redirect


@router.get("/oauth/status")
async def oauth_status(request: Request):
    """Public status for the current browser/API session (never returns tokens)."""
    return _json(oauth.status_for_request(request))


@router.post("/oauth/disconnect")
async def oauth_disconnect(request: Request, response: Response):
    """Forget Zenodo tokens for this session and clear the cookie."""
    payload = oauth.disconnect(request, response)
    out = _json(payload)
    out.delete_cookie(key=settings.ZENODO_SESSION_COOKIE, path="/")
    return out
