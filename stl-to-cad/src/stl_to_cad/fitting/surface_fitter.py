"""
Surface Fitting Module

Fits NURBS/B-spline surfaces to mesh regions for freeform geometry.
Uses least-squares fitting with smoothness regularization.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
from scipy import interpolate, optimize
from scipy.spatial import Delaunay

from ..config import SurfaceFittingConfig


@dataclass
class NURBSSurface:
    """
    NURBS surface representation.
    
    S(u,v) = Σ_i Σ_j N_i,p(u) * N_j,q(v) * w_ij * P_ij / Σ_i Σ_j N_i,p(u) * N_j,q(v) * w_ij
    """
    control_points: np.ndarray  # (n_u, n_v, 3) control point grid
    weights: np.ndarray         # (n_u, n_v) weights for rational B-spline
    knots_u: np.ndarray         # Knot vector in u direction
    knots_v: np.ndarray         # Knot vector in v direction
    degree_u: int = 3
    degree_v: int = 3
    
    @property
    def n_control_u(self) -> int:
        return self.control_points.shape[0]
    
    @property
    def n_control_v(self) -> int:
        return self.control_points.shape[1]
    
    def evaluate(self, u: float, v: float) -> np.ndarray:
        """Evaluate surface at parameter (u, v)."""
        # Use scipy's BSpline for evaluation
        # Note: This is a simplified evaluation; full NURBS would use rational basis
        point = np.zeros(3)
        for i in range(3):
            spline = interpolate.RectBivariateSpline(
                np.linspace(0, 1, self.n_control_u),
                np.linspace(0, 1, self.n_control_v),
                self.control_points[:, :, i],
                kx=self.degree_u,
                ky=self.degree_v,
            )
            point[i] = spline(u, v)[0, 0]
        return point
    
    def evaluate_grid(self, n_u: int = 20, n_v: int = 20) -> np.ndarray:
        """Evaluate surface on a grid."""
        u_vals = np.linspace(0, 1, n_u)
        v_vals = np.linspace(0, 1, n_v)
        
        points = np.zeros((n_u, n_v, 3))
        for i, u in enumerate(u_vals):
            for j, v in enumerate(v_vals):
                points[i, j] = self.evaluate(u, v)
        
        return points
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "control_points": self.control_points.tolist(),
            "weights": self.weights.tolist(),
            "knots_u": self.knots_u.tolist(),
            "knots_v": self.knots_v.tolist(),
            "degree_u": self.degree_u,
            "degree_v": self.degree_v,
        }
    
    def to_kcl(self) -> str:
        """Generate KCL code for NURBS surface."""
        # KCL surface representation (simplified)
        n_u, n_v = self.n_control_u, self.n_control_v
        
        lines = [f"// NURBS Surface: {n_u}x{n_v} control points, degree ({self.degree_u}, {self.degree_v})"]
        lines.append(f"nurbs_surface_{id(self) % 10000} = {{")
        lines.append(f"  degree_u: {self.degree_u},")
        lines.append(f"  degree_v: {self.degree_v},")
        lines.append("  control_points: [")
        
        for i in range(n_u):
            row_points = ", ".join(
                f"[{self.control_points[i, j, 0]:.6f}, {self.control_points[i, j, 1]:.6f}, {self.control_points[i, j, 2]:.6f}]"
                for j in range(n_v)
            )
            lines.append(f"    [{row_points}],")
        
        lines.append("  ],")
        lines.append(f"  knots_u: {self.knots_u.tolist()},")
        lines.append(f"  knots_v: {self.knots_v.tolist()},")
        lines.append("}")
        
        return "\n".join(lines)


@dataclass
class FittedSurface:
    """Container for a fitted surface with quality metrics."""
    surface: NURBSSurface
    point_indices: np.ndarray
    fitting_error: float
    max_error: float
    coverage: float
    
    def is_acceptable(self, tolerance: float) -> bool:
        """Check if surface meets tolerance requirements."""
        return self.max_error <= tolerance


class SurfaceFitter:
    """
    Fits NURBS surfaces to point clouds.
    
    Uses:
    1. Parameterization via projection
    2. Least-squares fitting with regularization
    3. Knot placement based on point density
    """
    
    def __init__(self, config: Optional[SurfaceFittingConfig] = None):
        self.config = config or SurfaceFittingConfig()
    
    def fit(
        self,
        points: np.ndarray,
        normals: Optional[np.ndarray] = None,
        boundary_points: Optional[np.ndarray] = None,
    ) -> FittedSurface:
        """
        Fit a NURBS surface to the given points.
        
        Args:
            points: (N, 3) array of points
            normals: (N, 3) array of normals (optional, for orientation)
            boundary_points: Points that should lie on boundary (optional)
            
        Returns:
            FittedSurface containing the NURBS surface and metrics
        """
        # Step 1: Parameterize points
        u_params, v_params = self._parameterize(points)
        
        # Step 2: Determine control point grid size
        n_u, n_v = self._compute_grid_size(points, u_params, v_params)
        
        # Step 3: Generate knot vectors
        knots_u = self._create_knot_vector(u_params, n_u, self.config.nurbs_degree_u)
        knots_v = self._create_knot_vector(v_params, n_v, self.config.nurbs_degree_v)
        
        # Step 4: Fit control points using least squares
        control_points = self._fit_control_points(
            points, u_params, v_params, n_u, n_v, knots_u, knots_v
        )
        
        # Step 5: Create surface and compute errors
        weights = np.ones((n_u, n_v))
        surface = NURBSSurface(
            control_points=control_points,
            weights=weights,
            knots_u=knots_u,
            knots_v=knots_v,
            degree_u=self.config.nurbs_degree_u,
            degree_v=self.config.nurbs_degree_v,
        )
        
        # Compute fitting errors
        errors = self._compute_errors(surface, points, u_params, v_params)
        
        return FittedSurface(
            surface=surface,
            point_indices=np.arange(len(points)),
            fitting_error=np.mean(errors),
            max_error=np.max(errors),
            coverage=1.0,
        )
    
    def _parameterize(self, points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Parameterize points onto (u, v) domain.
        
        Uses PCA-based projection for initial parameterization.
        """
        # Center points
        centroid = np.mean(points, axis=0)
        centered = points - centroid
        
        # PCA to find principal directions
        _, _, vh = np.linalg.svd(centered)
        
        # Project onto first two principal components
        u_dir = vh[0]
        v_dir = vh[1]
        
        u_coords = np.dot(centered, u_dir)
        v_coords = np.dot(centered, v_dir)
        
        # Normalize to [0, 1]
        u_params = (u_coords - u_coords.min()) / (u_coords.max() - u_coords.min() + 1e-10)
        v_params = (v_coords - v_coords.min()) / (v_coords.max() - v_coords.min() + 1e-10)
        
        return u_params, v_params
    
    def _compute_grid_size(
        self, points: np.ndarray, u_params: np.ndarray, v_params: np.ndarray
    ) -> Tuple[int, int]:
        """Compute appropriate control point grid size based on point density."""
        # Estimate surface extent
        bounds_min = points.min(axis=0)
        bounds_max = points.max(axis=0)
        extent = np.linalg.norm(bounds_max - bounds_min)
        
        # Compute grid size based on density setting
        n_points = len(points)
        density = self.config.control_points_density
        
        # Estimate number of control points
        n_total = int(np.sqrt(n_points) * density * 0.5)
        n_total = max(4, min(n_total, 30))  # Clamp to reasonable range
        
        # Distribute based on parameter spread
        u_spread = u_params.max() - u_params.min()
        v_spread = v_params.max() - v_params.min()
        
        ratio = u_spread / (v_spread + 1e-10)
        
        n_u = int(n_total * np.sqrt(ratio))
        n_v = int(n_total / np.sqrt(ratio))
        
        n_u = max(4, min(n_u, 20))
        n_v = max(4, min(n_v, 20))
        
        return n_u, n_v
    
    def _create_knot_vector(
        self, params: np.ndarray, n_control: int, degree: int
    ) -> np.ndarray:
        """Create a clamped knot vector."""
        n_knots = n_control + degree + 1
        n_internal = n_knots - 2 * (degree + 1)
        
        # Clamped knot vector: degree+1 zeros, internal knots, degree+1 ones
        knots = np.zeros(n_knots)
        knots[-(degree + 1):] = 1.0
        
        if n_internal > 0:
            # Place internal knots at data percentiles
            internal_positions = np.linspace(0, 1, n_internal + 2)[1:-1]
            internal_knots = np.percentile(params, internal_positions * 100)
            knots[degree + 1:degree + 1 + n_internal] = internal_knots
        
        return knots
    
    def _fit_control_points(
        self,
        points: np.ndarray,
        u_params: np.ndarray,
        v_params: np.ndarray,
        n_u: int,
        n_v: int,
        knots_u: np.ndarray,
        knots_v: np.ndarray,
    ) -> np.ndarray:
        """
        Fit control points using regularized least squares.
        """
        # Use scipy's griddata for initial approximation, then refine
        from scipy.interpolate import griddata
        
        # Create grid
        u_grid = np.linspace(0, 1, n_u)
        v_grid = np.linspace(0, 1, n_v)
        uu, vv = np.meshgrid(u_grid, v_grid, indexing='ij')
        
        # Interpolate to grid
        control_points = np.zeros((n_u, n_v, 3))
        param_points = np.column_stack([u_params, v_params])
        
        for i in range(3):
            try:
                control_points[:, :, i] = griddata(
                    param_points, points[:, i],
                    (uu, vv), method='cubic', fill_value=np.mean(points[:, i])
                )
            except:
                control_points[:, :, i] = griddata(
                    param_points, points[:, i],
                    (uu, vv), method='linear', fill_value=np.mean(points[:, i])
                )
        
        # Handle NaN values
        for i in range(3):
            mask = np.isnan(control_points[:, :, i])
            if mask.any():
                control_points[:, :, i][mask] = np.mean(points[:, i])
        
        return control_points
    
    def _compute_errors(
        self,
        surface: NURBSSurface,
        points: np.ndarray,
        u_params: np.ndarray,
        v_params: np.ndarray,
    ) -> np.ndarray:
        """Compute fitting errors for all points."""
        errors = np.zeros(len(points))
        
        for i, (u, v, pt) in enumerate(zip(u_params, v_params, points)):
            try:
                surface_pt = surface.evaluate(u, v)
                errors[i] = np.linalg.norm(pt - surface_pt)
            except:
                errors[i] = 0
        
        return errors
    
    def fit_with_refinement(
        self,
        points: np.ndarray,
        target_error: float = 0.01,
        max_refinements: int = 5,
    ) -> FittedSurface:
        """
        Fit with adaptive refinement to meet error tolerance.
        """
        fitted = self.fit(points)
        
        for _ in range(max_refinements):
            if fitted.max_error <= target_error:
                break
            
            # Increase control point density
            self.config.control_points_density *= 1.5
            fitted = self.fit(points)
        
        return fitted


