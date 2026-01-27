import abc
from typing import Optional, Protocol

import pytest


def test_llm_client_interface_has_expected_methods():
    """
    LLM client abstraction should define clear methods for:
    - converting a drawing (image bytes + optional context) to KCL
    - modifying existing KCL code given a natural language command
    """

    from backend.llm import base  # type: ignore[import-not-found]

    class UsesClient:
        def __init__(self, client: "base.LLMClient") -> None:
            self._client = client

        async def convert(self, image_bytes: bytes, context: Optional[str] = None) -> str:
            return await self._client.convert_drawing_to_kcl(image_bytes=image_bytes, context=context)

        async def modify(self, kcl_code: str, command: str) -> str:
            return await self._client.modify_kcl_with_command(kcl_code=kcl_code, command=command)

    # The interface should be an ABC or Protocol we can implement in tests.
    assert issubclass(base.LLMClient, (abc.ABC, Protocol))


@pytest.mark.anyio
async def test_llm_client_can_be_mocked_in_tests():
    """
    Demonstrate that we can define a fake implementation for tests
    without touching real networked LLM APIs.
    """

    from backend.llm import base  # type: ignore[import-not-found]

    class FakeClient(base.LLMClient):
        async def convert_drawing_to_kcl(self, image_bytes: bytes, context: Optional[str] = None) -> str:
            assert image_bytes  # ensure something was passed
            prefix = f"# context: {context}\n" if context else ""
            return prefix + "kcl_object();"

        async def modify_kcl_with_command(self, kcl_code: str, command: str) -> str:
            # trivial fake behavior: append a comment with the command
            return kcl_code + f"\n// modified: {command}"

    fake = FakeClient()

    kcl = await fake.convert_drawing_to_kcl(b"image-bytes", context="door drawing")
    assert "door drawing" in kcl
    assert "kcl_object();" in kcl

    modified = await fake.modify_kcl_with_command(kcl, "make it bigger")
    assert "// modified: make it bigger" in modified

