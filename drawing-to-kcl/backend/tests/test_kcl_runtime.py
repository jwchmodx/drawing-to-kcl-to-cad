from __future__ import annotations

import json
from typing import Any

import pytest


@pytest.fixture
def mock_subprocess_run(monkeypatch):
    """
    Patch subprocess.run used by the KCL runtime runner so we can simulate
    the external `kcl-run` CLI without actually invoking any Rust binary.
    """
    import subprocess

    calls: list[dict[str, Any]] = []

    class DummyCompletedProcess:
        def __init__(self, stdout: str = "", stderr: str = "", returncode: int = 0) -> None:
            self.stdout = stdout
            self.stderr = stderr
            self.returncode = returncode

    def fake_run(cmd: list[str], input: bytes | None = None, *args, **kwargs):
        calls.append({"cmd": cmd, "input": input})
        # The concrete stdout/returncode will be set per-test by monkeypatching
        return DummyCompletedProcess()

    monkeypatch.setattr(subprocess, "run", fake_run)

    return calls


def test_run_kcl_success(monkeypatch, mock_subprocess_run):
    from backend.kcl_runtime import runner

    # Prepare a fake successful JSON response from the CLI.
    fake_output = {
        "ok": True,
        "errors": [],
        "preview": {
            "artifacts": ["solid:box1", "sketch:sketch1"],
            "bbox": [0.0, 0.0, 0.0, 10.0, 20.0, 5.0],
        },
    }

    # Override the internal _run_cli helper to return our fake JSON without
    # needing to depend on the behavior of subprocess.run itself here.
    async def fake_run_cli(_code: str) -> str:
        return json.dumps(fake_output)

    monkeypatch.setattr(runner, "_run_cli", fake_run_cli)

    result = runner.run_kcl("object();")

    assert result.ok is True
    assert result.errors == []
    assert result.preview is not None
    assert result.preview.artifacts == ["solid:box1", "sketch:sketch1"]
    assert result.preview.bbox == (0.0, 0.0, 0.0, 10.0, 20.0, 5.0)


def test_run_kcl_error(monkeypatch):
    from backend.kcl_runtime import runner

    fake_output = {
        "ok": False,
        "errors": ["Parse error at line 3"],
        "preview": None,
    }

    async def fake_run_cli(_code: str) -> str:
        return json.dumps(fake_output)

    monkeypatch.setattr(runner, "_run_cli", fake_run_cli)

    result = runner.run_kcl("this is not valid kcl")

    assert result.ok is False
    assert result.errors == ["Parse error at line 3"]
    assert result.preview is None

