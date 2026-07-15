"""Store backend selection: sqlite (local default) or supabase (server runs)."""
import os

import store
from store_supabase import SupabaseStore

DEFAULT_DB_PATH = "data/etsy_history.sqlite3"


def _require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit("Missing required environment variable: {}".format(name))
    return value


def make_backend(env=None):
    env = env if env is not None else os.environ
    backend = env.get("STORE_BACKEND", "sqlite").strip().lower()
    if backend == "supabase":
        return SupabaseStore(_require_env("SUPABASE_URL"), _require_env("SUPABASE_SERVICE_ROLE_KEY"))
    if backend == "sqlite":
        db_path = env.get("CAPTURE_DB_PATH", DEFAULT_DB_PATH)
        parent = os.path.dirname(db_path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        return store.SqliteStore(store.connect(db_path))
    raise SystemExit("Unknown STORE_BACKEND {!r} (expected sqlite or supabase)".format(backend))
