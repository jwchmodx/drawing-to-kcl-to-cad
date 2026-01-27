from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class KclVersion:
    id: str
    code: str


class InMemoryKclStorage:
    """
    Simple in-memory storage for KCL code versions.

    This is intentionally minimal and non-persistent but provides a clear API
    that can be replaced with a database-backed implementation later.
    """

    def __init__(self) -> None:
        self._versions: Dict[str, str] = {}
        self._order: List[str] = []
        self._counter: int = 0

    def save_code(self, code: str) -> str:
        self._counter += 1
        version_id = str(self._counter)
        self._versions[version_id] = code
        self._order.append(version_id)
        return version_id

    def get_code(self, version_id: str) -> Optional[str]:
        return self._versions.get(version_id)

    def list_versions(self) -> List[KclVersion]:
        return [KclVersion(id=v_id, code=self._versions[v_id]) for v_id in self._order]

