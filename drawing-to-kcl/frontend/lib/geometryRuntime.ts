/**
 * Build geometry spec from KCL code: parse primitives and operations
 * Supported:
 * - box(size: [...], center: [...])
 * - cylinder(radius: n, height: n, center: [...])
 * - sphere(radius: n, center: [...])
 * - cone(radius: n, height: n, center: [...])
 * - extrude(source.face.direction, distance: n)
 * - fillet(source.edge[n], radius: n)
 * - union(a, b), subtract(a, b), intersect(a, b)
 * - chamfer(source.edge[n], distance: n)
 * - revolve(profile, axis: [...], angle: n)
 * - linear_pattern(source, direction: [...], count: n, spacing: n)
 * - circular_pattern(source, axis: [...], center: [...], count: n)
 * - shell(source, thickness: n, open_faces: [...])
 */

import type { 
  GeometrySpec, 
  BoxSpec, 
  CylinderSpec, 
  SphereSpec, 
  ConeSpec,
  ExtrudeSpec,
  FilletSpec,
  BooleanSpec,
  BooleanOperation,
  ChamferSpec,
  RevolveSpec,
  LinearPatternSpec,
  CircularPatternSpec,
  ShellSpec,
  TorusSpec,
  HelixSpec,
  MirrorSpec,
  ScaleSpec,
  RotateSpec,
  TranslateSpec,
  SweepSpec,
  LoftSpec,
  DraftSpec
} from '@/lib/types/geometrySpec';

// ═══════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════

// Box: let name = box(size: [x, y, z], center: [x, y, z])
const BOX_REG =
  /let\s+(\w+)\s*=\s*box\s*\(\s*size\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Box simple: let name = box(width, height, depth) - center defaults to [0, height/2, 0]
const BOX_SIMPLE_REG =
  /let\s+(\w+)\s*=\s*box\s*\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)/gi;

// Cylinder: let name = cylinder(radius: n, height: n, center: [x, y, z])
const CYLINDER_REG =
  /let\s+(\w+)\s*=\s*cylinder\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*height\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Cylinder simple: let name = cylinder(radius, height) - center defaults to [0, height/2, 0]
const CYLINDER_SIMPLE_REG =
  /let\s+(\w+)\s*=\s*cylinder\s*\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)/gi;

// Sphere: let name = sphere(radius: n, center: [x, y, z])
const SPHERE_REG =
  /let\s+(\w+)\s*=\s*sphere\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Sphere simple: let name = sphere(radius) - center defaults to [0, radius, 0]
const SPHERE_SIMPLE_REG =
  /let\s+(\w+)\s*=\s*sphere\s*\(\s*([-\d.e]+)\s*\)/gi;

// Cone: let name = cone(radius: n, height: n, center: [x, y, z])
const CONE_REG =
  /let\s+(\w+)\s*=\s*cone\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*height\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Cone simple: let name = cone(radius, height) - center defaults to [0, height/2, 0]
const CONE_SIMPLE_REG =
  /let\s+(\w+)\s*=\s*cone\s*\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)/gi;

// Extrude: let name = extrude(source.face.direction, distance: n)
const EXTRUDE_REG =
  /let\s+(\w+)\s*=\s*extrude\s*\(\s*(\w+)\.face\.(top|bottom|left|right|front|back)\s*,\s*distance\s*:\s*([-\d.e]+)\s*\)/gi;

// Fillet: let name = fillet(source.edge[n], radius: n, segments: n?)
// segments is optional
const FILLET_REG =
  /let\s+(\w+)\s*=\s*fillet\s*\(\s*(\w+)\.edge\[(\d+)\]\s*,\s*radius\s*:\s*([-\d.e]+)(?:\s*,\s*segments\s*:\s*(\d+))?\s*\)/gi;

// Geom comment for inline definitions
const GEOM_COMMENT = /#\s*geom:\s*(.+)/gi;

// Boolean operations: let name = union(a, b) / subtract(a, b) / intersect(a, b)
const UNION_REG = 
  /let\s+(\w+)\s*=\s*union\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;
const SUBTRACT_REG = 
  /let\s+(\w+)\s*=\s*subtract\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;
const INTERSECT_REG = 
  /let\s+(\w+)\s*=\s*intersect\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;

// Chamfer: let name = chamfer(source.edge[n], distance: n)
const CHAMFER_REG =
  /let\s+(\w+)\s*=\s*chamfer\s*\(\s*(\w+)\.edge\[(\d+)\]\s*,\s*distance\s*:\s*([-\d.e]+)\s*\)/gi;

// Revolve: let name = revolve(profile, axis: [x,y,z], angle: n, center: [x,y,z]?)
// Simplified: revolve with inline profile points
const REVOLVE_REG =
  /let\s+(\w+)\s*=\s*revolve\s*\(\s*\[\s*((?:\[\s*[-\d.e]+\s*,\s*[-\d.e]+\s*\]\s*,?\s*)+)\]\s*,\s*axis\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*,\s*angle\s*:\s*([-\d.e]+)(?:\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\])?\s*\)/gi;

