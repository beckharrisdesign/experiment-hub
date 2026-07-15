import pytest

import scheduled_run


class FakeTokenStore:
    def __init__(self, tokens):
        self.tokens = tokens
        self.saved = None

    def get_tokens(self):
        return self.tokens

    def set_tokens(self, access_token, refresh_token, expires_in=None, now=None):
        self.saved = {"access_token": access_token, "refresh_token": refresh_token,
                      "expires_in": expires_in}


def test_refresh_rotates_and_persists_tokens():
    backend = FakeTokenStore({"refresh_token": "old-refresh"})
    calls = {}

    def fake_refresh(api_key, refresh_token):
        calls["args"] = (api_key, refresh_token)
        return {"access_token": "new-access", "refresh_token": "new-refresh", "expires_in": 3600}

    access = scheduled_run.refresh_tokens_from_store(backend, "key123", refresh=fake_refresh)
    assert access == "new-access"
    assert calls["args"] == ("key123", "old-refresh")
    assert backend.saved["refresh_token"] == "new-refresh"


def test_refresh_keeps_old_refresh_token_when_response_omits_it():
    backend = FakeTokenStore({"refresh_token": "old-refresh"})
    access = scheduled_run.refresh_tokens_from_store(
        backend, "key123",
        refresh=lambda k, r: {"access_token": "new-access"},
    )
    assert access == "new-access"
    assert backend.saved["refresh_token"] == "old-refresh"


def test_missing_tokens_exits_with_seed_instructions():
    backend = FakeTokenStore(None)
    with pytest.raises(SystemExit, match="oauth_helper.py --to-supabase"):
        scheduled_run.refresh_tokens_from_store(backend, "key123", refresh=lambda k, r: {})
