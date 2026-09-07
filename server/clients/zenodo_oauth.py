"""Low-level Zenodo OAuth2 HTTP helpers (authorization-code + refresh)."""

from __future__ import annotations

from typing import Any, Dict
from urllib.parse import urlencode

import requests

from configs.app_settings import settings


class ZenodoOAuthError(Exception):
    """Zenodo token endpoint or configuration error."""

    def __init__(self, message: str, *, status_code: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def is_configured() -> bool:
    return bool(
        settings.ZENODO_CLIENT_ID
        and settings.ZENODO_CLIENT_SECRET
        and settings.ZENODO_REDIRECT_URI
    )


def authorize_url(*, state: str) -> str:
    if not is_configured():
        raise ZenodoOAuthError("Zenodo OAuth is not configured")
    query = urlencode(
        {
            "client_id": settings.ZENODO_CLIENT_ID,
            "response_type": "code",
            "scope": settings.ZENODO_OAUTH_SCOPES,
            "state": state,
            "redirect_uri": settings.ZENODO_REDIRECT_URI,
        }
    )
    return f"{settings.ZENODO_BASE_URL}/oauth/authorize?{query}"


def _token_endpoint() -> str:
    return f"{settings.ZENODO_BASE_URL}/oauth/token"


def exchange_authorization_code(code: str) -> Dict[str, Any]:
    """
    Exchange an authorization code for access + refresh tokens.

    Zenodo expects application/x-www-form-urlencoded body fields.
    """
    if not is_configured():
        raise ZenodoOAuthError("Zenodo OAuth is not configured")
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.ZENODO_REDIRECT_URI,
        "client_id": settings.ZENODO_CLIENT_ID,
        "client_secret": settings.ZENODO_CLIENT_SECRET,
    }
    return _post_token(data)


def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    if not is_configured():
        raise ZenodoOAuthError("Zenodo OAuth is not configured")
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.ZENODO_CLIENT_ID,
        "client_secret": settings.ZENODO_CLIENT_SECRET,
    }
    return _post_token(data)


def _post_token(data: Dict[str, str]) -> Dict[str, Any]:
    try:
        response = requests.post(
            _token_endpoint(),
            data=data,
            headers={"Accept": "application/json"},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise ZenodoOAuthError(f"Zenodo token request failed: {exc}") from exc

    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}

    if response.status_code >= 400:
        detail = payload.get("error_description") or payload.get("error") or response.text
        raise ZenodoOAuthError(
            f"Zenodo token error: {detail}",
            status_code=response.status_code,
            payload=payload,
        )
    if not isinstance(payload, dict) or not payload.get("access_token"):
        raise ZenodoOAuthError(
            "Zenodo token response missing access_token",
            status_code=response.status_code,
            payload=payload,
        )
    return payload
