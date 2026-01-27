import pytest


def test_in_memory_storage_saves_and_returns_versions_in_order():
    """
    Storage layer should allow saving multiple versions of KCL code
    and retrieving them in insertion order.
    """

    from backend.storage import in_memory  # type: ignore[import-not-found]

    store = in_memory.InMemoryKclStorage()

    v1_id = store.save_code("first();")
    v2_id = store.save_code("second();")

    assert v1_id != v2_id

    assert store.get_code(v1_id) == "first();"
    assert store.get_code(v2_id) == "second();"

    all_versions = store.list_versions()
    assert len(all_versions) == 2
    assert all_versions[0].code == "first();"
    assert all_versions[1].code == "second();"


def test_in_memory_storage_returns_none_for_missing_id():
    from backend.storage import in_memory  # type: ignore[import-not-found]

    store = in_memory.InMemoryKclStorage()

    assert store.get_code("does-not-exist") is None

