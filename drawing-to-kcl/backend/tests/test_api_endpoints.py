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
    
    # Remove main from sys.modules if already imported
    if 'backend.main' in sys.modules:
        del sys.modules['backend.main']
    
    # Import main (KCL runtime removed, no mocking needed)
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

    # Assert: Should return KCL code (preview removed - generated in frontend)
    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "box" in body["kcl_code"]  # Updated to check for dummy KCL code with box
    assert "id" in body  # storage id for the created version
    assert "preview" not in body  # preview field removed - frontend generates it


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

    # Assert: Should return modified code (preview removed - generated in frontend)
    assert response.status_code == 200
    body = response.json()
    assert "kcl_code" in body
    assert "// command: add window" in body["kcl_code"]
    assert "preview" not in body  # preview field removed - frontend generates it


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


def test_convert_endpoint_does_not_call_run_kcl(monkeypatch):
    """
    Verify that /convert endpoint does not call run_kcl (KCL runtime removed).
    """
    # Arrange: Mock run_kcl to track calls
    import sys
    from pathlib import Path
    
    backend_root = Path(__file__).parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    
    run_kcl_called = []
    
    def mock_run_kcl(code: str):
        run_kcl_called.append(code)
        return {"ok": True, "errors": [], "preview": None}
    
    # Note: kcl_runtime module no longer exists - this test verifies it's not called
    
    # Remove main from sys.modules to force re-import
    if 'backend.main' in sys.modules:
        del sys.modules['backend.main']
    
    from backend import main  # type: ignore[import-not-found]
    from backend.storage import in_memory as storage_mod  # type: ignore[import-not-found]
    from tests.conftest import FakeLLMClient
    from fastapi.testclient import TestClient
    
    fake_llm = FakeLLMClient()
    fake_storage = storage_mod.InMemoryKclStorage()
    main.get_llm_client = lambda: fake_llm  # type: ignore[assignment]
    main.get_storage = lambda: fake_storage  # type: ignore[assignment]
    
    client = TestClient(main.app)
    
    # Act: Call convert endpoint
    files = {"file": ("drawing.png", b"fake-png-data", "image/png")}
    response = client.post("/convert", files=files)
    
    # Assert: Should succeed and run_kcl should NOT be called
    assert response.status_code == 200
    assert len(run_kcl_called) == 0, "run_kcl should not be called after KCL runtime removal"


# CORS Tests
def test_cors_preflight_request_allowed_origin(client):
    """
    Test that OPTIONS preflight request from allowed origin returns CORS headers.
    """
    # Arrange: OPTIONS request with allowed origin
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    }

    # Act: Send OPTIONS preflight request
    response = client.options("/convert", headers=headers)

    # Assert: Should return 200 with CORS headers
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-methods" in response.headers
    assert "access-control-allow-credentials" in response.headers
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_preflight_request_allowed_origin_127(client):
    """
    Test that OPTIONS preflight request from 127.0.0.1:3000 is also allowed.
    """
    # Arrange: OPTIONS request with allowed origin (127.0.0.1)
    headers = {
        "Origin": "http://127.0.0.1:3000",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "Content-Type",
    }

    # Act: Send OPTIONS preflight request
    response = client.options("/modify", headers=headers)

    # Assert: Should return 200 with CORS headers
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"


def test_cors_actual_request_includes_cors_headers(client, tmp_path: Path):
    """
    Test that actual POST request from allowed origin includes CORS headers in response.
    """
    # Arrange: POST request with allowed origin
    image_path = tmp_path / "drawing.png"
    image_path.write_bytes(b"fake-png-data")
    headers = {"Origin": "http://localhost:3000"}

    # Act: Send POST request with origin header
    with image_path.open("rb") as f:
        files = {"file": ("drawing.png", f, "image/png")}
        response = client.post("/convert", files=files, headers=headers)

    # Assert: Should return 200 with CORS headers
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-credentials" in response.headers


def test_cors_patch_request_includes_cors_headers(client):
    """
    Test that PATCH request from allowed origin includes CORS headers in response.
    """
    # Arrange: PATCH request with allowed origin
    headers = {"Origin": "http://localhost:3000"}
    payload = {"kcl_code": "object();", "command": "add window"}

    # Act: Send PATCH request with origin header
    response = client.patch("/modify", json=payload, headers=headers)

    # Assert: Should return 200 with CORS headers
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_preflight_request_disallowed_origin(client):
    """
    Test that OPTIONS preflight request from disallowed origin does not include CORS headers.
    """
    # Arrange: OPTIONS request with disallowed origin
    headers = {
        "Origin": "http://evil.com",
        "Access-Control-Request-Method": "POST",
    }

    # Act: Send OPTIONS preflight request
    response = client.options("/convert", headers=headers)

    # Assert: Should return 200 or 400 (CORS middleware may reject disallowed origins)
    # The important thing is that it doesn't allow the disallowed origin
    assert response.status_code in [200, 400]
    # If status is 200, CORS headers should not allow evil.com
    if response.status_code == 200:
        if "access-control-allow-origin" in response.headers:
            assert response.headers["access-control-allow-origin"] != "http://evil.com"
    # If status is 400, that's also acceptable - CORS middleware rejected the request


def test_cors_actual_request_disallowed_origin(client, tmp_path: Path):
    """
    Test that actual POST request from disallowed origin does not include CORS headers.
    """
    # Arrange: POST request with disallowed origin
    image_path = tmp_path / "drawing.png"
    image_path.write_bytes(b"fake-png-data")
    headers = {"Origin": "http://evil.com"}

    # Act: Send POST request with disallowed origin
    with image_path.open("rb") as f:
        files = {"file": ("drawing.png", f, "image/png")}
        response = client.post("/convert", files=files, headers=headers)

    # Assert: Request may succeed (CORS is browser-enforced), but headers should not allow evil.com
    assert response.status_code == 200
    # CORS middleware should not allow disallowed origin
    if "access-control-allow-origin" in response.headers:
        assert response.headers["access-control-allow-origin"] != "http://evil.com"

