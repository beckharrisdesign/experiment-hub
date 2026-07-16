#!/usr/bin/env python3
"""One-time (and cron-refresh) Etsy OAuth 2.0 helper.

Etsy v3 uses the Authorization Code grant with PKCE. Access tokens expire
after 1 hour; refresh tokens last ~90 days and are rotated on every refresh,
so the scheduled job should run `oauth_helper.py --refresh --write-env`
before capture.py each cycle.

Modes:
  python oauth_helper.py --write-env             # first-time browser flow
  python oauth_helper.py --refresh --write-env   # rotate tokens from ETSY_REFRESH_TOKEN

Prerequisite (Etsy developer portal, once): add the callback URL
http://localhost:8181/callback to the Seller App's Callback URLs.
"""
import argparse
import base64
import hashlib
import http.server
import logging
import os
import re
import secrets
import urllib.parse
import webbrowser

import requests

from env import load_env

AUTH_URL = "https://www.etsy.com/oauth/connect"
TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token"
SHOPS_URL = "https://openapi.etsy.com/v3/application/users/{user_id}/shops"
SCOPE = "listings_r"
DEFAULT_PORT = 8181

log = logging.getLogger("oauth_helper")


class OAuthError(RuntimeError):
    pass


def make_pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def build_auth_url(api_key, redirect_uri, state, challenge, scope=SCOPE):
    params = {
        "response_type": "code",
        "client_id": api_key,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return "{}?{}".format(AUTH_URL, urllib.parse.urlencode(params))


def _post_token(payload, session=None):
    session = session or requests.Session()
    response = session.post(TOKEN_URL, data=payload, timeout=30)
    if response.status_code >= 400:
        raise OAuthError(
            "Token request failed with {}: {}".format(response.status_code, response.text[:500])
        )
    tokens = response.json()
    if "access_token" not in tokens:
        raise OAuthError("Token response had no access_token: {}".format(str(tokens)[:200]))
    return tokens


def exchange_code(api_key, code, redirect_uri, verifier, session=None):
    return _post_token(
        {
            "grant_type": "authorization_code",
            "client_id": api_key,
            "redirect_uri": redirect_uri,
            "code": code,
            "code_verifier": verifier,
        },
        session,
    )


def refresh_tokens(api_key, refresh_token, session=None):
    return _post_token(
        {
            "grant_type": "refresh_token",
            "client_id": api_key,
            "refresh_token": refresh_token,
        },
        session,
    )


def fetch_shop_id(api_key, access_token, session=None):
    """The access token is '<user_id>.<secret>'; look up the shop it owns."""
    session = session or requests.Session()
    user_id = access_token.split(".", 1)[0]
    if "." not in access_token or not user_id.isdigit():
        raise OAuthError(
            "Unexpected access token format — expected '<user_id>.<secret>',"
            " cannot derive the user id for the shop lookup."
        )
    response = session.get(
        SHOPS_URL.format(user_id=user_id),
        headers={"x-api-key": api_key, "Authorization": "Bearer {}".format(access_token)},
        timeout=30,
    )
    if response.status_code >= 400:
        raise OAuthError(
            "Shop lookup failed with {}: {}".format(response.status_code, response.text[:500])
        )
    payload = response.json()
    if "shop_id" in payload:
        return payload["shop_id"]
    results = payload.get("results") or []
    if results and "shop_id" in results[0]:
        return results[0]["shop_id"]
    raise OAuthError("Could not find shop_id in response: {}".format(str(payload)[:200]))


def wait_for_callback(port, expected_state):
    """Serve exactly one localhost callback request; return the auth code."""
    captured = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)
            # Stray hits (e.g. /favicon.ico) must not end the wait — only a
            # real callback carrying a code or error counts.
            if parsed.path != "/callback" or not ("code" in query or "error" in query):
                self.send_response(404)
                self.end_headers()
                return
            captured["code"] = (query.get("code") or [None])[0]
            captured["state"] = (query.get("state") or [None])[0]
            captured["error"] = (query.get("error") or [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Done - you can close this tab and return to the terminal.")

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", port), Handler)
    try:
        while not captured:
            server.handle_request()
    finally:
        server.server_close()

    if captured.get("error"):
        raise OAuthError("Etsy returned an error at the callback: {}".format(captured["error"]))
    if captured.get("state") != expected_state:
        raise OAuthError("State mismatch on callback — possible CSRF; aborting.")
    if not captured.get("code"):
        raise OAuthError("Callback arrived without an authorization code.")
    return captured["code"]


def update_env_file(path, values):
    """Replace or append KEY=value lines in a dotenv file, preserving the rest."""
    lines = []
    if os.path.exists(path):
        with open(path) as handle:
            lines = handle.read().splitlines()
    remaining = dict(values)
    updated = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line and not line.lstrip().startswith("#") else None
        if key in remaining:
            inline_comment = re.search(r"\s+#.*$", line)
            updated.append("{}={}{}".format(
                key, remaining.pop(key), inline_comment.group(0) if inline_comment else ""
            ))
        else:
            updated.append(line)
    for key, value in remaining.items():
        updated.append("{}={}".format(key, value))
    with open(path, "w") as handle:
        handle.write("\n".join(updated) + "\n")


def _require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit("Missing required environment variable: {}".format(name))
    return value


def _seed_supabase(access_token, refresh_token, expires_in):
    from store_supabase import SupabaseStore

    backend = SupabaseStore(_require_env("SUPABASE_URL"), _require_env("SUPABASE_SERVICE_ROLE_KEY"))
    backend.set_tokens(access_token, refresh_token, expires_in=expires_in)
    log.info("Tokens seeded to the Supabase etsy_tokens table.")


def _report(tokens, shop_id, write_env, env_file):
    values = {"ETSY_OAUTH_TOKEN": tokens["access_token"]}
    # A refresh response may omit refresh_token; never blank out the stored one.
    if tokens.get("refresh_token"):
        values["ETSY_REFRESH_TOKEN"] = tokens["refresh_token"]
    if shop_id is not None:
        values["ETSY_SHOP_ID"] = shop_id
    if write_env:
        update_env_file(env_file, values)
        log.info(
            "Wrote %s to %s (access token expires in %ss — refresh tokens rotate, so"
            " keep using --refresh --write-env)",
            ", ".join(sorted(values)), env_file, tokens.get("expires_in", 3600),
        )
    else:
        print("Add these to {} (or rerun with --write-env):".format(env_file))
        for key, value in sorted(values.items()):
            print("{}={}".format(key, value))


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true",
                        help="rotate tokens using ETSY_REFRESH_TOKEN instead of the browser flow")
    parser.add_argument("--write-env", action="store_true",
                        help="write the resulting tokens into the env file in place")
    parser.add_argument("--to-supabase", action="store_true",
                        help="seed the resulting tokens into the Supabase etsy_tokens table"
                             " (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    load_env(args.env_file)

    api_key = _require_env("ETSY_API_KEY")

    if args.refresh:
        refresh_token = _require_env("ETSY_REFRESH_TOKEN")
        tokens = refresh_tokens(api_key, refresh_token)
        _report(tokens, None, args.write_env, args.env_file)
        if args.to_supabase:
            _seed_supabase(tokens["access_token"],
                           tokens.get("refresh_token") or refresh_token,
                           tokens.get("expires_in"))
        return

    # Only the browser flow needs the shared secret: the shop lookup sends
    # "keystring:shared_secret" in x-api-key (Etsy enforcement since
    # 2026-02-09), while token requests use the bare keystring as client_id.
    # Require it before opening the browser so a misconfigured run fails
    # up front rather than after the user has approved.
    x_api_key = "{}:{}".format(api_key, _require_env("ETSY_SHARED_SECRET"))

    redirect_uri = "http://localhost:{}/callback".format(args.port)
    verifier, challenge = make_pkce_pair()
    state = secrets.token_urlsafe(16)
    url = build_auth_url(api_key, redirect_uri, state, challenge)

    print("1. Make sure {} is listed under Callback URLs for your Etsy app.".format(redirect_uri))
    print("2. Approving in the browser window that opens (or paste this URL):\n\n{}\n".format(url))
    webbrowser.open(url)

    code = wait_for_callback(args.port, state)
    tokens = exchange_code(api_key, code, redirect_uri, verifier)
    shop_id = fetch_shop_id(x_api_key, tokens["access_token"])
    log.info("Authorized shop_id=%s with scope %s", shop_id, SCOPE)
    _report(tokens, shop_id, args.write_env, args.env_file)
    if args.to_supabase:
        _seed_supabase(tokens["access_token"], tokens["refresh_token"], tokens.get("expires_in"))


if __name__ == "__main__":
    main()
