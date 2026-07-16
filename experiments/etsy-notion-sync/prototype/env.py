"""Dotenv loading shared by the prototype's entry points.

Env-file precedence (python-dotenv never overrides variables that are
already set, so earlier sources win):

  1. real environment variables
  2. the prototype-local env file (`.env` by default)
  3. the repo root `.env.local` — the canonical home for keys shared
     across the hub and its experiments (see /.env.example)

The repo root is found by walking up from this file, so the fallback also
works when scripts run from another working directory. If the prototype is
copied out of the repo (no `.env.local` or `.git` above it), only the local
file loads — it stays runnable standalone. python-dotenv itself is optional:
without it, only real environment variables are used.
"""
from pathlib import Path


def load_env(env_file=".env", start=None):
    """Load the local env file, then the repo root .env.local as fallback."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
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
