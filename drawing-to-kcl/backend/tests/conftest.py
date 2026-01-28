"""
Shared test fixtures and helpers for backend tests.
"""
import sys
from pathlib import Path
from typing import Optional

import pytest

# Add backend root to path for imports
backend_root = Path(__file__).parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from backend.llm import base  # type: ignore[import-not-found]

# KCL runtime has been removed - preview is now generated in frontend using WASM


class FakeLLMClient(base.LLMClient):
    """
    Reusable fake LLM client for testing.

    Provides simple implementations that can be customized per test.
    """

    def __init__(
        self,
        convert_behavior: Optional[callable] = None,
        modify_behavior: Optional[callable] = None,
    ):
        """
        Initialize fake client with optional custom behaviors.

        Args:
            convert_behavior: Custom function for convert_drawing_to_kcl
            modify_behavior: Custom function for modify_kcl_with_command
        """
        self._convert_behavior = convert_behavior
        self._modify_behavior = modify_behavior

    async def convert_drawing_to_kcl(self, image_bytes: bytes, context: Optional[str] = None) -> str:
        if self._convert_behavior:
            return await self._convert_behavior(image_bytes, context)
        # Default behavior
        prefix = f"# context: {context}\n" if context else ""
        return prefix + "kcl_object();"

    async def modify_kcl_with_command(self, kcl_code: str, command: str) -> str:
        if self._modify_behavior:
            # Handle both async and sync behaviors
            result = self._modify_behavior(kcl_code, command)
            if hasattr(result, '__await__'):
                return await result
            return result
        # Default behavior
        return kcl_code + f"\n// modified: {command}"


@pytest.fixture
def fake_llm_client():
    """
    Provide a default fake LLM client for tests.
    """
    return FakeLLMClient()
