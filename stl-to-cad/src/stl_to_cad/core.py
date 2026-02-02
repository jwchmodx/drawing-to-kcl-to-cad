"""
STL to CAD Core - Main converter class.
"""

from pathlib import Path
from typing import Optional, Union

from .config import ConversionConfig
from .parsers.stl_parser import STLParser, STLMesh


class STLToCADConverter:
    """
    Main converter class for STL to CAD conversion.
    
    Pipeline:
    1. Parse STL mesh
    2. Segment mesh into regions
    3. Recognize primitive features (plane, cylinder, sphere, cone)
    4. Fit parametric surfaces
    5. Build B-rep topology
    6. Export to KCL/STEP
    """
    
    def __init__(self, config: Optional[ConversionConfig] = None):
        self.config = config or ConversionConfig()
        self.parser = STLParser(
            merge_vertices=True,
            merge_tolerance=1e-6
        )
        self.mesh: Optional[STLMesh] = None
    
    def load(self, stl_path: Union[str, Path]) -> "STLToCADConverter":
        """Load and parse STL file."""
        self.mesh = self.parser.parse(stl_path)
        return self
    
    def convert(self) -> str:
        """
        Convert loaded mesh to KCL code.
        
        Returns:
            KCL code string
        """
        if self.mesh is None:
            raise ValueError("No mesh loaded. Call load() first.")
        
        # For now, generate a simple bounding box representation
        min_pt, max_pt = self.mesh.bounds
        size = self.mesh.size
        center = (min_pt + max_pt) / 2
        
        kcl_code = f"""// Generated from STL: {self.mesh.name}
// Vertices: {self.mesh.num_vertices}, Faces: {self.mesh.num_faces}

// Bounding box representation
let {self.mesh.name} = box(
  size: [{size[0]:.4f}, {size[1]:.4f}, {size[2]:.4f}],
  center: [{center[0]:.4f}, {center[1]:.4f}, {center[2]:.4f}]
)
"""
        return kcl_code
    
    def export_kcl(self, output_path: Union[str, Path]) -> None:
        """Export to KCL file."""
        kcl_code = self.convert()
        Path(output_path).write_text(kcl_code)
    
    def get_mesh_info(self) -> dict:
        """Get mesh statistics."""
        if self.mesh is None:
            return {}
        
        min_pt, max_pt = self.mesh.bounds
        return {
            "name": self.mesh.name,
            "num_vertices": self.mesh.num_vertices,
            "num_faces": self.mesh.num_faces,
            "bounds_min": min_pt.tolist(),
            "bounds_max": max_pt.tolist(),
            "size": self.mesh.size.tolist(),
            "center": self.mesh.center.tolist(),
        }
