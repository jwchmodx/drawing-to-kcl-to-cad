from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Support running from both backend/ directory and project root
# If running from backend/ directory, add parent directory to path
_current_file = Path(__file__).resolve()
_current_dir = _current_file.parent
_parent_dir = _current_dir.parent

# Check if we're running from backend/ directory (current dir name is 'backend')
if _current_dir.name == 'backend' and str(_parent_dir) not in sys.path:
    sys.path.insert(0, str(_parent_dir))

from backend.llm import LLMClient
from backend.storage import InMemoryKclStorage
# KCL runtime removed - preview is now generated in frontend using WASM


app = FastAPI(title="Drawing to KCL Backend")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_storage_singleton: InMemoryKclStorage | None = None


def get_storage() -> InMemoryKclStorage:
    """
    Provide a storage instance.

    Tests can monkeypatch this function on the module to inject a fake or
    isolated storage instance.
    """
    global _storage_singleton
    if _storage_singleton is None:
        _storage_singleton = InMemoryKclStorage()
    return _storage_singleton


class DummyLLMClient(LLMClient):
    """
    Very small default implementation used only for local development.

    In production this should be replaced with a real Anthropic Claude
    client that satisfies the same interface.
    """

    async def convert_drawing_to_kcl(self, image_bytes: bytes, context: Optional[str] = None) -> str:
        # Use KCL-compatible comment prefix and simple, valid KCL code.
        # The goal is to return syntactically valid KCL so that the WASM
        # engine can parse it without errors, even if the geometry is trivial.
        comment = f"# context: {context}\n" if context else ""
        dummy_kcl = """# Generated dummy KCL code
a = 1
b = 2
result = a + b
result
# geom: let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);"""
        return comment + dummy_kcl

    async def modify_kcl_with_command(self, kcl_code: str, command: str) -> str:
        return kcl_code + f"\n// command: {command}"


_llm_singleton: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """
    Provide the LLM client.

    Tests override this function to inject a fake client that does not
    perform real network calls.
    """
    global _llm_singleton
    if _llm_singleton is None:
        _llm_singleton = DummyLLMClient()
    return _llm_singleton


class ConvertResponse(BaseModel):
    id: str
    kcl_code: str
    # preview field removed - generated in frontend using WASM


class ModifyRequest(BaseModel):
    kcl_code: str
    command: str


class ModifyResponse(BaseModel):
    kcl_code: str
    # preview field removed - generated in frontend using WASM


@app.post("/convert", response_model=ConvertResponse)
async def convert(
    file: UploadFile = File(...),
    context: Annotated[str | None, Form()] = None,
    llm: LLMClient = Depends(get_llm_client),
    storage: InMemoryKclStorage = Depends(get_storage),
) -> ConvertResponse:
    """
    Accept an uploaded drawing image and optional text context, ask the LLM
    to produce KCL code, store it, and return the stored version id and code.
    """
    image_bytes = await file.read()
    kcl_code = await llm.convert_drawing_to_kcl(image_bytes=image_bytes, context=context)
    # Preview is now generated in the frontend using WASM engine
    version_id = storage.save_code(kcl_code)
    return ConvertResponse(id=version_id, kcl_code=kcl_code)


@app.patch("/modify", response_model=ModifyResponse)
async def modify(
    payload: ModifyRequest,
    llm: LLMClient = Depends(get_llm_client),
    storage: InMemoryKclStorage = Depends(get_storage),
) -> ModifyResponse:
    """
    Modify existing KCL code according to a natural language command.
    """
    modified = await llm.modify_kcl_with_command(kcl_code=payload.kcl_code, command=payload.command)
    # Preview is now generated in the frontend using WASM engine
    # We store the new version but ignore its id for the API response for now.
    storage.save_code(modified)
    return ModifyResponse(kcl_code=modified)