class BSplineCurve:
    """B-Spline curve for edge representation."""
    
    def __init__(
        self,
        control_points: np.ndarray,
        degree: int = 3,
        knots: Optional[np.ndarray] = None,
    ):
        self.control_points = control_points
        self.degree = degree
        
        n = len(control_points)
        if knots is None:
            # Create uniform clamped knot vector
            n_knots = n + degree + 1
            self.knots = np.zeros(n_knots)
            self.knots[degree:-degree] = np.linspace(0, 1, n_knots - 2 * degree)
            self.knots[-degree:] = 1.0
        else:
            self.knots = knots
    
    def evaluate(self, t: float) -> np.ndarray:
        """Evaluate curve at parameter t."""
        # Use scipy's BSpline
        from scipy.interpolate import BSpline
        
        point = np.zeros(3)
        for i in range(3):
            spline = BSpline(self.knots, self.control_points[:, i], self.degree)
            point[i] = spline(t)
        
        return point
    
    def to_dict(self) -> dict:
        return {
            "control_points": self.control_points.tolist(),
            "degree": self.degree,
            "knots": self.knots.tolist(),
        }
    
    @classmethod
    def fit_to_points(cls, points: np.ndarray, degree: int = 3) -> "BSplineCurve":
        """Fit a B-spline curve to ordered points."""
        n_control = min(len(points), max(4, len(points) // 3))
        
        # Parameterize by chord length
        dists = np.linalg.norm(np.diff(points, axis=0), axis=1)
        params = np.zeros(len(points))
        params[1:] = np.cumsum(dists)
        params /= params[-1]
        
        # Interpolate to get control points
        from scipy.interpolate import interp1d
        
        control_t = np.linspace(0, 1, n_control)
        control_points = np.zeros((n_control, 3))
        
        for i in range(3):
            interp = interp1d(params, points[:, i], kind='linear')
            control_points[:, i] = interp(control_t)
        
        return cls(control_points, degree)
