"""Tests for env.py — local .env first, repo root .env.local as fallback."""
import os

import pytest

import env


@pytest.fixture
def fake_repo(tmp_path):
    """A fake repo: root with .git + .env.local, prototype dir with .env."""
    (tmp_path / ".git").mkdir()
    (tmp_path / ".env.local").write_text("SHARED_KEY=from-root\nROOT_ONLY_KEY=from-root\n")
    prototype = tmp_path / "experiments" / "demo" / "prototype"
    prototype.mkdir(parents=True)
    (prototype / ".env").write_text("SHARED_KEY=from-local\nLOCAL_ONLY_KEY=from-local\n")
    return prototype


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in ("SHARED_KEY", "ROOT_ONLY_KEY", "LOCAL_ONLY_KEY"):
        monkeypatch.delenv(key, raising=False)


def test_find_repo_root_env_walks_up_to_env_local(fake_repo):
    found = env.find_repo_root_env(start=fake_repo / "env.py")
    assert found == fake_repo.parents[2] / ".env.local"


def test_find_repo_root_env_stops_at_git_root_without_env_local(tmp_path):
    (tmp_path / ".git").mkdir()
    prototype = tmp_path / "experiments" / "demo" / "prototype"
    prototype.mkdir(parents=True)
    assert env.find_repo_root_env(start=prototype / "env.py") is None


def test_local_env_wins_but_root_fills_gaps(fake_repo, monkeypatch):
    monkeypatch.chdir(fake_repo)
    env.load_env(start=fake_repo / "env.py")
    assert os.environ["SHARED_KEY"] == "from-local"
    assert os.environ["LOCAL_ONLY_KEY"] == "from-local"
    assert os.environ["ROOT_ONLY_KEY"] == "from-root"


def test_local_env_loads_from_any_working_directory(fake_repo, monkeypatch):
    repo_root = fake_repo.parents[2]
    monkeypatch.chdir(repo_root)
    env.load_env(start=fake_repo / "env.py")
    assert os.environ["SHARED_KEY"] == "from-local"
    assert os.environ["LOCAL_ONLY_KEY"] == "from-local"
    assert os.environ["ROOT_ONLY_KEY"] == "from-root"


def test_real_environment_beats_both_files(fake_repo, monkeypatch):
    monkeypatch.chdir(fake_repo)
    monkeypatch.setenv("SHARED_KEY", "from-real-env")
    env.load_env(start=fake_repo / "env.py")
    assert os.environ["SHARED_KEY"] == "from-real-env"


def test_root_fallback_applies_without_local_env(fake_repo, monkeypatch):
    (fake_repo / ".env").unlink()
    monkeypatch.chdir(fake_repo)
    env.load_env(start=fake_repo / "env.py")
    assert os.environ["SHARED_KEY"] == "from-root"


def test_standalone_outside_any_repo(tmp_path, monkeypatch):
    (tmp_path / ".env").write_text("LOCAL_ONLY_KEY=standalone\n")
    monkeypatch.chdir(tmp_path)
    env.load_env(start=tmp_path / "env.py")
    assert os.environ["LOCAL_ONLY_KEY"] == "standalone"
    assert "ROOT_ONLY_KEY" not in os.environ


def test_explicit_env_file_argument(fake_repo, monkeypatch):
    custom = fake_repo / "custom.env"
    custom.write_text("LOCAL_ONLY_KEY=from-custom\n")
    monkeypatch.chdir(fake_repo)
    env.load_env(str(custom), start=fake_repo / "env.py")
    assert os.environ["LOCAL_ONLY_KEY"] == "from-custom"
    assert os.environ["ROOT_ONLY_KEY"] == "from-root"
