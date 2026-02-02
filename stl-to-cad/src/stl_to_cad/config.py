"""
Configuration settings for STL to CAD conversion.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class OutputFormat(Enum):
    """Supported output formats."""
    KCL = "kcl"
    STEP = "step"
    IGES = "iges"
    JSON = "json"  # Intermediate representation


class FeatureType(Enum):
    """Recognized geometric feature types."""
    PLANE = "plane"
    CYLINDER = "cylinder"
    SPHERE = "sphere"
    CONE = "cone"
    TORUS = "torus"
    FREEFORM = "freeform"  # NURBS/B-spline surface


@dataclass
class ToleranceConfig:
    """Tolerance settings for precision control."""
    # Surface fitting tolerance (mm)
    surface_fitting: float = 0.01
    # Angular tolerance for feature detection (radians)
    angular: float = 0.01
    # Point merging tolerance (mm)
    point_merge: float = 0.001
    # Edge detection angle threshold (degrees)
    edge_angle_threshold: float = 30.0
    # Minimum feature size to recognize (mm)
    min_feature_size: float = 0.1


@dataclass
class FeatureRecognitionConfig:
    """Settings for feature recognition algorithms."""
    # Enable specific feature types
    detect_planes: bool = True
    detect_cylinders: bool = True
    detect_spheres: bool = True
    detect_cones: bool = True
    detect_tori: bool = True
    
    # RANSAC parameters
    ransac_iterations: int = 1000
    ransac_threshold: float = 0.01
    
    # Minimum points required for feature detection
    min_points_plane: int = 10
    min_points_cylinder: int = 20
    min_points_sphere: int = 20
    min_points_cone: int = 30
    
    # Region growing parameters
    region_growing_threshold: float = 0.02
    normal_consistency_threshold: float = 0.95


@dataclass
class SurfaceFittingConfig:
    """Settings for surface fitting algorithms."""
    # NURBS degree
    nurbs_degree_u: int = 3
    nurbs_degree_v: int = 3
    
    # Control point density
    control_points_density: float = 0.1  # points per mm
    
    # Fitting iterations
    max_iterations: int = 100
    convergence_threshold: float = 1e-6
    
    # Smoothing parameters
    smoothing_weight: float = 0.1


@dataclass
class ConversionConfig:
    """Main configuration for STL to CAD conversion."""
    # Output format
    output_format: OutputFormat = OutputFormat.KCL
    
    # Tolerance settings
    tolerance: ToleranceConfig = field(default_factory=ToleranceConfig)
    
    # Feature recognition settings
    feature_recognition: FeatureRecognitionConfig = field(
        default_factory=FeatureRecognitionConfig
    )
    
    # Surface fitting settings
    surface_fitting: SurfaceFittingConfig = field(
        default_factory=SurfaceFittingConfig
    )
    
    # Processing options
    auto_orient_normals: bool = True
    remove_duplicate_vertices: bool = True
    fill_holes: bool = False
    simplify_mesh: bool = False
    simplify_ratio: float = 0.9
    
    # Debug options
    verbose: bool = False
    save_intermediate: bool = False
    intermediate_dir: Optional[str] = None
    
    @classmethod
    def high_precision(cls) -> "ConversionConfig":
        """Create a high-precision configuration."""
        return cls(
            tolerance=ToleranceConfig(
                surface_fitting=0.001,
                angular=0.001,
                point_merge=0.0001,
            ),
            feature_recognition=FeatureRecognitionConfig(
                ransac_iterations=5000,
                ransac_threshold=0.001,
            ),
            surface_fitting=SurfaceFittingConfig(
                max_iterations=500,
                convergence_threshold=1e-8,
            ),
        )
    
    @classmethod
    def fast(cls) -> "ConversionConfig":
        """Create a fast conversion configuration."""
        return cls(
            tolerance=ToleranceConfig(
                surface_fitting=0.1,
                angular=0.05,
            ),
            feature_recognition=FeatureRecognitionConfig(
                ransac_iterations=200,
                ransac_threshold=0.1,
            ),
            surface_fitting=SurfaceFittingConfig(
                max_iterations=20,
            ),
            simplify_mesh=True,
            simplify_ratio=0.5,
        )
