from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, UploadFile
from pydantic import BaseModel

from backend.llm.base import LLMClient
from backend.storage.in_memory import InMemoryKclStorage


app = FastAPI(title="Drawing to KCL Backend")


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

    async def convert_drawing_to_kcl(self, image_bytes: bytes, context: str | None = None) -> str:
        comment = f"// context: {context}\n" if context else ""
        return comment + "object();"

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


class ModifyRequest(BaseModel):
    kcl_code: str
    command: str


class ModifyResponse(BaseModel):
    kcl_code: str


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
    # We store the new version but ignore its id for the API response for now.
    storage.save_code(modified)
    return ModifyResponse(kcl_code=modified)