// Linear pattern: let name = linear_pattern(source, direction: [x,y,z], count: n, spacing: n)
const LINEAR_PATTERN_REG =
  /let\s+(\w+)\s*=\s*linear_pattern\s*\(\s*(\w+)\s*,\s*direction\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*,\s*count\s*:\s*(\d+)\s*,\s*spacing\s*:\s*([-\d.e]+)\s*\)/gi;

// Circular pattern: let name = circular_pattern(source, axis: [x,y,z], center: [x,y,z], count: n, angle: n?)
const CIRCULAR_PATTERN_REG =
  /let\s+(\w+)\s*=\s*circular_pattern\s*\(\s*(\w+)\s*,\s*axis\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*,\s*count\s*:\s*(\d+)(?:\s*,\s*angle\s*:\s*([-\d.e]+))?\s*\)/gi;

// Shell: let name = shell(source, thickness: n, open_faces: [n, ...]?)
const SHELL_REG =
  /let\s+(\w+)\s*=\s*shell\s*\(\s*(\w+)\s*,\s*thickness\s*:\s*([-\d.e]+)(?:\s*,\s*open_faces\s*:\s*\[\s*([\d,\s]*)\])?\s*\)/gi;

// Torus: let name = torus(major_radius: n, minor_radius: n, center: [x,y,z])
const TORUS_REG =
  /let\s+(\w+)\s*=\s*torus\s*\(\s*major_radius\s*:\s*([-\d.e]+)\s*,\s*minor_radius\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*\)/gi;

// Helix: let name = helix(radius: n, pitch: n, turns: n, tube_radius: n, center: [x,y,z])
const HELIX_REG =
  /let\s+(\w+)\s*=\s*helix\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*pitch\s*:\s*([-\d.e]+)\s*,\s*turns\s*:\s*([-\d.e]+)\s*,\s*tube_radius\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*\)/gi;

