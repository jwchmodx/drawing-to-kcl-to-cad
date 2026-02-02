"""
Feature Recognition Module

Implements RANSAC-based geometric primitive detection for:
- Planes
- Cylinders
- Spheres
- Cones
- Tori

Uses region growing for segmentation and least-squares fitting for refinement.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Type

import numpy as np
from scipy import optimize
from scipy.spatial import KDTree

from ..config import FeatureRecognitionConfig, FeatureType
from ..parsers.stl_parser import STLMesh
from .primitives import (
    ConeFeature,
    CylinderFeature,
    GeometricPrimitive,
    PlaneFeature,
    SphereFeature,
    TorusFeature,
)


@dataclass
class RecognizedFeature:
    """Container for a recognized feature with metadata."""
    primitive: GeometricPrimitive
    face_indices: np.ndarray
    coverage_ratio: float  # Fraction of mesh covered
    
    @property
    def feature_type(self) -> FeatureType:
        return self.primitive.feature_type


class FeatureRecognizer:
    """
    Main feature recognition engine.
    
    Uses a multi-pass approach:
    1. Compute normals and curvatures
    2. Segment mesh into regions
    3. Fit primitives to each region using RANSAC
    4. Refine fits using least-squares
    5. Merge similar features
    """
    
    def __init__(self, config: Optional[FeatureRecognitionConfig] = None):
        self.config = config or FeatureRecognitionConfig()
        self._mesh: Optional[STLMesh] = None
        self._vertex_normals: Optional[np.ndarray] = None
        self._kdtree: Optional[KDTree] = None
    
    def recognize(self, mesh: STLMesh) -> List[RecognizedFeature]:
        """
        Recognize geometric features in the mesh.
        
        Args:
            mesh: Input STL mesh
            
        Returns:
            List of recognized features
        """
        self._mesh = mesh
        self._vertex_normals = mesh.compute_vertex_normals()
        self._kdtree = KDTree(mesh.vertices)
        
        features = []
        remaining_faces = set(range(mesh.num_faces))
        
        # Detection order: planes first (most common), then cylinders, spheres, etc.
        detection_order = [
            (FeatureType.PLANE, self._detect_plane, self.config.detect_planes),
            (FeatureType.CYLINDER, self._detect_cylinder, self.config.detect_cylinders),
            (FeatureType.SPHERE, self._detect_sphere, self.config.detect_spheres),
            (FeatureType.CONE, self._detect_cone, self.config.detect_cones),
            (FeatureType.TORUS, self._detect_torus, self.config.detect_tori),
        ]
        
        for feature_type, detect_fn, enabled in detection_order:
            if not enabled:
                continue
            
            while len(remaining_faces) > self.config.min_points_plane:
                # Get points for remaining faces
                face_indices = np.array(list(remaining_faces))
                points, point_normals = self._get_face_points(face_indices)
                
                if len(points) < self._min_points_for_type(feature_type):
                    break
                
                # Try to detect feature
                feature = detect_fn(points, point_normals, face_indices)
                
                if feature is not None:
                    # Remove detected faces from remaining
                    detected_faces = set(feature.face_indices.tolist())
                    remaining_faces -= detected_faces
                    features.append(feature)
                else:
                    break  # No more features of this type
        
        return features
    
    def _min_points_for_type(self, feature_type: FeatureType) -> int:
        """Get minimum points required for feature type."""
        return {
            FeatureType.PLANE: self.config.min_points_plane,
            FeatureType.CYLINDER: self.config.min_points_cylinder,
            FeatureType.SPHERE: self.config.min_points_sphere,
            FeatureType.CONE: self.config.min_points_cone,
            FeatureType.TORUS: 50,
        }.get(feature_type, 10)
    
    def _get_face_points(self, face_indices: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Get face centroids and normals for given face indices."""
        faces = self._mesh.faces[face_indices]
        
        # Compute face centroids
        v0 = self._mesh.vertices[faces[:, 0]]
        v1 = self._mesh.vertices[faces[:, 1]]
        v2 = self._mesh.vertices[faces[:, 2]]
        centroids = (v0 + v1 + v2) / 3
        
        # Use stored face normals
        normals = self._mesh.normals[face_indices]
        
        return centroids, normals
    
    def _detect_plane(
        self, points: np.ndarray, normals: np.ndarray, face_indices: np.ndarray
    ) -> Optional[RecognizedFeature]:
        """Detect planar feature using RANSAC."""
        best_plane = None
        best_inliers = []
        best_error = float("inf")
        
        n_points = len(points)
        threshold = self.config.ransac_threshold
        
        for _ in range(self.config.ransac_iterations):
            # Sample 3 points
            if n_points < 3:
                break
            sample_idx = np.random.choice(n_points, 3, replace=False)
            sample_points = points[sample_idx]
            
            # Fit plane to sample
            v1 = sample_points[1] - sample_points[0]
            v2 = sample_points[2] - sample_points[0]
            normal = np.cross(v1, v2)
            
            if np.linalg.norm(normal) < 1e-10:
                continue
            
            normal = normal / np.linalg.norm(normal)
            point_on_plane = sample_points[0]
            
            # Count inliers
            distances = np.abs(np.dot(points - point_on_plane, normal))
            inlier_mask = distances < threshold
            n_inliers = np.sum(inlier_mask)
            
            # Check normal consistency
            if n_inliers > 0:
                inlier_normals = normals[inlier_mask]
                normal_dots = np.abs(np.dot(inlier_normals, normal))
                normal_consistent = np.mean(normal_dots) > self.config.normal_consistency_threshold
                
                if not normal_consistent:
                    continue
            
            if n_inliers > len(best_inliers):
                best_inliers = np.where(inlier_mask)[0]
                best_plane = (point_on_plane, normal)
                best_error = np.mean(distances[inlier_mask])
        
        # Require minimum number of inliers
        if len(best_inliers) < self.config.min_points_plane:
            return None
        
        # Refine plane fit using all inliers
        inlier_points = points[best_inliers]
        refined_point, refined_normal = self._refine_plane_fit(inlier_points)
        
        # Compute final error
        final_distances = np.abs(np.dot(inlier_points - refined_point, refined_normal))
        fitting_error = np.mean(final_distances)
        
        # Compute bounds in local coordinates
        bounds = self._compute_plane_bounds(inlier_points, refined_point, refined_normal)
        
        plane = PlaneFeature(
            point=refined_point,
            normal=refined_normal,
            bounds=bounds,
            point_indices=best_inliers,
            fitting_error=fitting_error,
            confidence=len(best_inliers) / len(points),
        )
        
        return RecognizedFeature(
            primitive=plane,
            face_indices=face_indices[best_inliers],
            coverage_ratio=len(best_inliers) / self._mesh.num_faces,
        )
    
    def _refine_plane_fit(self, points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Refine plane fit using SVD."""
        centroid = np.mean(points, axis=0)
        centered = points - centroid
        
        # SVD to find best-fit plane
        _, _, vh = np.linalg.svd(centered)
        normal = vh[-1]  # Last row is normal to plane
        
        # Ensure consistent normal direction (pointing towards positive z if possible)
        if normal[2] < 0:
            normal = -normal
        
        return centroid, normal
    
    def _compute_plane_bounds(
        self, points: np.ndarray, center: np.ndarray, normal: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Compute bounding box in local plane coordinates."""
        # Create local coordinate system
        if np.abs(normal[2]) < 0.9:
            u = np.cross(normal, np.array([0, 0, 1]))
        else:
            u = np.cross(normal, np.array([1, 0, 0]))
        u = u / np.linalg.norm(u)
        v = np.cross(normal, u)
        
        # Project points to local 2D
        centered = points - center
        local_u = np.dot(centered, u)
        local_v = np.dot(centered, v)
        
        min_bounds = np.array([local_u.min(), local_v.min(), 0])
        max_bounds = np.array([local_u.max(), local_v.max(), 0])
        
        return min_bounds, max_bounds
    
    def _detect_cylinder(
        self, points: np.ndarray, normals: np.ndarray, face_indices: np.ndarray
    ) -> Optional[RecognizedFeature]:
        """Detect cylindrical feature using RANSAC."""
        best_cylinder = None
        best_inliers = []
        best_error = float("inf")
        
        n_points = len(points)
        threshold = self.config.ransac_threshold
        
        for _ in range(self.config.ransac_iterations):
            if n_points < 2:
                break
            
            # Sample 2 points with normals
            sample_idx = np.random.choice(n_points, 2, replace=False)
            p1, p2 = points[sample_idx]
            n1, n2 = normals[sample_idx]
            
            # Estimate axis direction from normal cross product
            axis = np.cross(n1, n2)
            if np.linalg.norm(axis) < 1e-10:
                # Normals are parallel - try estimating from point difference
                axis = p2 - p1
                if np.linalg.norm(axis) < 1e-10:
                    continue
            
            axis = axis / np.linalg.norm(axis)
            
            # Estimate axis point and radius
            # Project points onto plane perpendicular to axis
            proj1 = p1 - np.dot(p1, axis) * axis
            proj2 = p2 - np.dot(p2, axis) * axis
            
            # Find intersection of normal lines in this plane
            d1 = n1 - np.dot(n1, axis) * axis
            d2 = n2 - np.dot(n2, axis) * axis
            
            if np.linalg.norm(d1) < 1e-10 or np.linalg.norm(d2) < 1e-10:
                continue
            
            d1 = d1 / np.linalg.norm(d1)
            d2 = d2 / np.linalg.norm(d2)
            
            # Approximate center and radius
            center = (proj1 + proj2) / 2
            radius = np.linalg.norm(proj1 - center)
            
            if radius < 1e-6 or radius > 1000:
                continue
            
            # Count inliers
            distances = self._cylinder_distances(points, center, axis, radius)
            inlier_mask = distances < threshold
            n_inliers = np.sum(inlier_mask)
            
            if n_inliers > len(best_inliers):
                best_inliers = np.where(inlier_mask)[0]
                best_cylinder = (center, axis, radius)
                best_error = np.mean(distances[inlier_mask])
        
        if len(best_inliers) < self.config.min_points_cylinder:
            return None
        
        center, axis, radius = best_cylinder
        
        # Refine fit
        inlier_points = points[best_inliers]
        refined_center, refined_axis, refined_radius = self._refine_cylinder_fit(
            inlier_points, center, axis, radius
        )
        
        # Compute height
        projections = np.dot(inlier_points - refined_center, refined_axis)
        height = projections.max() - projections.min()
        start_point = refined_center + projections.min() * refined_axis
        end_point = refined_center + projections.max() * refined_axis
        
        # Final error
        final_distances = self._cylinder_distances(
            inlier_points, refined_center, refined_axis, refined_radius
        )
        fitting_error = np.mean(final_distances)
        
        cylinder = CylinderFeature(
            axis_point=refined_center,
            axis_direction=refined_axis,
            radius=refined_radius,
            height=height,
            start_point=start_point,
            end_point=end_point,
            point_indices=best_inliers,
            fitting_error=fitting_error,
            confidence=len(best_inliers) / len(points),
        )
        
        return RecognizedFeature(
            primitive=cylinder,
            face_indices=face_indices[best_inliers],
            coverage_ratio=len(best_inliers) / self._mesh.num_faces,
        )
    
    def _cylinder_distances(
        self, points: np.ndarray, center: np.ndarray, axis: np.ndarray, radius: float
    ) -> np.ndarray:
        """Calculate distances from points to cylinder surface."""
        v = points - center
        proj_lengths = np.dot(v, axis)
        proj = np.outer(proj_lengths, axis)
        perp = v - proj
        perp_dists = np.linalg.norm(perp, axis=1)
        return np.abs(perp_dists - radius)
    
    def _refine_cylinder_fit(
        self, points: np.ndarray, center: np.ndarray, axis: np.ndarray, radius: float
    ) -> Tuple[np.ndarray, np.ndarray, float]:
        """Refine cylinder parameters using least squares."""
        def residuals(params):
            cx, cy, cz, ax, ay, az, r = params
            c = np.array([cx, cy, cz])
            a = np.array([ax, ay, az])
            a = a / (np.linalg.norm(a) + 1e-10)
            return self._cylinder_distances(points, c, a, r)
        
        x0 = [*center, *axis, radius]
        try:
            result = optimize.least_squares(residuals, x0, method="lm", max_nfev=100)
            cx, cy, cz, ax, ay, az, r = result.x
            refined_center = np.array([cx, cy, cz])
            refined_axis = np.array([ax, ay, az])
            refined_axis = refined_axis / np.linalg.norm(refined_axis)
            refined_radius = abs(r)
            return refined_center, refined_axis, refined_radius
        except:
            return center, axis, radius
    
    def _detect_sphere(
        self, points: np.ndarray, normals: np.ndarray, face_indices: np.ndarray
    ) -> Optional[RecognizedFeature]:
        """Detect spherical feature using RANSAC."""
        best_sphere = None
        best_inliers = []
        
        n_points = len(points)
        threshold = self.config.ransac_threshold
        
        for _ in range(self.config.ransac_iterations):
            if n_points < 4:
                break
            
            # Sample 4 points
            sample_idx = np.random.choice(n_points, 4, replace=False)
            sample_points = points[sample_idx]
            
            # Fit sphere to 4 points
            try:
                center, radius = self._fit_sphere_4points(sample_points)
            except:
                continue
            
            if radius < 1e-6 or radius > 1000:
                continue
            
            # Count inliers
            distances = np.abs(np.linalg.norm(points - center, axis=1) - radius)
            inlier_mask = distances < threshold
            n_inliers = np.sum(inlier_mask)
            
            # Check normal consistency (normals should point radially)
            if n_inliers > self.config.min_points_sphere:
                inlier_points = points[inlier_mask]
                inlier_normals = normals[inlier_mask]
                radial = inlier_points - center
                radial = radial / (np.linalg.norm(radial, axis=1, keepdims=True) + 1e-10)
                normal_dots = np.abs(np.sum(inlier_normals * radial, axis=1))
                
                if np.mean(normal_dots) < self.config.normal_consistency_threshold:
                    continue
            
            if n_inliers > len(best_inliers):
                best_inliers = np.where(inlier_mask)[0]
                best_sphere = (center, radius)
        
        if len(best_inliers) < self.config.min_points_sphere:
            return None
        
        center, radius = best_sphere
        
        # Refine fit
        inlier_points = points[best_inliers]
        refined_center, refined_radius = self._refine_sphere_fit(inlier_points, center, radius)
        
        # Final error
        final_distances = np.abs(np.linalg.norm(inlier_points - refined_center, axis=1) - refined_radius)
        fitting_error = np.mean(final_distances)
        
        sphere = SphereFeature(
            center=refined_center,
            radius=refined_radius,
            point_indices=best_inliers,
            fitting_error=fitting_error,
            confidence=len(best_inliers) / len(points),
        )
        
        return RecognizedFeature(
            primitive=sphere,
            face_indices=face_indices[best_inliers],
            coverage_ratio=len(best_inliers) / self._mesh.num_faces,
        )
    
    def _fit_sphere_4points(self, points: np.ndarray) -> Tuple[np.ndarray, float]:
        """Fit sphere through 4 points using determinant method."""
        # Set up linear system: |p - c|^2 = r^2
        # Expanding: 2*c·p = |p|^2 + |c|^2 - r^2
        # Let k = |c|^2 - r^2
        # Then: 2*cx*px + 2*cy*py + 2*cz*pz - k = px^2 + py^2 + pz^2
        
        A = np.zeros((4, 4))
        b = np.zeros(4)
        
        for i, p in enumerate(points):
            A[i] = [2*p[0], 2*p[1], 2*p[2], -1]
            b[i] = p[0]**2 + p[1]**2 + p[2]**2
        
        x = np.linalg.solve(A, b)
        center = x[:3]
        k = x[3]
        radius = np.sqrt(np.dot(center, center) - k)
        
        return center, radius
    
    def _refine_sphere_fit(
        self, points: np.ndarray, center: np.ndarray, radius: float
    ) -> Tuple[np.ndarray, float]:
        """Refine sphere parameters using least squares."""
        def residuals(params):
            cx, cy, cz, r = params
            c = np.array([cx, cy, cz])
            return np.linalg.norm(points - c, axis=1) - r
        
        x0 = [*center, radius]
        try:
            result = optimize.least_squares(residuals, x0, method="lm", max_nfev=100)
            cx, cy, cz, r = result.x
            return np.array([cx, cy, cz]), abs(r)
        except:
            return center, radius
    
    def _detect_cone(
        self, points: np.ndarray, normals: np.ndarray, face_indices: np.ndarray
    ) -> Optional[RecognizedFeature]:
        """Detect conical feature using RANSAC."""
        best_cone = None
        best_inliers = []
        
        n_points = len(points)
        threshold = self.config.ransac_threshold
        
        for _ in range(self.config.ransac_iterations):
            if n_points < 3:
                break
            
            # Sample 3 points with normals
            sample_idx = np.random.choice(n_points, 3, replace=False)
            sample_points = points[sample_idx]
            sample_normals = normals[sample_idx]
            
            # Estimate axis from normals (they should all intersect at apex)
            try:
                apex, axis, half_angle = self._estimate_cone_from_samples(
                    sample_points, sample_normals
                )
            except:
                continue
            
            if half_angle < 0.01 or half_angle > np.pi/2 - 0.01:
                continue
            
            # Count inliers
            distances = self._cone_distances(points, apex, axis, half_angle)
            inlier_mask = distances < threshold
            n_inliers = np.sum(inlier_mask)
            
            if n_inliers > len(best_inliers):
                best_inliers = np.where(inlier_mask)[0]
                best_cone = (apex, axis, half_angle)
        
        if len(best_inliers) < self.config.min_points_cone:
            return None
        
        apex, axis, half_angle = best_cone
        inlier_points = points[best_inliers]
        
        # Compute height
        projections = np.dot(inlier_points - apex, axis)
        height = projections.max()
        
        # Final error
        final_distances = self._cone_distances(inlier_points, apex, axis, half_angle)
        fitting_error = np.mean(final_distances)
        
        cone = ConeFeature(
            apex=apex,
            axis_direction=axis,
            half_angle=half_angle,
            height=height,
            point_indices=best_inliers,
            fitting_error=fitting_error,
            confidence=len(best_inliers) / len(points),
        )
        
        return RecognizedFeature(
            primitive=cone,
            face_indices=face_indices[best_inliers],
            coverage_ratio=len(best_inliers) / self._mesh.num_faces,
        )
    
    def _estimate_cone_from_samples(
        self, points: np.ndarray, normals: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, float]:
        """Estimate cone parameters from sample points and normals."""
        # The normals of a cone surface, when extended, meet at the apex
        # Use least squares to find approximate apex
        
        # Set up system: find point p that minimizes distance to all normal lines
        A = np.eye(3) * len(points)
        b = np.zeros(3)
        
        for p, n in zip(points, normals):
            outer = np.outer(n, n)
            A -= outer
            b += p - np.dot(outer, p)
        
        try:
            apex = np.linalg.solve(A, b)
        except:
            raise ValueError("Could not estimate apex")
        
        # Estimate axis as average direction from apex to points
        directions = points - apex
        distances = np.linalg.norm(directions, axis=1, keepdims=True)
        directions = directions / (distances + 1e-10)
        axis = np.mean(directions, axis=0)
        axis = axis / np.linalg.norm(axis)
        
        # Estimate half-angle
        angles = np.arccos(np.clip(np.dot(directions, axis), -1, 1))
        half_angle = np.mean(angles)
        
        return apex, axis, half_angle
    
    def _cone_distances(
        self, points: np.ndarray, apex: np.ndarray, axis: np.ndarray, half_angle: float
    ) -> np.ndarray:
        """Calculate distances from points to cone surface."""
        v = points - apex
        proj_lengths = np.dot(v, axis)
        
        # Handle points behind apex
        proj_lengths = np.maximum(proj_lengths, 1e-10)
        
        expected_r = proj_lengths * np.tan(half_angle)
        
        proj = np.outer(proj_lengths, axis)
        perp = v - proj
        actual_r = np.linalg.norm(perp, axis=1)
        
        return np.abs(actual_r - expected_r) * np.cos(half_angle)
    
    def _detect_torus(
        self, points: np.ndarray, normals: np.ndarray, face_indices: np.ndarray
    ) -> Optional[RecognizedFeature]:
        """Detect torus feature using RANSAC (simplified implementation)."""
        # Torus detection is complex - this is a simplified version
        # For full implementation, consider using more sophisticated algorithms
        
        n_points = len(points)
        if n_points < 50:
            return None
        
        threshold = self.config.ransac_threshold * 2  # More tolerance for tori
        
        best_torus = None
        best_inliers = []
        
        for _ in range(self.config.ransac_iterations // 2):
            # Sample points and try to fit torus
            sample_idx = np.random.choice(n_points, min(20, n_points), replace=False)
            sample_points = points[sample_idx]
            
            try:
                center, axis, R, r = self._estimate_torus(sample_points)
            except:
                continue
            
            if R < r or r < 0.1 or R > 100:
                continue
            
            # Count inliers
            distances = self._torus_distances(points, center, axis, R, r)
            inlier_mask = distances < threshold
            n_inliers = np.sum(inlier_mask)
            
            if n_inliers > len(best_inliers):
                best_inliers = np.where(inlier_mask)[0]
                best_torus = (center, axis, R, r)
        
        if len(best_inliers) < 50:
            return None
        
        center, axis, R, r = best_torus
        inlier_points = points[best_inliers]
        
        final_distances = self._torus_distances(inlier_points, center, axis, R, r)
        fitting_error = np.mean(final_distances)
        
        torus = TorusFeature(
            center=center,
            axis=axis,
            major_radius=R,
            minor_radius=r,
            point_indices=best_inliers,
            fitting_error=fitting_error,
            confidence=len(best_inliers) / len(points),
        )
        
        return RecognizedFeature(
            primitive=torus,
            face_indices=face_indices[best_inliers],
            coverage_ratio=len(best_inliers) / self._mesh.num_faces,
        )
    
    def _estimate_torus(
        self, points: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """Estimate torus parameters from points (simplified)."""
        # Estimate center as centroid
        center = np.mean(points, axis=0)
        
        # Estimate axis using PCA
        centered = points - center
        _, _, vh = np.linalg.svd(centered)
        axis = vh[0]  # First principal component is likely perpendicular to axis
        axis = vh[-1]  # Actually use smallest component as axis
        
        # Project points onto axis and perpendicular plane
        proj_on_axis = np.dot(centered, axis)
        perp = centered - np.outer(proj_on_axis, axis)
        
        # Major radius is average distance in perpendicular plane
        R = np.mean(np.linalg.norm(perp, axis=1))
        
        # Minor radius from variation around major circle
        major_circle_points = R * (perp / (np.linalg.norm(perp, axis=1, keepdims=True) + 1e-10))
        r = np.mean(np.linalg.norm(centered - major_circle_points, axis=1))
        
        return center, axis, R, r
    
    def _torus_distances(
        self, points: np.ndarray, center: np.ndarray, axis: np.ndarray,
        major_radius: float, minor_radius: float
    ) -> np.ndarray:
        """Calculate distances from points to torus surface."""
        v = points - center
        proj_on_axis = np.dot(v, axis)
        perp = v - np.outer(proj_on_axis, axis)
        
        d_in_plane = np.linalg.norm(perp, axis=1)
        d_in_plane = np.maximum(d_in_plane, 1e-10)
        
        major_circle_points = center + major_radius * (perp / d_in_plane[:, np.newaxis])
        dist_to_major = np.linalg.norm(points - major_circle_points, axis=1)
        
        return np.abs(dist_to_major - minor_radius)
