from pathlib import Path
from typing import Optional

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_with_fake_dependencies(monkeypatch):
    """
    Provide a FastAPI app where the LLM client and storage are replaced
    with in-memory fakes so tests never hit real external services.
    """
    from backend import main  # type: ignore[import-not-found]
    from backend.llm import base as llm_base  # type: ignore[import-not-found]
    from backend.storage import in_memory as storage_mod  # type: ignore[import-not-found]

    class FakeLLM(llm_base.LLMClient):
        async def convert_drawing_to_kcl(self, image_bytes: bytes, context: Optional[str] = None) -> str:
            return "// fake-kcl-from-image\nobject();"

        async def modify_kcl_with_command(self, kcl_code: str, command: str) -> str:
            return kcl_code + f"\n// command: {command}"

    fake_llm = FakeLLM()
    fake_storage = storage_mod.InMemoryKclStorage()

    # Override dependency providers on the app module (simple DI)
    main.get_llm_client = lambda: fake_llm  # type: ignore[assignment]
    main.get_storage = lambda: fake_storage  # type: ignore[assignment]

    return main.app


@pytest.fixture
def client(app_with_fake_dependencies):
    return TestClient(app_with_fake_dependencies)


def test_convert_endpoint_accepts_image_and_returns_kcl(client, tmp_path: Path):
    image_path = tmp_path / "drawing.png"
    image_path.write_bytes(b"fake-png-data")

    with image_path.open("rb") as f:
        files = {"file": ("drawing.png", f, "image/png")}
        data = {"context": "simple drawing"}
        response = client.post("/convert", files=files, data=data)

    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "object();" in body["kcl_code"]
    assert "id" in body  # storage id for the created version
    # preview field should be present (runtime integration point)
    assert "preview" in body


def test_modify_endpoint_uses_llm_and_storage(client):
    # First: simulate a previous version saved in storage via /convert
    # (we rely on FakeLLM + InMemoryKclStorage behavior)
    files = {"file": ("drawing.png", b"fake-png-data", "image/png")}
    convert_resp = client.post("/convert", files=files)
    assert convert_resp.status_code == 200
    initial = convert_resp.json()

    modify_payload = {
        "kcl_code": initial["kcl_code"],
        "command": "add window",
    }
    response = client.patch("/modify", json=modify_payload)

    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "// command: add window" in body["kcl_code"]
    # preview returned for modified code as well
    assert "preview" in body

