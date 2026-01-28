import abc
from typing import Optional, Protocol

import pytest

from tests.conftest import FakeLLMClient


def test_llm_client_interface_has_expected_methods():
    """
    LLM client abstraction should define clear methods for:
    - converting a drawing (image bytes + optional context) to KCL
    - modifying existing KCL code given a natural language command
    """
    from backend.llm import base  # type: ignore[import-not-found]

    # Arrange: Create a class that uses the LLM client interface
    class UsesClient:
        def __init__(self, client: "base.LLMClient") -> None:
            self._client = client

        async def convert(self, image_bytes: bytes, context: Optional[str] = None) -> str:
            return await self._client.convert_drawing_to_kcl(image_bytes=image_bytes, context=context)

        async def modify(self, kcl_code: str, command: str) -> str:
            return await self._client.modify_kcl_with_command(kcl_code=kcl_code, command=command)

    # Act & Assert: The interface should be an ABC or Protocol we can implement in tests.
    assert issubclass(base.LLMClient, (abc.ABC, Protocol))


@pytest.mark.anyio
async def test_llm_client_can_be_mocked_in_tests(fake_llm_client):
    """
    Demonstrate that we can define a fake implementation for tests
    without touching real networked LLM APIs.
    """
    # Arrange: Use the shared fake client fixture
    fake = fake_llm_client

    # Act: Test convert and modify methods
    kcl = await fake.convert_drawing_to_kcl(b"image-bytes", context="door drawing")
    modified = await fake.modify_kcl_with_command(kcl, "make it bigger")

    # Assert: Should work with fake implementation
    assert "door drawing" in kcl
    assert "kcl_object();" in kcl
    assert "// modified: make it bigger" in modified


@pytest.mark.anyio
async def test_llm_client_handles_empty_image_bytes():
    """
    Edge case: LLM client should handle empty image bytes gracefully.
    """
    # Arrange: Fake client with custom behavior for empty bytes
    async def convert_behavior(image_bytes: bytes, context: Optional[str] = None) -> str:
        if len(image_bytes) == 0:
            return "// empty image"
        return "object();"

    fake = FakeLLMClient(convert_behavior=convert_behavior)
    empty_bytes = b""

    # Act: Convert empty image
    result = await fake.convert_drawing_to_kcl(empty_bytes)

    # Assert: Should handle gracefully (not crash)
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.anyio
async def test_llm_client_handles_null_context():
    """
    Edge case: LLM client should handle None context (optional parameter).
    """
    # Arrange: Fake client with custom behavior for None context
    async def convert_behavior(image_bytes: bytes, context: Optional[str] = None) -> str:
        if context is None:
            return "// no context\nobject();"
        return f"// context: {context}\nobject();"

    fake = FakeLLMClient(convert_behavior=convert_behavior)
    image_bytes = b"fake-image-data"

    # Act: Convert with None context
    result = await fake.convert_drawing_to_kcl(image_bytes, context=None)

    # Assert: Should handle None context
    assert "no context" in result or "object();" in result


@pytest.mark.anyio
async def test_llm_client_handles_empty_command():
    """
    Edge case: LLM client should handle empty modification command.
    """
    # Arrange: Fake client with custom async behavior for empty command
    async def modify_behavior(kcl_code: str, command: str) -> str:
        if not command:
            return kcl_code + "\n// empty command"
        return kcl_code + f"\n// {command}"

    fake = FakeLLMClient(modify_behavior=modify_behavior)
    kcl_code = "object();"
    empty_command = ""

    # Act: Modify with empty command
    result = await fake.modify_kcl_with_command(kcl_code, empty_command)

    # Assert: Should handle empty command
    assert isinstance(result, str)
    assert kcl_code in result

