"""
STL File Parser - Supports both ASCII and Binary formats.

This module provides high-performance parsing of STL files with
automatic format detection and validation.
"""

import struct
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Optional, Tuple, Union

import numpy as np


@dataclass
class STLMesh:
    """Parsed STL mesh data structure."""
    vertices: np.ndarray  # (N, 3) vertex coordinates
    faces: np.ndarray     # (M, 3) face indices
    normals: np.ndarray   # (M, 3) face normals
    name: str = "mesh"
    
    @property
    def num_vertices(self) -> int:
        return len(self.vertices)
    
    @property
    def num_faces(self) -> int:
        return len(self.faces)
    
    @property
    def bounds(self) -> Tuple[np.ndarray, np.ndarray]:
        """Return (min, max) bounding box."""
        return self.vertices.min(axis=0), self.vertices.max(axis=0)
    
    @property
    def center(self) -> np.ndarray:
        """Return mesh center."""
        min_pt, max_pt = self.bounds
        return (min_pt + max_pt) / 2
    
    @property
    def size(self) -> np.ndarray:
        """Return mesh dimensions."""
        min_pt, max_pt = self.bounds
        return max_pt - min_pt
    
    def compute_vertex_normals(self) -> np.ndarray:
        """Compute per-vertex normals by averaging face normals."""
        vertex_normals = np.zeros_like(self.vertices)
        for i, face in enumerate(self.faces):
            for v_idx in face:
                vertex_normals[v_idx] += self.normals[i]
        
        # Normalize
        norms = np.linalg.norm(vertex_normals, axis=1, keepdims=True)
        norms[norms == 0] = 1  # Avoid division by zero
        vertex_normals /= norms
        return vertex_normals


class STLParser:
    """
    High-performance STL file parser.
    
    Supports:
    - ASCII STL format
    - Binary STL format
    - Automatic format detection
    - Vertex deduplication
    """
    
    def __init__(self, merge_vertices: bool = True, merge_tolerance: float = 1e-6):
        self.merge_vertices = merge_vertices
        self.merge_tolerance = merge_tolerance
    
    def parse(self, file_path: Union[str, Path]) -> STLMesh:
        """
        Parse an STL file (auto-detects format).
        
        Args:
            file_path: Path to the STL file
            
        Returns:
            STLMesh object containing parsed data
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"STL file not found: {file_path}")
        
        with open(file_path, "rb") as f:
            if self._is_ascii(f):
                mesh = self._parse_ascii(f, file_path.stem)
            else:
                mesh = self._parse_binary(f, file_path.stem)
        
        if self.merge_vertices:
            mesh = self._merge_duplicate_vertices(mesh)
        
        return mesh
    
    def _is_ascii(self, f: BinaryIO) -> bool:
        """Detect if file is ASCII format."""
        header = f.read(80)
        f.seek(0)
        
        # Check if header starts with 'solid'
        try:
            header_str = header.decode("ascii").strip().lower()
            if header_str.startswith("solid"):
                # Read more to confirm (binary files might start with 'solid' by chance)
                content = f.read(1000)
                f.seek(0)
                try:
                    content_str = content.decode("ascii").lower()
                    return "facet" in content_str or "vertex" in content_str
                except UnicodeDecodeError:
                    return False
        except UnicodeDecodeError:
            return False
        
        return False
    
    def _parse_ascii(self, f: BinaryIO, name: str) -> STLMesh:
        """Parse ASCII STL format."""
        content = f.read().decode("ascii")
        lines = content.strip().split("\n")
        
        triangles = []
        normals = []
        current_normal = None
        current_vertices = []
        
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue
            
            keyword = parts[0].lower()
            
            if keyword == "facet" and len(parts) >= 5 and parts[1].lower() == "normal":
                current_normal = [float(parts[2]), float(parts[3]), float(parts[4])]
            
            elif keyword == "vertex" and len(parts) >= 4:
                vertex = [float(parts[1]), float(parts[2]), float(parts[3])]
                current_vertices.append(vertex)
            
            elif keyword == "endfacet":
                if len(current_vertices) == 3 and current_normal is not None:
                    triangles.append(current_vertices)
                    normals.append(current_normal)
                current_vertices = []
                current_normal = None
            
            elif keyword == "solid" and len(parts) > 1:
                name = " ".join(parts[1:])
        
        triangles = np.array(triangles, dtype=np.float64)
        normals = np.array(normals, dtype=np.float64)
        
        # Flatten vertices and create face indices
        num_triangles = len(triangles)
        vertices = triangles.reshape(-1, 3)
        faces = np.arange(num_triangles * 3).reshape(-1, 3)
        
        return STLMesh(
            vertices=vertices,
            faces=faces,
            normals=normals,
            name=name
        )
    
    def _parse_binary(self, f: BinaryIO, name: str) -> STLMesh:
        """Parse binary STL format."""
        # Skip 80-byte header
        header = f.read(80)
        
        # Try to extract name from header
        try:
            header_str = header.rstrip(b"\x00").decode("ascii", errors="ignore").strip()
            if header_str:
                name = header_str
        except:
            pass
        
        # Read number of triangles
        num_triangles = struct.unpack("<I", f.read(4))[0]
        
        # Pre-allocate arrays
        vertices = np.zeros((num_triangles * 3, 3), dtype=np.float64)
        normals = np.zeros((num_triangles, 3), dtype=np.float64)
        faces = np.arange(num_triangles * 3, dtype=np.int64).reshape(-1, 3)
        
        # Read triangles
        for i in range(num_triangles):
            # Normal (3 floats)
            normal = struct.unpack("<3f", f.read(12))
            normals[i] = normal
            
            # 3 vertices (9 floats)
            for j in range(3):
                vertex = struct.unpack("<3f", f.read(12))
                vertices[i * 3 + j] = vertex
            
            # Attribute byte count (unused)
            f.read(2)
        
        return STLMesh(
            vertices=vertices,
            faces=faces,
            normals=normals,
            name=name
        )
    
    def _merge_duplicate_vertices(self, mesh: STLMesh) -> STLMesh:
        """Merge duplicate vertices within tolerance."""
        # Round vertices to tolerance
        scale = 1.0 / self.merge_tolerance
        rounded = np.round(mesh.vertices * scale).astype(np.int64)
        
        # Find unique vertices
        _, unique_indices, inverse_indices = np.unique(
            rounded, axis=0, return_index=True, return_inverse=True
        )
        
        unique_vertices = mesh.vertices[unique_indices]
        new_faces = inverse_indices[mesh.faces]
        
        return STLMesh(
            vertices=unique_vertices,
            faces=new_faces,
            normals=mesh.normals,
            name=mesh.name
        )


def load_stl(file_path: Union[str, Path], **kwargs) -> STLMesh:
    """Convenience function to load an STL file."""
    parser = STLParser(**kwargs)
    return parser.parse(file_path)
