"""
Re-export kcl_runtime from parent directory for backend.kcl_runtime import path.
"""
import sys
from pathlib import Path

# Add parent directory to path to import kcl_runtime
backend_root = Path(__file__).parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

# Re-export from actual kcl_runtime
from kcl_runtime import KclPreview, KclRunResult, run_kcl  # noqa: F401
