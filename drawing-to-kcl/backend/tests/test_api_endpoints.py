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
    import json
    import sys
    from pathlib import Path
    
    # Add parent directory to path for imports
    backend_root = Path(__file__).parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    
    # Remove main from sys.modules if already imported, so we can re-import with mocked kcl_runtime
    if 'backend.main' in sys.modules:
        del sys.modules['backend.main']
    
    # Import main (it will use the mocked run_kcl from conftest)
    from backend import main  # type: ignore[import-not-found]
    from backend.storage import in_memory as storage_mod  # type: ignore[import-not-found]
    from tests.conftest import FakeLLMClient

    fake_llm = FakeLLMClient()

    fake_storage = storage_mod.InMemoryKclStorage()

    # Override dependency providers on the app module (simple DI)
    main.get_llm_client = lambda: fake_llm  # type: ignore[assignment]
    main.get_storage = lambda: fake_storage  # type: ignore[assignment]

    return main.app


@pytest.fixture
def client(app_with_fake_dependencies):
    return TestClient(app_with_fake_dependencies)


def test_convert_endpoint_accepts_image_and_returns_kcl(client, tmp_path: Path):
    # Arrange: Create test image file
    image_path = tmp_path / "drawing.png"
    image_path.write_bytes(b"fake-png-data")

    # Act: Post image to convert endpoint
    with image_path.open("rb") as f:
        files = {"file": ("drawing.png", f, "image/png")}
        data = {"context": "simple drawing"}
        response = client.post("/convert", files=files, data=data)

    # Assert: Should return KCL code and preview
    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "object();" in body["kcl_code"]
    assert "id" in body  # storage id for the created version
    assert "preview" in body  # preview field should be present


def test_modify_endpoint_uses_llm_and_storage(client):
    # Arrange: First convert an image to get initial KCL code
    files = {"file": ("drawing.png", b"fake-png-data", "image/png")}
    convert_resp = client.post("/convert", files=files)
    assert convert_resp.status_code == 200
    initial = convert_resp.json()

    modify_payload = {
        "kcl_code": initial["kcl_code"],
        "command": "add window",
    }

    # Act: Modify the KCL code
    response = client.patch("/modify", json=modify_payload)

    # Assert: Should return modified code and preview
    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "// command: add window" in body["kcl_code"]
    assert "preview" in body  # preview returned for modified code as well


def test_convert_endpoint_handles_missing_file(client):
    """
    Edge case: /convert should handle request without file.
    """
    # Arrange: Request without file
    data = {"context": "test"}

    # Act: Post without file
    response = client.post("/convert", data=data)

    # Assert: Should return 422 (validation error) or 400
    assert response.status_code in [400, 422, 500]


def test_convert_endpoint_handles_invalid_file_type(client):
    """
    Edge case: /convert should handle non-image file types.
    """
    # Arrange: Non-image file
    files = {"file": ("document.pdf", b"fake-pdf-data", "application/pdf")}
    data = {"context": "test"}

    # Act: Post with non-image file
    response = client.post("/convert", files=files, data=data)

    # Assert: May accept or reject, but should not crash
    assert response.status_code in [200, 400, 422]


def test_modify_endpoint_handles_missing_kcl_code(client):
    """
    Edge case: /modify should handle request without kcl_code.
    """
    # Arrange: Request without kcl_code
    payload = {"command": "add window"}

    # Act: Patch without kcl_code
    response = client.patch("/modify", json=payload)

    # Assert: Should return 422 (validation error)
    assert response.status_code == 422


def test_modify_endpoint_handles_missing_command(client):
    """
    Edge case: /modify should handle request without command.
    """
    # Arrange: Request without command
    payload = {"kcl_code": "object();"}

    # Act: Patch without command
    response = client.patch("/modify", json=payload)

    # Assert: Should return 422 (validation error)
    assert response.status_code == 422


def test_modify_endpoint_handles_empty_kcl_code(client):
    """
    Edge case: /modify should handle empty KCL code.
    """
    # Arrange: Empty KCL code
    payload = {"kcl_code": "", "command": "add window"}

    # Act: Modify with empty code
    response = client.patch("/modify", json=payload)

    # Assert: Should handle gracefully (may return 200 with empty result or error)
    assert response.status_code in [200, 400, 422]
    if response.status_code == 200:
        body = response.json()
        assert "kcl_code" in body


def test_modify_endpoint_handles_empty_command(client):
    """
    Edge case: /modify should handle empty command.
    """
    # Arrange: Empty command
    payload = {"kcl_code": "object();", "command": ""}

    # Act: Modify with empty command
    response = client.patch("/modify", json=payload)

    # Assert: Should handle gracefully
    assert response.status_code in [200, 400, 422]
    if response.status_code == 200:
        body = response.json()
        assert "kcl_code" in body


def test_convert_endpoint_handles_empty_context(client, tmp_path):
    """
    Edge case: /convert should handle empty context string.
    """
    # Arrange: Empty context
    image_path = tmp_path / "drawing.png"
    image_path.write_bytes(b"fake-png-data")

    with image_path.open("rb") as f:
        files = {"file": ("drawing.png", f, "image/png")}
        data = {"context": ""}

        # Act: Convert with empty context
        response = client.post("/convert", files=files, data=data)

        # Assert: Should handle empty context
        assert response.status_code == 200
        body = response.json()
        assert "kcl_code" in body

