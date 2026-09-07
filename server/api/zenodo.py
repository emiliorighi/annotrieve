"""Zenodo OAuth broker HTTP routes (auth only — no deposit yet)."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import RedirectResponse

from configs.app_settings import settings
from services import zenodo_oauth_service as oauth

router = APIRouter(prefix="/zenodo", tags=["zenodo"])


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
    return oauth.start_oauth(request=request, response=response, return_to=return_to)


@router.get("/oauth/callback")
async def oauth_callback(
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    """
    Zenodo redirects here after the user approves (or denies) the app.

    Exchanges the code server-side, stores tokens on the session row, then
    redirects the browser back to the frontend.
    """
    redirect_url, session = oauth.handle_callback(
        code=code,
        state=state,
        error=error,
        error_description=error_description,
    )
    redirect = RedirectResponse(url=redirect_url, status_code=302)
    if session is not None:
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
    return oauth.status_for_request(request)


@router.post("/oauth/disconnect")
async def oauth_disconnect(request: Request, response: Response):
    """Forget Zenodo tokens for this session and clear the cookie."""
    return oauth.disconnect(request, response)
