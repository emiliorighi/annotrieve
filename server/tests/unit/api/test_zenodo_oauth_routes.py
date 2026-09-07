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

    def test_start_ok(self, client, monkeypatch):
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
            patch(
                "services.zenodo_oauth_service.get_session",
                return_value=None,
            ),
            patch(
                "services.zenodo_oauth_service.ZenodoOAuthSession",
                return_value=fake,
            ),
        ):
            # ZenodoOAuthSession(...) constructs; make constructor return fake
            with patch(
                "services.zenodo_oauth_service.ZenodoOAuthSession",
                side_effect=lambda **kw: fake,
            ):
                resp = client.get("/zenodo/oauth/start?return_to=/annotrieve/")

        assert resp.status_code == 200
        body = resp.json()
        assert "authorize_url" in body
        assert body["session_id"] == "sess-abc"
        assert "annotrieve_zenodo_sid" in resp.cookies or any(
            "zenodo" in k for k in resp.cookies.keys()
        )

    def test_status_disconnected(self, client, monkeypatch):
        monkeypatch.setattr(
            "services.zenodo_oauth_service.zenodo_client.is_configured",
            lambda: False,
        )
        with patch(
            "services.zenodo_oauth_service.get_session",
            return_value=None,
        ):
            resp = client.get("/zenodo/oauth/status")
        assert resp.status_code == 200
        assert resp.json()["connected"] is False

    def test_callback_redirect(self, client, monkeypatch):
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

    def test_disconnect(self, client):
        with patch(
            "services.zenodo_oauth_service.disconnect",
            return_value={"connected": False, "configured": False},
        ) as disconnect:
            resp = client.post("/zenodo/oauth/disconnect")
        assert resp.status_code == 200
        assert resp.json()["connected"] is False
        disconnect.assert_called_once()
