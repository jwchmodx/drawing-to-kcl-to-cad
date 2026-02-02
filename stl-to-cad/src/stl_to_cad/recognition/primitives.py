"""
Geometric primitive definitions for feature recognition.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np

from ..config import FeatureType


@dataclass
class GeometricPrimitive(ABC):
    """Base class for geometric primitives."""
    feature_type: FeatureType
    point_indices: np.ndarray  # Indices of points belonging to this feature
    fitting_error: float = 0.0
    confidence: float = 1.0
    
    @abstractmethod
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate distance from point to surface."""
        pass
    
    @abstractmethod
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        pass
    
    @abstractmethod
    def to_kcl(self) -> str:
        """Generate KCL code for this primitive."""
        pass


@dataclass
class PlaneFeature(GeometricPrimitive):
    """
    Plane defined by point and normal: n·(p - p0) = 0
    """
    feature_type: FeatureType = field(default=FeatureType.PLANE, init=False)
    point: np.ndarray = field(default_factory=lambda: np.zeros(3))  # Point on plane
    normal: np.ndarray = field(default_factory=lambda: np.array([0, 0, 1]))  # Normal vector
    bounds: Optional[Tuple[np.ndarray, np.ndarray]] = None  # (min, max) in local coords
    
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate signed distance from point to plane."""
        return np.abs(np.dot(self.normal, point - self.point))
    
    def project_point(self, point: np.ndarray) -> np.ndarray:
        """Project point onto plane."""
        d = np.dot(self.normal, point - self.point)
        return point - d * self.normal
    
    def to_dict(self) -> dict:
        return {
            "type": "plane",
            "point": self.point.tolist(),
            "normal": self.normal.tolist(),
            "bounds": [b.tolist() for b in self.bounds] if self.bounds else None,
            "fitting_error": self.fitting_error,
            "confidence": self.confidence,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for planar face."""
        # Create a sketch plane and extrude
        px, py, pz = self.point
        nx, ny, nz = self.normal
        
        return f"""// Plane at ({px:.4f}, {py:.4f}, {pz:.4f}) with normal ({nx:.4f}, {ny:.4f}, {nz:.4f})
plane_{id(self) % 10000} = {{
    origin: [{px:.6f}, {py:.6f}, {pz:.6f}],
    normal: [{nx:.6f}, {ny:.6f}, {nz:.6f}]
}}"""


@dataclass
class CylinderFeature(GeometricPrimitive):
    """
    Cylinder defined by axis point, direction, and radius.
    """
    feature_type: FeatureType = field(default=FeatureType.CYLINDER, init=False)
    axis_point: np.ndarray = field(default_factory=lambda: np.zeros(3))
    axis_direction: np.ndarray = field(default_factory=lambda: np.array([0, 0, 1]))
    radius: float = 1.0
    height: Optional[float] = None
    start_point: Optional[np.ndarray] = None
    end_point: Optional[np.ndarray] = None
    
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate distance from point to cylinder surface."""
        # Vector from axis point to query point
        v = point - self.axis_point
        # Project onto axis
        proj_length = np.dot(v, self.axis_direction)
        proj = proj_length * self.axis_direction
        # Perpendicular component
        perp = v - proj
        perp_dist = np.linalg.norm(perp)
        # Distance to surface
        return np.abs(perp_dist - self.radius)
    
    def to_dict(self) -> dict:
        return {
            "type": "cylinder",
            "axis_point": self.axis_point.tolist(),
            "axis_direction": self.axis_direction.tolist(),
            "radius": self.radius,
            "height": self.height,
            "start_point": self.start_point.tolist() if self.start_point is not None else None,
            "end_point": self.end_point.tolist() if self.end_point is not None else None,
            "fitting_error": self.fitting_error,
            "confidence": self.confidence,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for cylinder."""
        px, py, pz = self.axis_point
        dx, dy, dz = self.axis_direction
        h = self.height or 10.0
        
        return f"""// Cylinder: radius={self.radius:.4f}, height={h:.4f}
cylinder_{id(self) % 10000} = startSketchOn({{
    origin: [{px:.6f}, {py:.6f}, {pz:.6f}],
    normal: [{dx:.6f}, {dy:.6f}, {dz:.6f}]
}})
  |> circle(center = [0, 0], radius = {self.radius:.6f})
  |> extrude(length = {h:.6f})"""


@dataclass
class SphereFeature(GeometricPrimitive):
    """
    Sphere defined by center and radius.
    """
    feature_type: FeatureType = field(default=FeatureType.SPHERE, init=False)
    center: np.ndarray = field(default_factory=lambda: np.zeros(3))
    radius: float = 1.0
    
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate distance from point to sphere surface."""
        return np.abs(np.linalg.norm(point - self.center) - self.radius)
    
    def to_dict(self) -> dict:
        return {
            "type": "sphere",
            "center": self.center.tolist(),
            "radius": self.radius,
            "fitting_error": self.fitting_error,
            "confidence": self.confidence,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for sphere."""
        cx, cy, cz = self.center
        return f"""// Sphere: center=({cx:.4f}, {cy:.4f}, {cz:.4f}), radius={self.radius:.4f}
sphere_{id(self) % 10000} = sphere(center = [{cx:.6f}, {cy:.6f}, {cz:.6f}], radius = {self.radius:.6f})"""


