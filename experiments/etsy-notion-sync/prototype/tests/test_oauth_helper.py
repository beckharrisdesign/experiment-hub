import base64
import hashlib
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest

import oauth_helper
from tests.conftest import FakeResponse, FakeSession


def test_pkce_pair_is_valid_s256():
    verifier, challenge = oauth_helper.make_pkce_pair()
    expected = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    assert challenge == expected
    assert 43 <= len(verifier) <= 128  # RFC 7636 bounds
    assert "=" not in verifier and "=" not in challenge


def test_build_auth_url_carries_pkce_and_state():
    url = oauth_helper.build_auth_url("key123", "http://localhost:8181/callback", "st4te", "ch4llenge")
    parsed = urllib.parse.urlparse(url)
    params = dict(urllib.parse.parse_qsl(parsed.query))
    assert url.startswith(oauth_helper.AUTH_URL)
    assert params == {
        "response_type": "code",
        "client_id": "key123",
        "redirect_uri": "http://localhost:8181/callback",
        "scope": "listings_r",
        "state": "st4te",
        "code_challenge": "ch4llenge",
        "code_challenge_method": "S256",
    }


def test_exchange_code_posts_grant_and_returns_tokens():
    session = FakeSession()
    session.queue(FakeResponse(json_body={
        "access_token": "123.abc", "refresh_token": "123.ref", "expires_in": 3600,
    }))
    tokens = oauth_helper.exchange_code("key123", "authcode", "http://localhost:8181/callback",
                                        "verif", session=session)
    assert tokens["access_token"] == "123.abc"
    request = session.requests[0]
    assert request["url"] == oauth_helper.TOKEN_URL
    assert request["data"] == {
        "grant_type": "authorization_code",
        "client_id": "key123",
        "redirect_uri": "http://localhost:8181/callback",
        "code": "authcode",
        "code_verifier": "verif",
    }


def test_refresh_tokens_posts_refresh_grant():
    session = FakeSession()
    session.queue(FakeResponse(json_body={"access_token": "123.new", "refresh_token": "123.newref"}))
    tokens = oauth_helper.refresh_tokens("key123", "123.oldref", session=session)
    assert tokens["refresh_token"] == "123.newref"
    assert session.requests[0]["data"]["grant_type"] == "refresh_token"
    assert session.requests[0]["data"]["refresh_token"] == "123.oldref"


def test_token_error_raises_oauth_error():
    session = FakeSession()
    session.queue(FakeResponse(status_code=400, text="invalid_grant"))
    with pytest.raises(oauth_helper.OAuthError):
        oauth_helper.refresh_tokens("key123", "expired", session=session)


def test_fetch_shop_id_uses_user_id_from_token():
    session = FakeSession()
    session.queue(FakeResponse(json_body={"count": 1, "results": [{"shop_id": 987}]}))
    shop_id = oauth_helper.fetch_shop_id("key123", "555.secret", session=session)
    assert shop_id == 987
    request = session.requests[0]
    assert "/users/555/shops" in request["url"]
    assert request["headers"]["x-api-key"] == "key123"


def test_fetch_shop_id_handles_single_object_response():
    session = FakeSession()
    session.queue(FakeResponse(json_body={"shop_id": 42, "shop_name": "wildhare"}))
    assert oauth_helper.fetch_shop_id("key123", "1.t", session=session) == 42


def test_update_env_file_replaces_and_appends(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# Etsy creds\nETSY_API_KEY=keep-me\nETSY_OAUTH_TOKEN=old\n\nDRY_RUN=true\n"
    )
    oauth_helper.update_env_file(str(env_file), {
        "ETSY_OAUTH_TOKEN": "new-token",
        "ETSY_REFRESH_TOKEN": "new-refresh",
    })
    content = env_file.read_text()
    assert "ETSY_OAUTH_TOKEN=new-token" in content
    assert "ETSY_REFRESH_TOKEN=new-refresh" in content
    assert "ETSY_API_KEY=keep-me" in content  # untouched keys preserved
    assert "# Etsy creds" in content          # comments preserved
    assert "old" not in content


def test_update_env_file_creates_missing_file(tmp_path):
    env_file = tmp_path / ".env"
    oauth_helper.update_env_file(str(env_file), {"ETSY_SHOP_ID": "987"})
    assert env_file.read_text() == "ETSY_SHOP_ID=987\n"


def test_update_env_file_preserves_inline_comments(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("ETSY_OAUTH_TOKEN=old  # rotated daily\n")
    oauth_helper.update_env_file(str(env_file), {"ETSY_OAUTH_TOKEN": "new"})
    assert env_file.read_text() == "ETSY_OAUTH_TOKEN=new  # rotated daily\n"


def test_refresh_without_new_refresh_token_keeps_existing(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("ETSY_REFRESH_TOKEN=keep-me\n")
    oauth_helper._report({"access_token": "1.abc"}, None, True, str(env_file))
    content = env_file.read_text()
    assert "ETSY_REFRESH_TOKEN=keep-me" in content
    assert "ETSY_OAUTH_TOKEN=1.abc" in content


def test_fetch_shop_id_rejects_malformed_token():
    with pytest.raises(oauth_helper.OAuthError, match="token format"):
        oauth_helper.fetch_shop_id("key123", "no-dot-token", session=FakeSession())
    with pytest.raises(oauth_helper.OAuthError, match="token format"):
        oauth_helper.fetch_shop_id("key123", "notdigits.secret", session=FakeSession())


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _get(url):
    for _ in range(50):  # wait for the server thread to start listening
        try:
            return urllib.request.urlopen(url, timeout=2)
        except urllib.error.HTTPError as error:
            return error  # 404s reach here — still a served response
        except OSError:
            time.sleep(0.05)
    raise AssertionError("Server never came up at {}".format(url))


def test_wait_for_callback_ignores_stray_requests():
    port = _free_port()
    result = {}
    thread = threading.Thread(
        target=lambda: result.update(code=oauth_helper.wait_for_callback(port, "st4te"))
    )
    thread.start()
    try:
        assert _get("http://127.0.0.1:{}/favicon.ico".format(port)).code == 404
        assert _get("http://127.0.0.1:{}/callback".format(port)).code == 404  # no code/error yet
        response = _get("http://127.0.0.1:{}/callback?code=abc&state=st4te".format(port))
        assert response.code == 200
    finally:
        thread.join(timeout=5)
    assert not thread.is_alive()
    assert result["code"] == "abc"
