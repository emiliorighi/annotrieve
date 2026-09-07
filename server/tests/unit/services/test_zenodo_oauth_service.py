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


def _request(**kwargs):
    request = MagicMock()
    request.headers = kwargs.pop("headers", {})
    request.cookies = kwargs.pop("cookies", {})
    request.client = MagicMock()
    request.client.host = kwargs.pop("host", "203.0.113.10")
    return request


class TestClientIp:
    def test_leftmost_forwarded(self):
        request = _request(headers={"x-forwarded-for": "1.2.3.4, 10.0.0.1"})
        assert svc.client_ip_from_request(request) == "1.2.3.4"

    def test_falls_back_to_client_host(self):
        request = _request(headers={}, host="198.51.100.9")
        assert svc.client_ip_from_request(request) == "198.51.100.9"


class TestRateLimit:
    def test_allows_under_limit(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_OAUTH_HOURLY_LIMIT", 5)
        qs = MagicMock()
        qs.count.return_value = 2
        saved = MagicMock()
        with (
            patch.object(svc.ZenodoOAuthRateLimit, "objects", return_value=qs),
            patch.object(svc, "ZenodoOAuthRateLimit", return_value=saved) as ctor,
        ):
            # objects is looked up on the class in enforce_oauth_rate_limit before
            # the patched constructor; re-attach objects for count path.
            svc.ZenodoOAuthRateLimit.objects = MagicMock(return_value=qs)
            svc.enforce_oauth_rate_limit("1.1.1.1", "start")
        ctor.assert_called_once()
        saved.save.assert_called_once()

    def test_blocks_when_exhausted(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_OAUTH_HOURLY_LIMIT", 3)
        qs = MagicMock()
        qs.count.return_value = 3
        with patch.object(svc.ZenodoOAuthRateLimit, "objects", return_value=qs):
            with pytest.raises(HTTPException) as exc:
                svc.enforce_oauth_rate_limit("9.9.9.9", "start")
        assert exc.value.status_code == 429
        assert exc.value.detail["remaining"] == 0


class TestResolveSessionId:
    def test_prefers_header_over_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        request = _request(
            headers={svc.SESSION_HEADER: " from-header "},
            cookies={"sid": "from-cookie"},
        )
        assert svc.resolve_session_id(request) == "from-header"

    def test_falls_back_to_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        request = _request(headers={}, cookies={"sid": "cookie-id"})
        assert svc.resolve_session_id(request) == "cookie-id"

    def test_missing(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        assert svc.resolve_session_id(_request()) is None


class TestStartOAuth:
    def test_requires_config(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: False)
        with pytest.raises(HTTPException) as exc:
            svc.start_oauth(request=_request(), response=MagicMock())
        assert exc.value.status_code == 503

    def test_creates_fresh_session_and_deletes_prior(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        monkeypatch.setattr(
            svc.zenodo_client,
            "authorize_url",
            lambda state: f"https://zenodo.org/oauth/authorize?state={state}",
        )
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        monkeypatch.setattr(svc.settings, "ZENODO_COOKIE_SECURE", False)
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_TTL_SECONDS", 3600)

        prior = MagicMock()
        saved = {}

        class FakeSession:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)

            def save(self):
                saved["session"] = self

        response = MagicMock()
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(svc, "get_session", return_value=prior),
            patch.object(svc, "ZenodoOAuthSession", FakeSession),
        ):
            out = svc.start_oauth(
                request=_request(cookies={"sid": "old"}),
                response=response,
                return_to="/annotrieve/usage/",
            )

        prior.delete.assert_called_once()
        assert out["session_id"]
        assert out["session_id"] != "old"
        response.set_cookie.assert_called_once()
        assert saved["session"].return_to == "/annotrieve/usage/"


class TestHandleCallback:
    def test_success_binds_session_and_rotates_id(self):
        session = MagicMock()
        session.return_to = "/annotrieve/"
        session.session_id = "sid-1"
        original_sid = session.session_id

        request = _request(cookies={"annotrieve_zenodo_sid": "sid-1"})
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(svc.settings, "ZENODO_SESSION_COOKIE", "annotrieve_zenodo_sid"),
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
            url, sess = svc.handle_callback(request=request, code="c", state="s")

        assert sess is session
        assert "zenodo=connected" in url
        assert session.access_token == "a"
        assert session.session_id != original_sid
        session.save.assert_called()

    def test_session_mismatch_rejects_without_exchange(self):
        session = MagicMock()
        session.session_id = "owner-sid"
        session.return_to = "/annotrieve/"
        request = _request(cookies={"annotrieve_zenodo_sid": "other-sid"})
        exchange = MagicMock()
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(svc.settings, "ZENODO_SESSION_COOKIE", "annotrieve_zenodo_sid"),
            patch.object(
                svc.ZenodoOAuthSession,
                "objects",
                return_value=MagicMock(first=MagicMock(return_value=session)),
            ),
            patch.object(svc.zenodo_client, "exchange_authorization_code", exchange),
        ):
            url, sess = svc.handle_callback(request=request, code="c", state="s")
        assert sess is None
        assert "session_mismatch" in url
        exchange.assert_not_called()

    def test_missing_browser_session_rejects(self):
        session = MagicMock()
        session.session_id = "owner-sid"
        session.return_to = "/annotrieve/"
        request = _request(cookies={})
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(svc.settings, "ZENODO_SESSION_COOKIE", "annotrieve_zenodo_sid"),
            patch.object(
                svc.ZenodoOAuthSession,
                "objects",
                return_value=MagicMock(first=MagicMock(return_value=session)),
            ),
            patch.object(svc.zenodo_client, "exchange_authorization_code") as exchange,
        ):
            url, sess = svc.handle_callback(request=request, code="c", state="s")
        assert sess is None
        assert "session_mismatch" in url
        exchange.assert_not_called()

    def test_invalid_state(self):
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(
                svc.ZenodoOAuthSession,
                "objects",
                return_value=MagicMock(first=MagicMock(return_value=None)),
            ),
        ):
            url, sess = svc.handle_callback(request=_request(), code="c", state="bad")
        assert sess is None
        assert "invalid_state" in url

    def test_user_denied(self):
        with patch.object(svc, "enforce_oauth_rate_limit"):
            url, sess = svc.handle_callback(
                request=_request(),
                code=None,
                state=None,
                error="access_denied",
                error_description="User denied",
            )
        assert sess is None
        assert "access_denied" in url

    def test_token_exchange_failed(self):
        session = MagicMock()
        session.return_to = "/annotrieve/"
        session.session_id = "sid-1"
        request = _request(cookies={"annotrieve_zenodo_sid": "sid-1"})
        with (
            patch.object(svc, "enforce_oauth_rate_limit"),
            patch.object(svc.settings, "ZENODO_SESSION_COOKIE", "annotrieve_zenodo_sid"),
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
            url, sess = svc.handle_callback(request=request, code="c", state="s")
        assert sess is session
        assert "token_exchange_failed" in url


class TestStatusAndDisconnect:
    def test_status_disconnected(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: True)
        with patch.object(svc, "get_session", return_value=None):
            out = svc.status_for_request(_request())
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
        with patch.object(svc, "get_session", return_value=session):
            out = svc.status_for_request(_request(headers={svc.SESSION_HEADER: "sid"}))
        assert out["connected"] is True
        assert "SECRET" not in str(out)
        assert "access_token" not in out

    def test_disconnect_deletes_and_clears_cookie(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: False)
        monkeypatch.setattr(svc.settings, "ZENODO_SESSION_COOKIE", "sid")
        session = MagicMock()
        response = MagicMock()
        with patch.object(svc, "get_session", return_value=session):
            out = svc.disconnect(_request(cookies={"sid": "x"}), response)
        session.delete.assert_called_once()
        response.delete_cookie.assert_called_once()
        assert out["connected"] is False


class TestFrontendRedirect:
    def test_blocks_open_redirect(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_FRONTEND_RETURN_URL", "/annotrieve/")
        url = svc._frontend_redirect(ok=True, return_to="https://evil.example/phish")
        assert url.startswith("/annotrieve/")
        assert "evil.example" not in url


class TestGetValidAccessToken:
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
            assert svc.get_valid_access_token(session) == "new"
