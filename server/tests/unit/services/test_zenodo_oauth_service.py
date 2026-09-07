from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from clients.zenodo_oauth import ZenodoOAuthError
from services import zenodo_oauth_service as svc

pytestmark = pytest.mark.unit


def _aware_utc_naive(**delta_kwargs) -> datetime:
    base = datetime.now(timezone.utc).replace(tzinfo=None)
    if delta_kwargs:
        return base + timedelta(**delta_kwargs)
    return base


class TestResolveSessionId:
    def test_prefers_header_over_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        request = MagicMock()
        request.headers = {svc.SESSION_HEADER: " from-header "}
        request.cookies = {"sid": "from-cookie"}
        assert svc.resolve_session_id(request) == "from-header"

    def test_falls_back_to_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        request = MagicMock()
        request.headers = {}
        request.cookies = {"sid": "cookie-id"}
        assert svc.resolve_session_id(request) == "cookie-id"

    def test_missing(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        request = MagicMock()
        request.headers = {}
        request.cookies = {}
        assert svc.resolve_session_id(request) is None


class TestStartOAuth:
    def test_requires_config(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: False)
        with pytest.raises(HTTPException) as exc:
            svc.start_oauth(request=MagicMock(headers={}, cookies={}), response=MagicMock())
        assert exc.value.status_code == 503

    def test_creates_session(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        monkeypatch.setattr(
            svc.zenodo_client,
            "authorize_url",
            lambda state: f"https://zenodo.org/oauth/authorize?state={state}",
        )
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        monkeypatch.setattr(svc.settings, "ZENODO_COOKIE_SECURE", False)
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_TTL_SECONDS", 3600)

        saved = {}

        class FakeSession:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)
                self.access_token = kwargs.get("access_token")
                self.refresh_token = kwargs.get("refresh_token")
                self.expires_at = kwargs.get("expires_at")
                self.scope = kwargs.get("scope")

            def save(self):
                saved["session"] = self

        response = MagicMock()
        with (
            patch.object(svc, "get_session", return_value=None),
            patch.object(svc, "ZenodoOAuthSession", FakeSession),
        ):
            out = svc.start_oauth(
                request=MagicMock(headers={}, cookies={}),
                response=response,
                return_to="/annotrieve/usage/",
            )

        assert out["configured"] is True
        assert out["session_id"]
        assert "authorize_url" in out
        response.set_cookie.assert_called_once()
        assert saved["session"].return_to == "/annotrieve/usage/"

    def test_reuses_session_and_clears_tokens(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        monkeypatch.setattr(
            svc.zenodo_client,
            "authorize_url",
            lambda state: f"https://zenodo.org/oauth/authorize?state={state}",
        )
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        monkeypatch.setattr(svc.settings, "ZENODO_COOKIE_SECURE", False)
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_TTL_SECONDS", 3600)

        existing = MagicMock()
        existing.session_id = "existing-sid"
        existing.access_token = "old"
        existing.refresh_token = "old-r"
        existing.expires_at = _aware_utc_naive(hours=1)
        existing.scope = "deposit:write"

        response = MagicMock()
        with patch.object(svc, "get_session", return_value=existing):
            out = svc.start_oauth(
                request=MagicMock(headers={svc.SESSION_HEADER: "existing-sid"}, cookies={}),
                response=response,
                return_to="/annotrieve/new/",
            )

        assert out["session_id"] == "existing-sid"
        assert existing.access_token is None
        assert existing.refresh_token is None
        assert existing.expires_at is None
        assert existing.scope is None
        assert existing.return_to == "/annotrieve/new/"
        existing.save.assert_called()


class TestHandleCallback:
    def test_success(self):
        session = MagicMock()
        session.return_to = "/annotrieve/"
        session.session_id = "sid-1"

        with (
            patch.object(
                svc.ZenodoOAuthSession,
                "objects",
                return_value=MagicMock(first=MagicMock(return_value=session)),
            ),
            patch.object(
                svc.zenodo_client,
                "exchange_authorization_code",
                return_value={
                    "access_token": "a",
                    "refresh_token": "r",
                    "expires_in": 100,
                    "scope": "deposit:write",
                    "token_type": "Bearer",
                },
            ),
        ):
            url, sess = svc.handle_callback(code="c", state="s")

        assert sess is session
        assert "zenodo=connected" in url
        assert session.access_token == "a"
        assert session.refresh_token == "r"
        session.save.assert_called()

    def test_invalid_state(self):
        with patch.object(
            svc.ZenodoOAuthSession,
            "objects",
            return_value=MagicMock(first=MagicMock(return_value=None)),
        ):
            url, sess = svc.handle_callback(code="c", state="bad")
        assert sess is None
        assert "zenodo=error" in url
        assert "invalid_state" in url

    def test_user_denied(self):
        url, sess = svc.handle_callback(
            code=None,
            state=None,
            error="access_denied",
            error_description="User denied",
        )
        assert sess is None
        assert "zenodo=error" in url
        assert "access_denied" in url

    def test_missing_code_or_state(self):
        url, sess = svc.handle_callback(code=None, state="s")
        assert sess is None
        assert "missing_code_or_state" in url

    def test_token_exchange_failed(self):
        session = MagicMock()
        session.return_to = "/annotrieve/"
        with (
            patch.object(
                svc.ZenodoOAuthSession,
                "objects",
                return_value=MagicMock(first=MagicMock(return_value=session)),
            ),
            patch.object(
                svc.zenodo_client,
                "exchange_authorization_code",
                side_effect=ZenodoOAuthError("boom", status_code=400),
            ),
        ):
            url, sess = svc.handle_callback(code="c", state="s")
        assert sess is session
        assert "token_exchange_failed" in url


class TestStatusAndDisconnect:
    def test_status_disconnected(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        request = MagicMock(headers={}, cookies={})
        with patch.object(svc, "get_session", return_value=None):
            out = svc.status_for_request(request)
        assert out == {"connected": False, "configured": True}

    def test_status_connected_does_not_expose_tokens(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        session = MagicMock()
        session.is_connected = True
        session.scope = "deposit:write"
        session.expires_at = datetime(2030, 1, 1, 12, 0, 0)
        session.session_id = "sid"
        session.access_token = "SECRET"
        session.refresh_token = "SECRET-R"
        request = MagicMock(headers={svc.SESSION_HEADER: "sid"}, cookies={})
        with patch.object(svc, "get_session", return_value=session):
            out = svc.status_for_request(request)
        assert out["connected"] is True
        assert out["session_id"] == "sid"
        assert "SECRET" not in str(out)
        assert "access_token" not in out
        assert "refresh_token" not in out
        session.save.assert_called()

    def test_disconnect_deletes_and_clears_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: False)
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        session = MagicMock()
        response = MagicMock()
        request = MagicMock(headers={}, cookies={"sid": "x"})
        with patch.object(svc, "get_session", return_value=session):
            out = svc.disconnect(request, response)
        session.delete.assert_called_once()
        response.delete_cookie.assert_called_once()
        assert out["connected"] is False


class TestFrontendRedirect:
    def test_blocks_open_redirect(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_FRONTEND_RETURN_URL", "/annotrieve/")
        url = svc._frontend_redirect(ok=True, return_to="https://evil.example/phish")
        assert url.startswith("/annotrieve/")
        assert "evil.example" not in url

    def test_relative_without_leading_slash(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_FRONTEND_RETURN_URL", "/annotrieve/")
        url = svc._frontend_redirect(ok=True, return_to="usage/")
        assert url.startswith("/usage/")
        assert "zenodo=connected" in url


class TestGetValidAccessToken:
    def test_not_connected(self):
        session = MagicMock(access_token=None)
        with pytest.raises(HTTPException) as exc:
            svc.get_valid_access_token(session)
        assert exc.value.status_code == 401

    def test_returns_current_when_not_expired(self):
        session = MagicMock()
        session.access_token = "live"
        session.refresh_token = "r"
        session.expires_at = _aware_utc_naive(hours=2)
        with patch.object(svc, "touch_session") as touch:
            token = svc.get_valid_access_token(session)
        assert token == "live"
        touch.assert_called_once_with(session)

    def test_refreshes_when_expired(self):
        session = MagicMock()
        session.access_token = "old"
        session.refresh_token = "ref"
        session.expires_at = _aware_utc_naive(seconds=-5)

        with patch.object(
            svc.zenodo_client,
            "refresh_access_token",
            return_value={
                "access_token": "new",
                "refresh_token": "ref2",
                "expires_in": 3600,
                "token_type": "Bearer",
            },
        ):
            token = svc.get_valid_access_token(session)
        assert token == "new"
        assert session.access_token == "new"

    def test_expired_without_refresh(self):
        session = MagicMock()
        session.access_token = "old"
        session.refresh_token = None
        session.expires_at = _aware_utc_naive(seconds=-5)
        with pytest.raises(HTTPException) as exc:
            svc.get_valid_access_token(session)
        assert exc.value.status_code == 401

    def test_refresh_failure(self):
        session = MagicMock()
        session.access_token = "old"
        session.refresh_token = "ref"
        session.expires_at = _aware_utc_naive(seconds=-5)
        with patch.object(
            svc.zenodo_client,
            "refresh_access_token",
            side_effect=ZenodoOAuthError("nope"),
        ):
            with pytest.raises(HTTPException) as exc:
                svc.get_valid_access_token(session)
        assert exc.value.status_code == 401
