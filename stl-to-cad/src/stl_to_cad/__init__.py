"""
STL to CAD - High-precision mesh to parametric CAD converter

This package provides tools for converting STL mesh files to precise
CAD parametric models with feature recognition and surface fitting.
"""

__version__ = "0.1.0"

from .core import STLToCADConverter
from .config import ConversionConfig

__all__ = ["STLToCADConverter", "ConversionConfig", "__version__"]
