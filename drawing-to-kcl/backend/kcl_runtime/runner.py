from __future__ import annotations

import asyncio
import json
import subprocess
from typing import Any, Tuple

from pydantic import BaseModel, Field, ValidationError


class KclPreview(BaseModel):
    """
    Lightweight geometry preview information returned from the KCL runtime.

    This is intentionally small and backend-agnostic: just enough for a
    front-end to show that something was generated and roughly how big it is.
    """

    artifacts: list[str] = Field(
        default_factory=list,
        description="List of artifact identifiers (e.g. solids, sketches).",
    )
    bbox: Tuple[float, float, float, float, float, float] | None = Field(
        default=None,
        description="Axis-aligned bounding box: (xmin, ymin, zmin, xmax, ymax, zmax).",
    )


class KclRunResult(BaseModel):
    """
    Result of running KCL code through the external runtime.

    Mirrors the JSON contract expected from the `kcl-run` CLI.
    """

    ok: bool
    errors: list[str] = Field(default_factory=list)
    preview: KclPreview | None = None


async def _run_cli(code: str) -> str:
    """
    Low-level helper to invoke the external `kcl-run` CLI.

    This function is async so it can be monkeypatched easily in tests and can
    be awaited if we later choose to run it in a thread pool.

    For now it simply shells out synchronously via subprocess.run; higher
    layers (and tests) wrap it through run_kcl().
    """
    # NOTE: This is a placeholder implementation of the protocol defined in
    # the plan. In real usage, 'kcl-run' should exist on PATH or be
    # configured via environment variable.
    completed = subprocess.run(  # noqa: S603,S607
        ["kcl-run"],
        input=code.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if completed.returncode != 0:
        # If the CLI failed at the process level, fabricate a JSON error.
        error_msg = completed.stderr.decode("utf-8") or "kcl-run process failed"
        return json.dumps(
            {
                "ok": False,
                "errors": [error_msg],
                "preview": None,
            }
        )

    return completed.stdout.decode("utf-8")


def run_kcl(code: str) -> KclRunResult:
    """
    Public entrypoint used by the FastAPI layer to run KCL code.

    - Invokes the external CLI (or a test double via `_run_cli` monkeypatch).
    - Parses its JSON output into a validated `KclRunResult`.
    - On any parsing/validation failure, returns a best-effort error result.
    """

    async def _invoke() -> KclRunResult:
        raw = await _run_cli(code)
        try:
            payload: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError:
            return KclRunResult(ok=False, errors=["Invalid JSON from kcl-run"], preview=None)

        try:
            return KclRunResult(**payload)
        except ValidationError as exc:
            return KclRunResult(
                ok=False,
                errors=[f"Invalid schema from kcl-run: {exc}"],
                preview=None,
            )

    return asyncio.run(_invoke())

