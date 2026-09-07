from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

pytestmark = pytest.mark.unit


class TestZenodoOAuthRoutes:
    def test_start_unconfigured(self, client, monkeypatch):
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.is_configured",
            lambda: False,
        )
        resp = client.get("/zenodo/oauth/start")
        assert resp.status_code == 503
        assert "not configured" in resp.json()["detail"].lower()

    def test_start_ok_sets_cookie(self, client, monkeypatch):
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.is_configured",
            lambda: True,
        )
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.authorize_url",
            lambda state: f"https://zenodo.org/oauth/authorize?state={state}",
        )

        fake = MagicMock()
        fake.session_id = "sess-abc"
        fake.oauth_state = "state"
        fake.return_to = None
        fake.save = MagicMock()

        with (
            patch("services.zenodo_oauth_service.get_session", return_value=None),
            patch(
                "services.zenodo_oauth_service.ZenodoOAuthSession",
                side_effect=lambda **kw: fake,
            ),
        ):
            resp = client.get("/zenodo/oauth/start?return_to=/annotrieve/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["session_id"] == "sess-abc"
        assert body["authorize_url"].startswith("https://zenodo.org/oauth/authorize?")
        assert "annotrieve_zenodo_sid" in resp.cookies

    def test_status_disconnected(self, client, monkeypatch):
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.is_configured",
            lambda: False,
        )
        with patch("services.zenodo_oauth_service.get_session", return_value=None):
            resp = client.get("/zenodo/oauth/status")
        assert resp.status_code == 200
        assert resp.json() == {"connected": False, "configured": False}

    def test_status_connected_via_header_hides_tokens(self, client, monkeypatch):
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.is_configured",
            lambda: True,
        )
        session = MagicMock()
        session.is_connected = True
        session.scope = "deposit:write deposit:actions"
        session.expires_at = datetime(2030, 6, 1, 0, 0, 0)
        session.session_id = "hdr-sid"
        session.access_token = "must-not-leak"
        session.refresh_token = "must-not-leak-r"
        session.save = MagicMock()

        with patch("services.zenodo_oauth_service.get_session", return_value=session) as get_sess:
            resp = client.get(
                "/zenodo/oauth/status",
                headers={"X-Zenodo-Session": "hdr-sid"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["connected"] is True
        assert body["session_id"] == "hdr-sid"
        assert "must-not-leak" not in resp.text
        assert "access_token" not in body
        get_sess.assert_called()

    def test_callback_redirect_sets_cookie(self, client):
        session = MagicMock()
        session.session_id = "sid"
        session.return_to = "/annotrieve/"
        with patch(
            "services.zenodo_oauth_service.handle_callback",
            return_value=("/annotrieve/?zenodo=connected", session),
        ):
            resp = client.get(
                "/zenodo/oauth/callback?code=x&state=y",
                follow_redirects=False,
            )
        assert resp.status_code == 302
        assert "zenodo=connected" in resp.headers["location"]
        assert "annotrieve_zenodo_sid" in resp.cookies

    def test_callback_error_query(self, client):
        with patch(
            "services.zenodo_oauth_service.handle_callback",
            return_value=("/annotrieve/?zenodo=error&zenodo_error=access_denied", None),
        ):
            resp = client.get(
                "/zenodo/oauth/callback?error=access_denied",
                follow_redirects=False,
            )
        assert resp.status_code == 302
        assert "zenodo=error" in resp.headers["location"]

    def test_disconnect(self, client):
        with patch(
            "services.zenodo_oauth_service.disconnect",
            return_value={"connected": False, "configured": True},
        ) as disconnect:
            resp = client.post("/zenodo/oauth/disconnect")
        assert resp.status_code == 200
        assert resp.json()["connected"] is False
        disconnect.assert_called_once()