// Mirror: let name = mirror(source, plane: 'yz')
const MIRROR_REG =
  /let\s+(\w+)\s*=\s*mirror\s*\(\s*(\w+)\s*,\s*plane\s*:\s*['"]?(xy|xz|yz)['"]?\s*\)/gi;

// Scale: let name = scale(source, factor: n) or scale(source, factor: [x,y,z])
const SCALE_REG =
  /let\s+(\w+)\s*=\s*scale\s*\(\s*(\w+)\s*,\s*factor\s*:\s*([-\d.e]+|\[\s*[-\d.e]+\s*,\s*[-\d.e]+\s*,\s*[-\d.e]+\s*\])\s*\)/gi;

// Rotate: let name = rotate(source, axis: [x,y,z], angle: n)
const ROTATE_REG =
  /let\s+(\w+)\s*=\s*rotate\s*\(\s*(\w+)\s*,\s*axis\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*,\s*angle\s*:\s*([-\d.e]+)\s*\)/gi;

// Translate: let name = translate(source, offset: [x,y,z])
const TRANSLATE_REG =
  /let\s+(\w+)\s*=\s*translate\s*\(\s*(\w+)\s*,\s*offset\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]\s*\)/gi;

// Sweep: let name = sweep(profile: circle|rect, size: n|[w,h], path: [[x,y,z], ...])
const SWEEP_REG =
  /let\s+(\w+)\s*=\s*sweep\s*\(\s*profile\s*:\s*['"]?(circle|rect)['"]?\s*,\s*size\s*:\s*([-\d.e]+|\[\s*[-\d.e]+\s*,\s*[-\d.e]+\s*\])\s*,\s*path\s*:\s*(\[\s*\[[\d\s,.\-e\[\]]+\]\s*\])\s*\)/gi;

// Loft: let name = loft(profiles: [...])
const LOFT_REG =
  /let\s+(\w+)\s*=\s*loft\s*\(\s*profiles\s*:\s*(\[[\s\S]*?\])\s*\)/gi;

// Draft: let name = draft(source, angle: n)
const DRAFT_REG =
  /let\s+(\w+)\s*=\s*draft\s*\(\s*(\w+)\s*,\s*angle\s*:\s*([-\d.e]+)\s*\)/gi;

// ═══════════════════════════════════════════════════════════════
// PARSE HELPERS
// ═══════════════════════════════════════════════════════════════

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractBoxFromLine(line: string): BoxSpec | null {
  // Try full syntax first
  BOX_REG.lastIndex = 0;
  const m = BOX_REG.exec(line);
  if (m) {
    const [, name, s1, s2, s3, c1, c2, c3] = m;
    if (!name) return null;
    const size: [number, number, number] = [parseNum(s1!), parseNum(s2!), parseNum(s3!)];
    const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
    if (size.some(Number.isNaN) || center.some(Number.isNaN)) return null;
    return { id: `solid:${name}`, size, center };
  }
  
  // Try simple syntax: let name = box(width, height, depth)
  BOX_SIMPLE_REG.lastIndex = 0;
  const ms = BOX_SIMPLE_REG.exec(line);
  if (ms) {
    const [, name, w, h, d] = ms;
    if (!name) return null;
    const width = parseNum(w!);
    const height = parseNum(h!);
    const depth = parseNum(d!);
    if ([width, height, depth].some(Number.isNaN)) return null;
    // Default center: object sits on ground plane, centered on X and Z
    const center: [number, number, number] = [0, height / 2, 0];
    return { id: `solid:${name}`, size: [width, height, depth], center };
  }
  
  return null;
}

function extractCylinderFromLine(line: string): CylinderSpec | null {
  // Try full syntax first
  CYLINDER_REG.lastIndex = 0;
  const m = CYLINDER_REG.exec(line);
  if (m) {
    const [, name, r, h, c1, c2, c3] = m;
    if (!name) return null;
    const radius = parseNum(r!);
    const height = parseNum(h!);
    const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
    if (Number.isNaN(radius) || Number.isNaN(height) || center.some(Number.isNaN)) return null;
    return { id: `solid:${name}`, radius, height, center };
  }
  
  // Try simple syntax: let name = cylinder(radius, height)
  CYLINDER_SIMPLE_REG.lastIndex = 0;
  const ms = CYLINDER_SIMPLE_REG.exec(line);
  if (ms) {
    const [, name, r, h] = ms;
    if (!name) return null;
    const radius = parseNum(r!);
    const height = parseNum(h!);
    if (Number.isNaN(radius) || Number.isNaN(height)) return null;
    // Default center: cylinder sits on ground plane
    const center: [number, number, number] = [0, height / 2, 0];
    return { id: `solid:${name}`, radius, height, center };
  }
  
  return null;
}

function extractSphereFromLine(line: string): SphereSpec | null {
  // Try full syntax first
  SPHERE_REG.lastIndex = 0;
  const m = SPHERE_REG.exec(line);
  if (m) {
    const [, name, r, c1, c2, c3] = m;
    if (!name) return null;
    const radius = parseNum(r!);
    const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
    if (Number.isNaN(radius) || center.some(Number.isNaN)) return null;
    return { id: `solid:${name}`, radius, center };
  }
  
  // Try simple syntax: let name = sphere(radius)
  SPHERE_SIMPLE_REG.lastIndex = 0;
  const ms = SPHERE_SIMPLE_REG.exec(line);
  if (ms) {
    const [, name, r] = ms;
    if (!name) return null;
    const radius = parseNum(r!);
    if (Number.isNaN(radius)) return null;
    // Default center: sphere sits on ground plane
    const center: [number, number, number] = [0, radius, 0];
    return { id: `solid:${name}`, radius, center };
  }
  
  return null;
}

function extractConeFromLine(line: string): ConeSpec | null {
  // Try full syntax first
  CONE_REG.lastIndex = 0;
  const m = CONE_REG.exec(line);
  if (m) {
    const [, name, r, h, c1, c2, c3] = m;
    if (!name) return null;
    const radius = parseNum(r!);
    const height = parseNum(h!);
    const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
    if (Number.isNaN(radius) || Number.isNaN(height) || center.some(Number.isNaN)) return null;
    return { id: `solid:${name}`, radius, height, center };
  }
  
  // Try simple syntax: let name = cone(radius, height)
  CONE_SIMPLE_REG.lastIndex = 0;
  const ms = CONE_SIMPLE_REG.exec(line);
  if (ms) {
    const [, name, r, h] = ms;
    if (!name) return null;
    const radius = parseNum(r!);
    const height = parseNum(h!);
    if (Number.isNaN(radius) || Number.isNaN(height)) return null;
    // Default center: cone sits on ground plane
    const center: [number, number, number] = [0, height / 2, 0];
    return { id: `solid:${name}`, radius, height, center };
  }
  
  return null;
}

function extractExtrudeFromLine(line: string): ExtrudeSpec | null {
  EXTRUDE_REG.lastIndex = 0;
  const m = EXTRUDE_REG.exec(line);
  if (!m) return null;
  const [, name, source, face, dist] = m;
  if (!name || !source || !face) return null;
  const distance = parseNum(dist!);
  if (Number.isNaN(distance)) return null;
  return { 
    id: `solid:${name}`, 
    sourceId: `solid:${source}`, 
    face: face as 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
    distance 
  };
}

function extractFilletFromLine(line: string): FilletSpec | null {
  FILLET_REG.lastIndex = 0;
  const m = FILLET_REG.exec(line);
  if (!m) return null;
  const [, name, source, edgeIdx, r, seg] = m;
  if (!name || !source) return null;
  const edgeIndex = parseInt(edgeIdx!, 10);
  const radius = parseNum(r!);
  if (Number.isNaN(edgeIndex) || Number.isNaN(radius)) return null;
  
  const segments = seg ? parseInt(seg, 10) : undefined;
  
  return { 
    id: `solid:${name}`, 
    sourceId: `solid:${source}`, 
    edgeIndex, 
    radius,
    segments: Number.isFinite(segments) ? segments : undefined
  };
}

function extractBooleanFromLine(line: string): BooleanSpec | null {
  // Try union
  UNION_REG.lastIndex = 0;
  let m = UNION_REG.exec(line);
  if (m) {
    const [, name, a, b] = m;
    if (name && a && b) {
      return {
        id: `solid:${name}`,
        operation: 'union' as BooleanOperation,
        sourceAId: `solid:${a}`,
        sourceBId: `solid:${b}`,
      };
    }
  }
  
  // Try subtract
  SUBTRACT_REG.lastIndex = 0;
  m = SUBTRACT_REG.exec(line);
  if (m) {
    const [, name, a, b] = m;
    if (name && a && b) {
      return {
        id: `solid:${name}`,
        operation: 'subtract' as BooleanOperation,
        sourceAId: `solid:${a}`,
        sourceBId: `solid:${b}`,
      };
    }
  }
  
  // Try intersect
  INTERSECT_REG.lastIndex = 0;
  m = INTERSECT_REG.exec(line);
  if (m) {
    const [, name, a, b] = m;
    if (name && a && b) {
      return {
        id: `solid:${name}`,
        operation: 'intersect' as BooleanOperation,
        sourceAId: `solid:${a}`,
        sourceBId: `solid:${b}`,
      };
    }
  }
  
  return null;
}

function extractChamferFromLine(line: string): ChamferSpec | null {
  CHAMFER_REG.lastIndex = 0;
  const m = CHAMFER_REG.exec(line);
  if (!m) return null;
  const [, name, source, edgeIdx, d] = m;
  if (!name || !source) return null;
  const edgeIndex = parseInt(edgeIdx!, 10);
  const distance = parseNum(d!);
  if (Number.isNaN(edgeIndex) || Number.isNaN(distance)) return null;
  
  return { 
    id: `solid:${name}`, 
    sourceId: `solid:${source}`, 
    edgeIndex, 
    distance 
  };
}

function extractRevolveFromLine(line: string): RevolveSpec | null {
  REVOLVE_REG.lastIndex = 0;
  const m = REVOLVE_REG.exec(line);
  if (!m) return null;
  const [, name, profileStr, ax, ay, az, angle, cx, cy, cz] = m;
  if (!name || !profileStr) return null;
  
  // Parse profile points
  const pointMatches = profileStr.matchAll(/\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\]/g);
  const profile: [number, number][] = [];
  for (const pm of pointMatches) {
    const x = parseNum(pm[1]);
    const y = parseNum(pm[2]);
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      profile.push([x, y]);
    }
  }
  
  if (profile.length < 2) return null;
  
  const axis: [number, number, number] = [parseNum(ax!), parseNum(ay!), parseNum(az!)];
  const angleVal = parseNum(angle!);
  
  if (axis.some(Number.isNaN) || Number.isNaN(angleVal)) return null;
  
  const center: [number, number, number] = cx && cy && cz 
    ? [parseNum(cx), parseNum(cy), parseNum(cz)]
    : [0, 0, 0];
  
  return {
    id: `solid:${name}`,
    profile,
    axis,
    center,
    angle: angleVal,
  };
}

function extractLinearPatternFromLine(line: string): LinearPatternSpec | null {
  LINEAR_PATTERN_REG.lastIndex = 0;
  const m = LINEAR_PATTERN_REG.exec(line);
  if (!m) return null;
  const [, name, source, dx, dy, dz, countStr, spacingStr] = m;
  if (!name || !source) return null;
  
  const direction: [number, number, number] = [parseNum(dx!), parseNum(dy!), parseNum(dz!)];
  const count = parseInt(countStr!, 10);
  const spacing = parseNum(spacingStr!);
  
  if (direction.some(Number.isNaN) || Number.isNaN(count) || Number.isNaN(spacing)) return null;
  
  return {
    id: `solid:${name}`,
    sourceId: `solid:${source}`,
    direction,
    count,
    spacing,
  };
}

function extractCircularPatternFromLine(line: string): CircularPatternSpec | null {
  CIRCULAR_PATTERN_REG.lastIndex = 0;
  const m = CIRCULAR_PATTERN_REG.exec(line);
  if (!m) return null;
  const [, name, source, ax, ay, az, cx, cy, cz, countStr, angleStr] = m;
  if (!name || !source) return null;
  
  const axis: [number, number, number] = [parseNum(ax!), parseNum(ay!), parseNum(az!)];
  const center: [number, number, number] = [parseNum(cx!), parseNum(cy!), parseNum(cz!)];
  const count = parseInt(countStr!, 10);
  
  if (axis.some(Number.isNaN) || center.some(Number.isNaN) || Number.isNaN(count)) return null;
  
  const angle = angleStr ? parseNum(angleStr) : 360;
  
  return {
    id: `solid:${name}`,
    sourceId: `solid:${source}`,
    axis,
    center,
    count,
    angle: Number.isFinite(angle) ? angle : 360,
  };
}

function extractShellFromLine(line: string): ShellSpec | null {
  SHELL_REG.lastIndex = 0;
  const m = SHELL_REG.exec(line);
  if (!m) return null;
  const [, name, source, thicknessStr, openFacesStr] = m;
  if (!name || !source) return null;
  
  const thickness = parseNum(thicknessStr!);
  if (Number.isNaN(thickness)) return null;
  
  let openFaces: number[] | undefined;
  if (openFacesStr && openFacesStr.trim()) {
    openFaces = openFacesStr.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !Number.isNaN(n));
  }
  
  return {
    id: `solid:${name}`,
    sourceId: `solid:${source}`,
    thickness,
    openFaces,
  };
}

