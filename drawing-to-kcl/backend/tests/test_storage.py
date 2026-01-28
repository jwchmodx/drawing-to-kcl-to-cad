import pytest


def test_in_memory_storage_saves_and_returns_versions_in_order():
    """
    Storage layer should allow saving multiple versions of KCL code
    and retrieving them in insertion order.
    """
    from backend.storage import in_memory  # type: ignore[import-not-found]

    # Arrange: Create storage and save two versions
    store = in_memory.InMemoryKclStorage()
    v1_id = store.save_code("first();")
    v2_id = store.save_code("second();")

    # Act: Retrieve versions
    retrieved_v1 = store.get_code(v1_id)
    retrieved_v2 = store.get_code(v2_id)
    all_versions = store.list_versions()

    # Assert: Should save and retrieve in order
    assert v1_id != v2_id
    assert retrieved_v1 == "first();"
    assert retrieved_v2 == "second();"
    assert len(all_versions) == 2
    assert all_versions[0].code == "first();"
    assert all_versions[1].code == "second();"


def test_in_memory_storage_returns_none_for_missing_id():
    from backend.storage import in_memory  # type: ignore[import-not-found]

    # Arrange: Create storage
    store = in_memory.InMemoryKclStorage()

    # Act: Try to retrieve non-existent ID
    result = store.get_code("does-not-exist")

    # Assert: Should return None
    assert result is None


def test_in_memory_storage_handles_very_long_code():
    """
    Edge case: Storage should handle very long KCL code strings.
    """
    from backend.storage import in_memory  # type: ignore[import-not-found]

    # Arrange: Very long code string
    long_code = "object();\n" * 10000  # 100KB+ of code

    store = in_memory.InMemoryKclStorage()

    # Act: Save and retrieve long code
    version_id = store.save_code(long_code)
    retrieved = store.get_code(version_id)

    # Assert: Should store and retrieve correctly
    assert retrieved == long_code
    assert len(retrieved) == len(long_code)


def test_in_memory_storage_handles_empty_code():
    """
    Edge case: Storage should handle empty code strings.
    """
    from backend.storage import in_memory  # type: ignore[import-not-found]

    store = in_memory.InMemoryKclStorage()

    # Arrange: Empty code
    empty_code = ""

    # Act: Save and retrieve empty code
    version_id = store.save_code(empty_code)
    retrieved = store.get_code(version_id)

    # Assert: Should handle empty code
    assert retrieved == ""
    assert len(retrieved) == 0


def test_in_memory_storage_handles_special_characters():
    """
    Edge case: Storage should handle special characters and unicode.
    """
    from backend.storage import in_memory  # type: ignore[import-not-found]

    store = in_memory.InMemoryKclStorage()

    # Arrange: Code with special characters
    special_code = "// 日本語\n// émojis: 🎨\nobject();"

    # Act: Save and retrieve
    version_id = store.save_code(special_code)
    retrieved = store.get_code(version_id)

    # Assert: Should preserve special characters
    assert retrieved == special_code
    assert "日本語" in retrieved
    assert "🎨" in retrieved


def test_in_memory_storage_list_versions_maintains_order():
    """
    Edge case: list_versions should maintain insertion order even with many versions.
    """
    from backend.storage import in_memory  # type: ignore[import-not-found]

    store = in_memory.InMemoryKclStorage()

    # Arrange: Save many versions
    version_ids = []
    for i in range(100):
        version_id = store.save_code(f"code_{i}();")
        version_ids.append(version_id)

    # Act: List all versions
    all_versions = store.list_versions()

    # Assert: Should maintain order
    assert len(all_versions) == 100
    for i, version in enumerate(all_versions):
        assert version.code == f"code_{i}();"
        assert version.id == version_ids[i]

