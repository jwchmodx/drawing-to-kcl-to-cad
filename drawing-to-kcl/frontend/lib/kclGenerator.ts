/**
 * KCL Code Generator
 * Generates KCL code from transforms and operations
 */

export interface TransformDelta {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/**
 * Generate transformed KCL code by applying transform delta
 */
export function generateTransformedKcl(
  kclCode: string,
  delta: TransformDelta
): string {
  const lines = kclCode.split('\n');
  const result: string[] = [];
  
  // Find the last defined solid name
  let lastSolidName: string | null = null;
  for (const line of lines) {
    const match = line.match(/let\s+(\w+)\s*=/);
    if (match) {
      lastSolidName = match[1];
    }
    result.push(line);
  }
  
  if (!lastSolidName) {
    return kclCode;
  }
  
  // Check if any transform is needed
  const hasTranslate = delta.position.some(v => Math.abs(v) > 0.001);
  const hasRotate = delta.rotation.some(v => Math.abs(v) > 0.001);
  const hasScale = delta.scale.some(v => Math.abs(v - 1) > 0.001);
  
  let currentName = lastSolidName;
  
  // Add translate if needed
  if (hasTranslate) {
    const newName = `${currentName}_translated`;
    result.push(
      `let ${newName} = translate(${currentName}, offset: [${delta.position[0].toFixed(3)}, ${delta.position[1].toFixed(3)}, ${delta.position[2].toFixed(3)}])`
    );
    currentName = newName;
  }
  
  // Add rotate if needed
  if (hasRotate) {
    // Apply rotation for each axis that has a non-zero value
    if (Math.abs(delta.rotation[0]) > 0.001) {
      const newName = `${currentName}_rotX`;
      result.push(
        `let ${newName} = rotate(${currentName}, axis: [1, 0, 0], angle: ${delta.rotation[0].toFixed(3)})`
      );
      currentName = newName;
    }
    if (Math.abs(delta.rotation[1]) > 0.001) {
      const newName = `${currentName}_rotY`;
      result.push(
        `let ${newName} = rotate(${currentName}, axis: [0, 1, 0], angle: ${delta.rotation[1].toFixed(3)})`
      );
      currentName = newName;
    }
    if (Math.abs(delta.rotation[2]) > 0.001) {
      const newName = `${currentName}_rotZ`;
      result.push(
        `let ${newName} = rotate(${currentName}, axis: [0, 0, 1], angle: ${delta.rotation[2].toFixed(3)})`
      );
      currentName = newName;
    }
  }
  
  // Add scale if needed
  if (hasScale) {
    const newName = `${currentName}_scaled`;
    const isUniform = 
      Math.abs(delta.scale[0] - delta.scale[1]) < 0.001 &&
      Math.abs(delta.scale[1] - delta.scale[2]) < 0.001;
    
    if (isUniform) {
      result.push(
        `let ${newName} = scale(${currentName}, factor: ${delta.scale[0].toFixed(3)})`
      );
    } else {
      result.push(
        `let ${newName} = scale(${currentName}, factor: [${delta.scale[0].toFixed(3)}, ${delta.scale[1].toFixed(3)}, ${delta.scale[2].toFixed(3)}])`
      );
    }
  }
  
  return result.join('\n');
}

/**
 * Update extrude height in KCL code
 */
export function updateExtrudeHeight(
  kclCode: string,
  heightDelta: number
): string {
  // Find extrude operations and update their distance
  const extrudeRegex = /extrude\s*\(\s*(\w+\.face\.\w+)\s*,\s*distance\s*:\s*([-\d.e]+)\s*\)/gi;
  
  return kclCode.replace(extrudeRegex, (match, face, currentHeight) => {
    const newHeight = parseFloat(currentHeight) + heightDelta;
    return `extrude(${face}, distance: ${newHeight.toFixed(3)})`;
  });
}

/**
 * Generate box KCL code
 */
export function generateBox(
  name: string,
  size: [number, number, number],
  center: [number, number, number] = [0, 0, 0]
): string {
  return `let ${name} = box(size: [${size[0]}, ${size[1]}, ${size[2]}], center: [${center[0]}, ${center[1]}, ${center[2]}])`;
}

/**
 * Generate cylinder KCL code
 */
export function generateCylinder(
  name: string,
  radius: number,
  height: number,
  center: [number, number, number] = [0, 0, 0]
): string {
  return `let ${name} = cylinder(radius: ${radius}, height: ${height}, center: [${center[0]}, ${center[1]}, ${center[2]}])`;
}

/**
 * Generate sphere KCL code
 */
export function generateSphere(
  name: string,
  radius: number,
  center: [number, number, number] = [0, 0, 0]
): string {
  return `let ${name} = sphere(radius: ${radius}, center: [${center[0]}, ${center[1]}, ${center[2]}])`;
}

/**
 * Generate cone KCL code
 */
export function generateCone(
  name: string,
  radius: number,
  height: number,
  center: [number, number, number] = [0, 0, 0]
): string {
  return `let ${name} = cone(radius: ${radius}, height: ${height}, center: [${center[0]}, ${center[1]}, ${center[2]}])`;
}

/**
 * Generate union operation KCL code
 */
export function generateUnion(resultName: string, a: string, b: string): string {
  return `let ${resultName} = union(${a}, ${b})`;
}

/**
 * Generate subtract operation KCL code
 */
export function generateSubtract(resultName: string, a: string, b: string): string {
  return `let ${resultName} = subtract(${a}, ${b})`;
}

/**
 * Generate intersect operation KCL code
 */
export function generateIntersect(resultName: string, a: string, b: string): string {
  return `let ${resultName} = intersect(${a}, ${b})`;
}

/**
 * Generate extrude operation KCL code
 */
export function generateExtrude(
  resultName: string,
  source: string,
  face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
  distance: number
): string {
  return `let ${resultName} = extrude(${source}.face.${face}, distance: ${distance})`;
}

/**
 * Generate fillet operation KCL code
 */
export function generateFillet(
  resultName: string,
  source: string,
  edgeIndex: number,
  radius: number
): string {
  return `let ${resultName} = fillet(${source}.edge[${edgeIndex}], radius: ${radius})`;
}

/**
 * Generate chamfer operation KCL code
 */
export function generateChamfer(
  resultName: string,
  source: string,
  edgeIndex: number,
  distance: number
): string {
  return `let ${resultName} = chamfer(${source}.edge[${edgeIndex}], distance: ${distance})`;
}

export default {
  generateTransformedKcl,
  updateExtrudeHeight,
  generateBox,
  generateCylinder,
  generateSphere,
  generateCone,
  generateUnion,
  generateSubtract,
  generateIntersect,
  generateExtrude,
  generateFillet,
  generateChamfer,
};