function extractTorusFromLine(line: string): TorusSpec | null {
  TORUS_REG.lastIndex = 0;
  const m = TORUS_REG.exec(line);
  if (!m) return null;
  const [, name, major, minor, cx, cy, cz] = m;
  if (!name) return null;
  
  const majorRadius = parseNum(major!);
  const minorRadius = parseNum(minor!);
  const center: [number, number, number] = [parseNum(cx!), parseNum(cy!), parseNum(cz!)];
  
  if (Number.isNaN(majorRadius) || Number.isNaN(minorRadius) || center.some(Number.isNaN)) return null;
  
  return { id: `solid:${name}`, majorRadius, minorRadius, center };
}

function extractHelixFromLine(line: string): HelixSpec | null {
  HELIX_REG.lastIndex = 0;
  const m = HELIX_REG.exec(line);
  if (!m) return null;
  const [, name, r, p, t, tr, cx, cy, cz] = m;
  if (!name) return null;
  
  const radius = parseNum(r!);
  const pitch = parseNum(p!);
  const turns = parseNum(t!);
  const tubeRadius = parseNum(tr!);
  const center: [number, number, number] = [parseNum(cx!), parseNum(cy!), parseNum(cz!)];
  
  if ([radius, pitch, turns, tubeRadius].some(Number.isNaN) || center.some(Number.isNaN)) return null;
  
  return { id: `solid:${name}`, radius, pitch, turns, tubeRadius, center };
}

