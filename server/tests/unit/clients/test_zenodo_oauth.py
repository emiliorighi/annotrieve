from unittest.mock import MagicMock, patch

import pytest
import requests

from clients import zenodo_oauth as client

pytestmark = pytest.mark.unit


def _configure(monkeypatch, **overrides):
    defaults = {
        "ZENODO_CLIENT_ID": "cid",
        "ZENODO_CLIENT_SECRET": "sec",
        "ZENODO_REDIRECT_URI": "https://app/cb",
        "ZENODO_BASE_URL": "https://zenodo.org",
        "ZENODO_OAUTH_SCOPES": "deposit:write deposit:actions",
    }
    defaults.update(overrides)
    for key, value in defaults.items():
        monkeypatch.setattr(client.settings, key, value)


class TestZenodoOAuthClient:
    def test_is_configured_requires_all_three(self, monkeypatch):
        _configure(monkeypatch, ZENODO_CLIENT_ID="")
        assert client.is_configured() is False
        _configure(monkeypatch, ZENODO_CLIENT_SECRET="")
        assert client.is_configured() is False
        _configure(monkeypatch, ZENODO_REDIRECT_URI="")
        assert client.is_configured() is False
        _configure(monkeypatch)
        assert client.is_configured() is True

    def test_authorize_url(self, monkeypatch):
        _configure(
            monkeypatch,
            ZENODO_BASE_URL="https://sandbox.zenodo.org",
            ZENODO_OAUTH_SCOPES="deposit:write",
        )
        url = client.authorize_url(state="abc")
        assert url.startswith("https://sandbox.zenodo.org/oauth/authorize?")
        assert "client_id=cid" in url
        assert "state=abc" in url
        assert "response_type=code" in url
        assert "redirect_uri=https%3A%2F%2Fapp%2Fcb" in url

    def test_authorize_url_requires_config(self, monkeypatch):
        _configure(monkeypatch, ZENODO_CLIENT_ID="")
        with pytest.raises(client.ZenodoOAuthError, match="not configured"):
            client.authorize_url(state="x")

    def test_exchange_authorization_code(self, monkeypatch):
        _configure(monkeypatch)
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
        assert post.call_args.kwargs["data"]["grant_type"] == "authorization_code"
        assert post.call_args.kwargs["data"]["code"] == "the-code"
        assert post.call_args.kwargs["data"]["client_secret"] == "sec"

    def test_refresh_access_token(self, monkeypatch):
        _configure(monkeypatch)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "access_token": "new-atok",
            "refresh_token": "new-rtok",
            "expires_in": 1800,
            "token_type": "Bearer",
        }
        with patch.object(client.requests, "post", return_value=mock_resp) as post:
            payload = client.refresh_access_token("old-refresh")
        assert payload["access_token"] == "new-atok"
        assert post.call_args.kwargs["data"] == {
            "grant_type": "refresh_token",
            "refresh_token": "old-refresh",
            "client_id": "cid",
            "client_secret": "sec",
        }

    def test_token_http_error(self, monkeypatch):
        _configure(monkeypatch)
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "nope"
        mock_resp.json.return_value = {
            "error": "invalid_grant",
            "error_description": "Code already used",
        }
        with patch.object(client.requests, "post", return_value=mock_resp):
            with pytest.raises(client.ZenodoOAuthError, match="Code already used") as exc:
                client.exchange_authorization_code("used")
        assert exc.value.status_code == 401

    def test_token_missing_access_token(self, monkeypatch):
        _configure(monkeypatch)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"token_type": "Bearer"}
        with patch.object(client.requests, "post", return_value=mock_resp):
            with pytest.raises(client.ZenodoOAuthError, match="missing access_token"):
                client.exchange_authorization_code("c")

    def test_token_network_error(self, monkeypatch):
        _configure(monkeypatch)
        with patch.object(
            client.requests,
            "post",
            side_effect=requests.ConnectionError("down"),
        ):
            with pytest.raises(client.ZenodoOAuthError, match="token request failed"):
                client.refresh_access_token("r")

    def test_exchange_requires_config(self, monkeypatch):
        _configure(monkeypatch, ZENODO_CLIENT_SECRET="")
        with pytest.raises(client.ZenodoOAuthError, match="not configured"):
            client.exchange_authorization_code("c")
