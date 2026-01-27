from __future__ import annotations

import abc
from typing import Optional


class LLMClient(abc.ABC):
    """
    Abstraction over a multimodal LLM capable of:

    - Converting a drawing (image bytes + optional text context) into KCL code
    - Modifying existing KCL code given a natural language command

    Concrete implementations (e.g. Anthropic Claude) live behind this interface
    so they can be easily mocked or swapped in tests.
    """

    @abc.abstractmethod
    async def convert_drawing_to_kcl(
        self,
        image_bytes: bytes,
        context: Optional[str] = None,
    ) -> str:
        """
        Convert an input drawing to KCL code.
        """

    @abc.abstractmethod
    async def modify_kcl_with_command(
        self,
        kcl_code: str,
        command: str,
    ) -> str:
        """
        Modify existing KCL code according to a natural language command.
        """