function extractMirrorFromLine(line: string): MirrorSpec | null {
  MIRROR_REG.lastIndex = 0;
  const m = MIRROR_REG.exec(line);
  if (!m) return null;
  const [, name, source, plane] = m;
  if (!name || !source || !plane) return null;
  
  return {
    id: `solid:${name}`,
    sourceId: `solid:${source}`,
    plane: plane as 'xy' | 'xz' | 'yz',
    keepOriginal: true,
  };
}

function extractScaleFromLine(line: string): ScaleSpec | null {
  SCALE_REG.lastIndex = 0;
  const m = SCALE_REG.exec(line);
  if (!m) return null;
  const [, name, source, factorStr] = m;
  if (!name || !source || !factorStr) return null;
  
  let scale: number | [number, number, number];
  if (factorStr.startsWith('[')) {
    const parts = factorStr.replace(/[\[\]]/g, '').split(',').map(s => parseNum(s.trim()));
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    scale = parts as [number, number, number];
  } else {
    scale = parseNum(factorStr);
    if (Number.isNaN(scale)) return null;
  }
  
  return { id: `solid:${name}`, sourceId: `solid:${source}`, scale };
}

function extractRotateFromLine(line: string): RotateSpec | null {
  ROTATE_REG.lastIndex = 0;
  const m = ROTATE_REG.exec(line);
  if (!m) return null;
  const [, name, source, ax, ay, az, angleStr] = m;
  if (!name || !source) return null;
  
  const axis: [number, number, number] = [parseNum(ax!), parseNum(ay!), parseNum(az!)];
  const angle = parseNum(angleStr!);
  
  if (axis.some(Number.isNaN) || Number.isNaN(angle)) return null;
  
  return { id: `solid:${name}`, sourceId: `solid:${source}`, axis, angle };
}

function extractTranslateFromLine(line: string): TranslateSpec | null {
  TRANSLATE_REG.lastIndex = 0;
  const m = TRANSLATE_REG.exec(line);
  if (!m) return null;
  const [, name, source, ox, oy, oz] = m;
  if (!name || !source) return null;
  
  const offset: [number, number, number] = [parseNum(ox!), parseNum(oy!), parseNum(oz!)];
  
  if (offset.some(Number.isNaN)) return null;
  
  return { id: `solid:${name}`, sourceId: `solid:${source}`, offset };
}

function extractSweepFromLine(line: string): SweepSpec | null {
  SWEEP_REG.lastIndex = 0;
  const m = SWEEP_REG.exec(line);
  if (!m) return null;
  const [, name, profile, sizeStr, pathStr] = m;
  if (!name || !profile || !sizeStr || !pathStr) return null;
  
  // Parse size
  let profileSize: number | [number, number];
  if (sizeStr.startsWith('[')) {
    const parts = sizeStr.replace(/[\[\]]/g, '').split(',').map(s => parseNum(s.trim()));
    if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
    profileSize = parts as [number, number];
  } else {
    profileSize = parseNum(sizeStr);
    if (Number.isNaN(profileSize)) return null;
  }
  
  // Parse path - array of [x,y,z] points
  try {
    const path = JSON.parse(pathStr) as [number, number, number][];
    if (!Array.isArray(path) || path.length < 2) return null;
    
    return {
      id: `solid:${name}`,
      profile: profile as 'circle' | 'rect',
      profileSize,
      path,
    };
  } catch {
    return null;
  }
}

function extractLoftFromLine(line: string): LoftSpec | null {
  LOFT_REG.lastIndex = 0;
  const m = LOFT_REG.exec(line);
  if (!m) return null;
  const [, name, profilesStr] = m;
  if (!name || !profilesStr) return null;
  
  try {
    const profiles = JSON.parse(profilesStr);
    if (!Array.isArray(profiles) || profiles.length < 2) return null;
    
    return { id: `solid:${name}`, profiles };
  } catch {
    return null;
  }
}

