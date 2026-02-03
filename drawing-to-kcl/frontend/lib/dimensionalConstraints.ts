/**
 * Dimensional Constraints System
 * Manages parametric constraints for CAD modeling
 */

export type ConstraintType = 
  | 'distance'
  | 'angle'
  | 'radius'
  | 'diameter'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'coincident'
  | 'concentric'
  | 'equal'
  | 'fixed';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface DimensionalConstraint {
  id: string;
  type: ConstraintType;
  value: number;
  unit: 'mm' | 'cm' | 'm' | 'in';
  
  // References to geometry
  entity1?: string; // ID of first entity
  entity2?: string; // ID of second entity
  point1?: Point3D;
  point2?: Point3D;
  
  // Display properties
  label?: string;
  visible: boolean;
  locked: boolean;
  
  // Position for UI display
  displayPosition?: Point3D;
}

export interface ConstraintResult {
  success: boolean;
  constraints: DimensionalConstraint[];
  errors: string[];
}

/**
 * Create a new constraint
 */
export function createConstraint(
  type: ConstraintType,
  value: number,
  options: Partial<DimensionalConstraint> = {}
): DimensionalConstraint {
  return {
    id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    value,
    unit: 'mm',
    visible: true,
    locked: false,
    ...options,
  };
}

/**
 * Update a constraint value
 */
export function updateConstraint(
  constraint: DimensionalConstraint,
  newValue: number
): DimensionalConstraint {
  return {
    ...constraint,
    value: newValue,
  };
}

/**
 * Solve constraints and update geometry
 * This is a simplified solver - a real implementation would use
 * a proper constraint solver algorithm
 */
export function solveConstraints(
  constraints: DimensionalConstraint[]
): ConstraintResult {
  const errors: string[] = [];
  const solvedConstraints: DimensionalConstraint[] = [];
  
  for (const constraint of constraints) {
    // Validate constraint
    if (constraint.value < 0 && !['angle'].includes(constraint.type)) {
      errors.push(`Constraint ${constraint.id}: Value cannot be negative`);
      continue;
    }
    
    // For now, just pass through constraints
    // A real implementation would solve the constraint system
    solvedConstraints.push(constraint);
  }
  
  return {
    success: errors.length === 0,
    constraints: solvedConstraints,
    errors,
  };
}

/**
 * Check if constraints are over-determined
 */
export function checkOverDetermined(
  constraints: DimensionalConstraint[]
): { isOverDetermined: boolean; conflicting: string[] } {
  // Simplified check - real implementation would analyze DOF
  const conflicting: string[] = [];
  
  return {
    isOverDetermined: conflicting.length > 0,
    conflicting,
  };
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle between two vectors (in degrees)
 */
export function calculateAngle(
  v1: Point3D,
  v2: Point3D
): number {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

/**
 * Convert units
 */
export function convertUnit(
  value: number,
  from: 'mm' | 'cm' | 'm' | 'in',
  to: 'mm' | 'cm' | 'm' | 'in'
): number {
  const toMm: Record<string, number> = {
    mm: 1,
    cm: 10,
    m: 1000,
    in: 25.4,
  };
  
  const mmValue = value * toMm[from];
  return mmValue / toMm[to];
}

/**
 * Measure the length of a line element
 */
export function measureLineLength(element: { start: Point3D; end: Point3D }): number {
  return calculateDistance(element.start, element.end);
}

/**
 * Measure the radius of a circle element
 */
export function measureCircleRadius(element: { radius: number }): number {
  return element.radius;
}

/**
 * Create a length constraint for a line element
 */
export function createLengthConstraint(
  elementId: string,
  length: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): DimensionalConstraint {
  return createConstraint('distance', length, {
    entity1: elementId,
    label: `${length.toFixed(2)}`,
    displayPosition: { x: offset.x, y: offset.y, z: 0 },
  });
}

/**
 * Create a radius constraint for a circle element
 */
export function createRadiusConstraint(
  elementId: string,
  radius: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): DimensionalConstraint {
  return createConstraint('radius', radius, {
    entity1: elementId,
    label: `R${radius.toFixed(2)}`,
    displayPosition: { x: offset.x, y: offset.y, z: 0 },
  });
}

/**
 * Create an angle constraint for two line elements
 */
export function createAngleConstraint(
  element1Id: string,
  element2Id: string,
  angle: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): DimensionalConstraint {
  return createConstraint('angle', angle, {
    entity1: element1Id,
    entity2: element2Id,
    label: `${angle.toFixed(0)}°`,
    displayPosition: { x: offset.x, y: offset.y, z: 0 },
  });
}

export default {
  createConstraint,
  updateConstraint,
  solveConstraints,
  checkOverDetermined,
  calculateDistance,
  calculateAngle,
  convertUnit,
  measureLineLength,
  measureCircleRadius,
  createLengthConstraint,
  createRadiusConstraint,
  createAngleConstraint,
};