@dataclass
class ConeFeature(GeometricPrimitive):
    """
    Cone defined by apex, axis direction, and half-angle.
    """
    feature_type: FeatureType = field(default=FeatureType.CONE, init=False)
    apex: np.ndarray = field(default_factory=lambda: np.zeros(3))
    axis_direction: np.ndarray = field(default_factory=lambda: np.array([0, 0, 1]))
    half_angle: float = 0.5  # radians
    height: Optional[float] = None
    
    @property
    def base_radius(self) -> Optional[float]:
        """Calculate base radius if height is known."""
        if self.height is None:
            return None
        return self.height * np.tan(self.half_angle)
    
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate distance from point to cone surface."""
        v = point - self.apex
        cos_angle = np.cos(self.half_angle)
        sin_angle = np.sin(self.half_angle)
        
        # Project onto axis
        proj_length = np.dot(v, self.axis_direction)
        
        if proj_length <= 0:
            return np.linalg.norm(v)
        
        # Expected radius at this height
        expected_r = proj_length * np.tan(self.half_angle)
        
        # Actual perpendicular distance
        proj = proj_length * self.axis_direction
        perp = v - proj
        actual_r = np.linalg.norm(perp)
        
        # Distance to surface (approximate)
        return np.abs(actual_r - expected_r) * cos_angle
    
    def to_dict(self) -> dict:
        return {
            "type": "cone",
            "apex": self.apex.tolist(),
            "axis_direction": self.axis_direction.tolist(),
            "half_angle": self.half_angle,
            "half_angle_degrees": np.degrees(self.half_angle),
            "height": self.height,
            "base_radius": self.base_radius,
            "fitting_error": self.fitting_error,
            "confidence": self.confidence,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for cone."""
        ax, ay, az = self.apex
        dx, dy, dz = self.axis_direction
        h = self.height or 10.0
        base_r = self.base_radius or h * np.tan(self.half_angle)
        
        return f"""// Cone: apex=({ax:.4f}, {ay:.4f}, {az:.4f}), half_angle={np.degrees(self.half_angle):.2f}°
cone_{id(self) % 10000} = startSketchOn({{
    origin: [{ax:.6f}, {ay:.6f}, {az:.6f}],
    normal: [{dx:.6f}, {dy:.6f}, {dz:.6f}]
}})
  |> circle(center = [0, 0], radius = 0.001)  // apex point
  |> loft(to = circle(center = [0, 0], radius = {base_r:.6f}), height = {h:.6f})"""


@dataclass
class TorusFeature(GeometricPrimitive):
    """
    Torus defined by center, axis, major radius, and minor radius.
    """
    feature_type: FeatureType = field(default=FeatureType.TORUS, init=False)
    center: np.ndarray = field(default_factory=lambda: np.zeros(3))
    axis: np.ndarray = field(default_factory=lambda: np.array([0, 0, 1]))
    major_radius: float = 2.0  # Distance from center to tube center
    minor_radius: float = 0.5  # Tube radius
    
    def distance_to_point(self, point: np.ndarray) -> float:
        """Calculate distance from point to torus surface."""
        # Vector from center to point
        v = point - self.center
        
        # Project onto plane perpendicular to axis
        proj_on_axis = np.dot(v, self.axis) * self.axis
        v_in_plane = v - proj_on_axis
        
        # Distance from axis in plane
        d_in_plane = np.linalg.norm(v_in_plane)
        
        if d_in_plane < 1e-10:
            # Point is on axis
            return np.abs(np.sqrt(self.major_radius**2 + np.dot(v, self.axis)**2) - self.minor_radius)
        
        # Point on major circle closest to query point
        major_point = self.center + self.major_radius * (v_in_plane / d_in_plane)
        
        # Distance from major circle point to query point
        dist_to_major = np.linalg.norm(point - major_point)
        
        # Distance to torus surface
        return np.abs(dist_to_major - self.minor_radius)
    
    def to_dict(self) -> dict:
        return {
            "type": "torus",
            "center": self.center.tolist(),
            "axis": self.axis.tolist(),
            "major_radius": self.major_radius,
            "minor_radius": self.minor_radius,
            "fitting_error": self.fitting_error,
            "confidence": self.confidence,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for torus."""
        cx, cy, cz = self.center
        ax, ay, az = self.axis
        
        return f"""// Torus: center=({cx:.4f}, {cy:.4f}, {cz:.4f}), R={self.major_radius:.4f}, r={self.minor_radius:.4f}
torus_{id(self) % 10000} = revolve(
    profile = circle(center = [{cx + self.major_radius:.6f}, {cy:.6f}], radius = {self.minor_radius:.6f}),
    axis = {{ origin: [{cx:.6f}, {cy:.6f}, {cz:.6f}], direction: [{ax:.6f}, {ay:.6f}, {az:.6f}] }},
    angle = 360
)"""
