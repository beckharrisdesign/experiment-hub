"""Dotenv loading shared by the prototype's entry points.

Env-file precedence (python-dotenv never overrides variables that are
already set, so earlier sources win):

  1. real environment variables
  2. the prototype-local env file (`.env` by default)
  3. the repo root `.env.local` — the canonical home for keys shared
     across the hub and its experiments (see /.env.example)

Both files are found relative to this file, not the working directory: the
default local `.env` sits next to env.py, and the repo root is found by
walking up from it — so scripts behave the same run from the prototype dir,
the repo root, or cron. If the prototype is copied out of the repo (no
`.env.local` or `.git` above it), only the local file loads — it stays
runnable standalone. python-dotenv itself is optional: without it, only
real environment variables are used.
"""
from pathlib import Path


def load_env(env_file=None, start=None):
    """Load the local env file, then the repo root .env.local as fallback.

    An explicit env_file (e.g. oauth_helper's --env-file) is used as given,
    relative to the working directory as a CLI argument should be.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    if env_file is None:
        env_file = Path(start or __file__).resolve().parent / ".env"
    load_dotenv(env_file)
    root_env = find_repo_root_env(start)
    if root_env is not None:
        load_dotenv(root_env)


def find_repo_root_env(start=None, name=".env.local"):
    """Walk up from `start` (default: this file) looking for the repo root
    env file; stop at the first `.git` (file or dir — worktrees have a file)
    so the search never wanders above the repository."""
    for parent in Path(start or __file__).resolve().parents:
        candidate = parent / name
        if candidate.is_file():
            return candidate
        if (parent / ".git").exists():
            return None
    return None