function extractDraftFromLine(line: string): DraftSpec | null {
  DRAFT_REG.lastIndex = 0;
  const m = DRAFT_REG.exec(line);
  if (!m) return null;
  const [, name, source, angleStr] = m;
  if (!name || !source) return null;
  
  const angle = parseNum(angleStr!);
  if (Number.isNaN(angle)) return null;
  
  return { id: `solid:${name}`, sourceId: `solid:${source}`, angle };
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function buildGeometrySpecFromKcl(kclCode: string): GeometrySpec {
  const artifacts: string[] = [];
  const boxes: BoxSpec[] = [];
  const cylinders: CylinderSpec[] = [];
  const spheres: SphereSpec[] = [];
  const cones: ConeSpec[] = [];
  const extrudes: ExtrudeSpec[] = [];
  const fillets: FilletSpec[] = [];
  const booleans: BooleanSpec[] = [];
  const chamfers: ChamferSpec[] = [];
  const revolves: RevolveSpec[] = [];
  const linearPatterns: LinearPatternSpec[] = [];
  const circularPatterns: CircularPatternSpec[] = [];
  const shells: ShellSpec[] = [];
  const toruses: TorusSpec[] = [];
  const helixes: HelixSpec[] = [];
  const mirrors: MirrorSpec[] = [];
  const scales: ScaleSpec[] = [];
  const rotates: RotateSpec[] = [];
  const translates: TranslateSpec[] = [];
  const sweeps: SweepSpec[] = [];
  const lofts: LoftSpec[] = [];
  const drafts: DraftSpec[] = [];
  const seen = new Set<string>();

  const lines = kclCode.split('\n');
  
  for (const line of lines) {
    // Try to parse each primitive type
    
    // Box
    const box = extractBoxFromLine(line);
    if (box && !seen.has(box.id)) {
      seen.add(box.id);
      artifacts.push(box.id);
      boxes.push(box);
      continue;
    }
    
    // Cylinder
    const cyl = extractCylinderFromLine(line);
    if (cyl && !seen.has(cyl.id)) {
      seen.add(cyl.id);
      artifacts.push(cyl.id);
      cylinders.push(cyl);
      continue;
    }
    
    // Sphere
    const sphere = extractSphereFromLine(line);
    if (sphere && !seen.has(sphere.id)) {
      seen.add(sphere.id);
      artifacts.push(sphere.id);
      spheres.push(sphere);
      continue;
    }
    
    // Cone
    const cone = extractConeFromLine(line);
    if (cone && !seen.has(cone.id)) {
      seen.add(cone.id);
      artifacts.push(cone.id);
      cones.push(cone);
      continue;
    }
    
    // Extrude
    const ext = extractExtrudeFromLine(line);
    if (ext && !seen.has(ext.id)) {
      seen.add(ext.id);
      extrudes.push(ext);
      continue;
    }
    
    // Fillet
    const fillet = extractFilletFromLine(line);
    if (fillet && !seen.has(fillet.id)) {
      seen.add(fillet.id);
      fillets.push(fillet);
      continue;
    }
    
    // Boolean operations
    const bool = extractBooleanFromLine(line);
    if (bool && !seen.has(bool.id)) {
      seen.add(bool.id);
      booleans.push(bool);
      continue;
    }
    
    // Chamfer
    const chamfer = extractChamferFromLine(line);
    if (chamfer && !seen.has(chamfer.id)) {
      seen.add(chamfer.id);
      chamfers.push(chamfer);
      continue;
    }
    
    // Revolve
    const revolve = extractRevolveFromLine(line);
    if (revolve && !seen.has(revolve.id)) {
      seen.add(revolve.id);
      artifacts.push(revolve.id);
      revolves.push(revolve);
      continue;
    }
    
    // Linear pattern
    const linPattern = extractLinearPatternFromLine(line);
    if (linPattern && !seen.has(linPattern.id)) {
      seen.add(linPattern.id);
      linearPatterns.push(linPattern);
      continue;
    }
    
    // Circular pattern
    const circPattern = extractCircularPatternFromLine(line);
    if (circPattern && !seen.has(circPattern.id)) {
      seen.add(circPattern.id);
      circularPatterns.push(circPattern);
      continue;
    }
    
    // Shell
    const shell = extractShellFromLine(line);
    if (shell && !seen.has(shell.id)) {
      seen.add(shell.id);
      shells.push(shell);
      continue;
    }
    
    // Torus
    const tor = extractTorusFromLine(line);
    if (tor && !seen.has(tor.id)) {
      seen.add(tor.id);
      artifacts.push(tor.id);
      toruses.push(tor);
      continue;
    }
    
    // Helix
    const hel = extractHelixFromLine(line);
    if (hel && !seen.has(hel.id)) {
      seen.add(hel.id);
      artifacts.push(hel.id);
      helixes.push(hel);
      continue;
    }
    
    // Mirror
    const mir = extractMirrorFromLine(line);
    if (mir && !seen.has(mir.id)) {
      seen.add(mir.id);
      mirrors.push(mir);
      continue;
    }
    
    // Scale
    const scl = extractScaleFromLine(line);
    if (scl && !seen.has(scl.id)) {
      seen.add(scl.id);
      scales.push(scl);
      continue;
    }
    
    // Rotate
    const rot = extractRotateFromLine(line);
    if (rot && !seen.has(rot.id)) {
      seen.add(rot.id);
      rotates.push(rot);
      continue;
    }
    
    // Translate
    const trans = extractTranslateFromLine(line);
    if (trans && !seen.has(trans.id)) {
      seen.add(trans.id);
      translates.push(trans);
      continue;
    }
    
    // Sweep
    const swp = extractSweepFromLine(line);
    if (swp && !seen.has(swp.id)) {
      seen.add(swp.id);
      artifacts.push(swp.id);
      sweeps.push(swp);
      continue;
    }
    
    // Loft
    const lft = extractLoftFromLine(line);
    if (lft && !seen.has(lft.id)) {
      seen.add(lft.id);
      artifacts.push(lft.id);
      lofts.push(lft);
      continue;
    }
    
    // Draft
    const dft = extractDraftFromLine(line);
    if (dft && !seen.has(dft.id)) {
      seen.add(dft.id);
      drafts.push(dft);
      continue;
    }
  }

  // Also check geom comments
  GEOM_COMMENT.lastIndex = 0;
  let geomMatch: RegExpExecArray | null;
  while ((geomMatch = GEOM_COMMENT.exec(kclCode)) !== null) {
    const inner = geomMatch[1].trim();
    
    const box = extractBoxFromLine(inner);
    if (box && !seen.has(box.id)) {
      seen.add(box.id);
      artifacts.push(box.id);
      boxes.push(box);
      continue;
    }
    
    const cyl = extractCylinderFromLine(inner);
    if (cyl && !seen.has(cyl.id)) {
      seen.add(cyl.id);
      artifacts.push(cyl.id);
      cylinders.push(cyl);
      continue;
    }
    
    const sphere = extractSphereFromLine(inner);
    if (sphere && !seen.has(sphere.id)) {
      seen.add(sphere.id);
      artifacts.push(sphere.id);
      spheres.push(sphere);
      continue;
    }
    
    const cone = extractConeFromLine(inner);
    if (cone && !seen.has(cone.id)) {
      seen.add(cone.id);
      artifacts.push(cone.id);
      cones.push(cone);
    }
  }

  return { 
    artifacts, 
    boxes, 
    cylinders, 
    spheres, 
    cones, 
    extrudes, 
    fillets,
    booleans,
    chamfers,
    revolves,
    linearPatterns,
    circularPatterns,
    shells,
    toruses,
    helixes,
    mirrors,
    scales,
    rotates,
    translates,
    sweeps,
    lofts,
    drafts
  };
}

// ═══════════════════════════════════════════════════════════════
// ERROR-AWARE PARSING
// ═══════════════════════════════════════════════════════════════

import { validateKCL, createError, type KCLError, type KCLParseResult } from './kclErrorHandler';

export interface GeometryParseResult {
  success: boolean;
  spec: GeometrySpec | null;
  errors: KCLError[];
  warnings: KCLError[];
  parsedLines: number;
  totalLines: number;
}

/**
 * KCL 코드를 파싱하고 에러 정보와 함께 결과 반환
 */
export function parseKCLWithErrors(kclCode: string): GeometryParseResult {
  const lines = kclCode.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
  const totalLines = lines.length;
  
  // 먼저 유효성 검사
  const validation = validateKCL(kclCode);
  
  if (!validation.success) {
    return {
      success: false,
      spec: null,
      errors: validation.errors,
      warnings: validation.warnings,
      parsedLines: 0,
      totalLines,
    };
  }
  
  // 파싱 시도
  try {
    const spec = buildGeometrySpecFromKcl(kclCode);
    
    // 아무것도 파싱되지 않은 경우 경고
    const warnings: KCLError[] = [];
    const parsedCount = spec.artifacts.length;
    
    if (parsedCount === 0 && totalLines > 0) {
      warnings.push(createError('PARSE_ERROR', 
        '인식된 도형이 없습니다. 문법을 확인하세요.', {
          suggestion: '예: let myBox = box(size: [10, 20, 30], center: [0, 0, 0]) 또는 let myBox = box(10, 20, 30)',
        }
      ));
    }
    
    return {
      success: parsedCount > 0 || totalLines === 0,
      spec,
      errors: [],
      warnings,
      parsedLines: parsedCount,
      totalLines,
    };
  } catch (error) {
    return {
      success: false,
      spec: null,
      errors: [createError('RUNTIME_ERROR', 
        error instanceof Error ? error.message : '알 수 없는 파싱 오류',
        { suggestion: 'KCL 문법을 확인하세요' }
      )],
      warnings: [],
      parsedLines: 0,
      totalLines,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS (STL/STEP)
// ═══════════════════════════════════════════════════════════════

export interface MeshData {
  vertices: number[][];
  indices: number[];
}

/**
 * Export mesh to STL format (ASCII)
 */
export function exportToSTL(meshes: MeshData[], name: string = 'model'): string {
  let stl = `solid ${name}\n`;
  
  for (const mesh of meshes) {
    const { vertices, indices } = mesh;
    
    for (let i = 0; i < indices.length; i += 3) {
      const v0 = vertices[indices[i]];
      const v1 = vertices[indices[i + 1]];
      const v2 = vertices[indices[i + 2]];
      
      if (!v0 || !v1 || !v2) continue;
      
      // Calculate face normal
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      
      stl += `  facet normal ${(nx/len).toExponential(6)} ${(ny/len).toExponential(6)} ${(nz/len).toExponential(6)}\n`;
      stl += `    outer loop\n`;
      stl += `      vertex ${v0[0].toExponential(6)} ${v0[1].toExponential(6)} ${v0[2].toExponential(6)}\n`;
      stl += `      vertex ${v1[0].toExponential(6)} ${v1[1].toExponential(6)} ${v1[2].toExponential(6)}\n`;
      stl += `      vertex ${v2[0].toExponential(6)} ${v2[1].toExponential(6)} ${v2[2].toExponential(6)}\n`;
      stl += `    endloop\n`;
      stl += `  endfacet\n`;
    }
  }
  
  stl += `endsolid ${name}\n`;
  return stl;
}

/**
 * Export mesh to binary STL format
 */
export function exportToSTLBinary(meshes: MeshData[]): ArrayBuffer {
  // Count total triangles
  let triangleCount = 0;
  for (const mesh of meshes) {
    triangleCount += mesh.indices.length / 3;
  }
  
  // Binary STL format:
  // 80 bytes header
  // 4 bytes triangle count (uint32)
  // For each triangle: 12 bytes normal, 36 bytes vertices (3x3 floats), 2 bytes attribute
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write header (80 bytes)
  const header = 'Binary STL exported from FORGE 3D Editor';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  
  // Write triangle count
  view.setUint32(80, triangleCount, true);
  
  let offset = 84;
  
  for (const mesh of meshes) {
    const { vertices, indices } = mesh;
    
    for (let i = 0; i < indices.length; i += 3) {
      const v0 = vertices[indices[i]];
      const v1 = vertices[indices[i + 1]];
      const v2 = vertices[indices[i + 2]];
      
      if (!v0 || !v1 || !v2) continue;
      
      // Calculate face normal
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      
      // Write normal
      view.setFloat32(offset, nx / len, true); offset += 4;
      view.setFloat32(offset, ny / len, true); offset += 4;
      view.setFloat32(offset, nz / len, true); offset += 4;
      
      // Write vertices
      view.setFloat32(offset, v0[0], true); offset += 4;
      view.setFloat32(offset, v0[1], true); offset += 4;
      view.setFloat32(offset, v0[2], true); offset += 4;
      
      view.setFloat32(offset, v1[0], true); offset += 4;
      view.setFloat32(offset, v1[1], true); offset += 4;
      view.setFloat32(offset, v1[2], true); offset += 4;
      
      view.setFloat32(offset, v2[0], true); offset += 4;
      view.setFloat32(offset, v2[1], true); offset += 4;
      view.setFloat32(offset, v2[2], true); offset += 4;
      
      // Attribute byte count (unused)
      view.setUint16(offset, 0, true); offset += 2;
    }
  }
  
  return buffer;
}

/**
 * Export to simplified STEP format (ISO 10303-21)
 * This is a basic implementation - real STEP files are much more complex
 */
export function exportToSTEP(meshes: MeshData[], name: string = 'model'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  
  let step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('FORGE 3D Export'), '2;1');
FILE_NAME('${name}.step', '${timestamp}', ('FORGE'), (''), '', '', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
`;
  
  let entityId = 1;
  const entities: string[] = [];
  
  // Create basic STEP structure
  entities.push(`#${entityId++} = APPLICATION_CONTEXT('automotive design');`);
  const appContextId = entityId - 1;
  
  entities.push(`#${entityId++} = APPLICATION_PROTOCOL_DEFINITION('international standard', 'automotive_design', 2000, #${appContextId});`);
  
  entities.push(`#${entityId++} = PRODUCT_CONTEXT('', #${appContextId}, 'mechanical');`);
  const productContextId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT('${name}', '${name}', '', (#${productContextId}));`);
  const productId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_FORMATION('', '', #${productId});`);
  const pdfId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_CONTEXT('part definition', #${appContextId}, 'design');`);
  const pdcId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION('design', '', #${pdfId}, #${pdcId});`);
  const pdId = entityId - 1;
  
  // Create geometry for each mesh
  for (const mesh of meshes) {
    const { vertices } = mesh;
    
    // Create CARTESIAN_POINT for each vertex
    const pointIds: number[] = [];
    for (const v of vertices) {
      entities.push(`#${entityId} = CARTESIAN_POINT('', (${v[0]}, ${v[1]}, ${v[2]}));`);
      pointIds.push(entityId++);
    }
    
    // Create a simple shell representation
    entities.push(`#${entityId++} = CLOSED_SHELL('', ());`);
  }
  
  // Add shape representation
  entities.push(`#${entityId++} = SHAPE_DEFINITION_REPRESENTATION(#${entityId}, #${entityId + 1});`);
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_SHAPE('', '', #${pdId});`);
  entities.push(`#${entityId++} = SHAPE_REPRESENTATION('', (), (LENGTH_UNIT(), PLANE_ANGLE_UNIT(), SOLID_ANGLE_UNIT()));`);
  
  step += entities.join('\n');
  step += '\nENDSEC;\nEND-ISO-10303-21;\n';
  
  return step;
}
