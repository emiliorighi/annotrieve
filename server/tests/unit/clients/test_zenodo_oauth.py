from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from clients import zenodo_oauth as client
from services import zenodo_oauth_service as svc

pytestmark = pytest.mark.unit


class TestZenodoOAuthClient:
    def test_is_configured(self, monkeypatch):
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_ID", "")
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_SECRET", "")
        monkeypatch.setattr(client.settings, "ZENODO_REDIRECT_URI", "")
        assert client.is_configured() is False

        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_ID", "id")
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_SECRET", "secret")
        monkeypatch.setattr(client.settings, "ZENODO_REDIRECT_URI", "https://x/cb")
        assert client.is_configured() is True

    def test_authorize_url(self, monkeypatch):
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_ID", "cid")
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_SECRET", "sec")
        monkeypatch.setattr(client.settings, "ZENODO_REDIRECT_URI", "https://app/cb")
        monkeypatch.setattr(client.settings, "ZENODO_BASE_URL", "https://sandbox.zenodo.org")
        monkeypatch.setattr(client.settings, "ZENODO_OAUTH_SCOPES", "deposit:write")
        url = client.authorize_url(state="abc")
        assert url.startswith("https://sandbox.zenodo.org/oauth/authorize?")
        assert "client_id=cid" in url
        assert "state=abc" in url
        assert "response_type=code" in url

    def test_exchange_authorization_code(self, monkeypatch):
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_ID", "cid")
        monkeypatch.setattr(client.settings, "ZENODO_CLIENT_SECRET", "sec")
        monkeypatch.setattr(client.settings, "ZENODO_REDIRECT_URI", "https://app/cb")
        monkeypatch.setattr(client.settings, "ZENODO_BASE_URL", "https://zenodo.org")

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "access_token": "atok",
            "refresh_token": "rtok",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "deposit:write",
        }
        with patch.object(client.requests, "post", return_value=mock_resp) as post:
            payload = client.exchange_authorization_code("the-code")
        assert payload["access_token"] == "atok"
        post.assert_called_once()
        kwargs = post.call_args.kwargs
        assert kwargs["data"]["grant_type"] == "authorization_code"
        assert kwargs["data"]["code"] == "the-code"


class TestZenodoOAuthService:
    def test_start_oauth_requires_config(self, monkeypatch):
        monkeypatch.setattr(svc.zenodo_client, "is_configured", lambda: False)
        request = MagicMock()
        request.headers = {}
        request.cookies = {}
        response = MagicMock()
        with pytest.raises(HTTPException) as exc:
            svc.start_oauth(request=request, response=response)
        assert exc.value.status_code == 503

    def test_start_oauth_creates_session(self, monkeypatch):
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

        request = MagicMock()
        request.headers = {}
        request.cookies = {}
        response = MagicMock()

        with (
            patch.object(svc, "get_session", return_value=None),
            patch.object(svc, "ZenodoOAuthSession", FakeSession),
        ):
            out = svc.start_oauth(
                request=request, response=response, return_to="/annotrieve/usage/"
            )

        assert "authorize_url" in out
        assert out["session_id"]
        response.set_cookie.assert_called_once()
        assert saved["session"].return_to == "/annotrieve/usage/"

    def test_handle_callback_success(self, monkeypatch):
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
        session.save.assert_called()

    def test_handle_callback_invalid_state(self):
        with patch.object(
            svc.ZenodoOAuthSession,
            "objects",
            return_value=MagicMock(first=MagicMock(return_value=None)),
        ):
            url, sess = svc.handle_callback(code="c", state="bad")
        assert sess is None
        assert "zenodo=error" in url
        assert "invalid_state" in url

    def test_frontend_redirect_blocks_open_redirect(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ZENODO_FRONTEND_RETURN_URL", "/annotrieve/")
        url = svc._frontend_redirect(
            ok=True, return_to="https://evil.example/phish"
        )
        assert url.startswith("/annotrieve/")
        assert "evil.example" not in url

    def test_get_valid_access_token_refreshes(self, monkeypatch):
        session = MagicMock()
        session.access_token = "old"
        session.refresh_token = "ref"
        session.expires_at = datetime.utcnow() - timedelta(seconds=5)

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
