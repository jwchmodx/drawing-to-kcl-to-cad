/**
 * Material Presets for Forge 3D CAD
 * Defines preset materials with PBR properties
 */

export interface MaterialProperties {
  color: string;          // Hex color
  metalness: number;      // 0-1
  roughness: number;      // 0-1
  opacity: number;        // 0-1
  transparent: boolean;
  emissive?: string;      // Hex color for emission
  emissiveIntensity?: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  category: MaterialCategory;
  properties: MaterialProperties;
  thumbnail?: string;     // For future UI thumbnails
}

export type MaterialCategory = 
  | 'metal'
  | 'plastic'
  | 'wood'
  | 'glass'
  | 'rubber'
  | 'custom';

// ═══════════════════════════════════════════════════════════════
// METAL PRESETS
// ═══════════════════════════════════════════════════════════════

export const STEEL: MaterialPreset = {
  id: 'metal-steel',
  name: 'Steel',
  category: 'metal',
  properties: {
    color: '#8a8a8a',
    metalness: 0.9,
    roughness: 0.4,
    opacity: 1,
    transparent: false,
  },
};

export const ALUMINUM: MaterialPreset = {
  id: 'metal-aluminum',
  name: 'Aluminum',
  category: 'metal',
  properties: {
    color: '#d4d4d4',
    metalness: 0.85,
    roughness: 0.35,
    opacity: 1,
    transparent: false,
  },
};

export const COPPER: MaterialPreset = {
  id: 'metal-copper',
  name: 'Copper',
  category: 'metal',
  properties: {
    color: '#b87333',
    metalness: 0.95,
    roughness: 0.3,
    opacity: 1,
    transparent: false,
  },
};

export const GOLD: MaterialPreset = {
  id: 'metal-gold',
  name: 'Gold',
  category: 'metal',
  properties: {
    color: '#ffd700',
    metalness: 1.0,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
};

export const BRONZE: MaterialPreset = {
  id: 'metal-bronze',
  name: 'Bronze',
  category: 'metal',
  properties: {
    color: '#cd7f32',
    metalness: 0.9,
    roughness: 0.45,
    opacity: 1,
    transparent: false,
  },
};

export const CHROME: MaterialPreset = {
  id: 'metal-chrome',
  name: 'Chrome',
  category: 'metal',
  properties: {
    color: '#e8e8e8',
    metalness: 1.0,
    roughness: 0.1,
    opacity: 1,
    transparent: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// PLASTIC PRESETS
// ═══════════════════════════════════════════════════════════════

export const PLASTIC_MATTE: MaterialPreset = {
  id: 'plastic-matte',
  name: 'Matte Plastic',
  category: 'plastic',
  properties: {
    color: '#4a4a4a',
    metalness: 0.0,
    roughness: 0.9,
    opacity: 1,
    transparent: false,
  },
};

export const PLASTIC_GLOSSY: MaterialPreset = {
  id: 'plastic-glossy',
  name: 'Glossy Plastic',
  category: 'plastic',
  properties: {
    color: '#2a2a2a',
    metalness: 0.0,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
};

export const PLASTIC_RED: MaterialPreset = {
  id: 'plastic-red',
  name: 'Red Plastic',
  category: 'plastic',
  properties: {
    color: '#cc3333',
    metalness: 0.0,
    roughness: 0.4,
    opacity: 1,
    transparent: false,
  },
};

export const PLASTIC_BLUE: MaterialPreset = {
  id: 'plastic-blue',
  name: 'Blue Plastic',
  category: 'plastic',
  properties: {
    color: '#3366cc',
    metalness: 0.0,
    roughness: 0.4,
    opacity: 1,
    transparent: false,
  },
};

export const PLASTIC_WHITE: MaterialPreset = {
  id: 'plastic-white',
  name: 'White Plastic',
  category: 'plastic',
  properties: {
    color: '#f0f0f0',
    metalness: 0.0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// WOOD PRESETS
// ═══════════════════════════════════════════════════════════════

export const WOOD_OAK: MaterialPreset = {
  id: 'wood-oak',
  name: 'Oak Wood',
  category: 'wood',
  properties: {
    color: '#b5651d',
    metalness: 0.0,
    roughness: 0.8,
    opacity: 1,
    transparent: false,
  },
};

export const WOOD_WALNUT: MaterialPreset = {
  id: 'wood-walnut',
  name: 'Walnut Wood',
  category: 'wood',
  properties: {
    color: '#5d432c',
    metalness: 0.0,
    roughness: 0.75,
    opacity: 1,
    transparent: false,
  },
};

export const WOOD_PINE: MaterialPreset = {
  id: 'wood-pine',
  name: 'Pine Wood',
  category: 'wood',
  properties: {
    color: '#deb887',
    metalness: 0.0,
    roughness: 0.85,
    opacity: 1,
    transparent: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// GLASS PRESETS
// ═══════════════════════════════════════════════════════════════

export const GLASS_CLEAR: MaterialPreset = {
  id: 'glass-clear',
  name: 'Clear Glass',
  category: 'glass',
  properties: {
    color: '#ffffff',
    metalness: 0.0,
    roughness: 0.05,
    opacity: 0.3,
    transparent: true,
  },
};

export const GLASS_TINTED: MaterialPreset = {
  id: 'glass-tinted',
  name: 'Tinted Glass',
  category: 'glass',
  properties: {
    color: '#88ccff',
    metalness: 0.0,
    roughness: 0.05,
    opacity: 0.4,
    transparent: true,
  },
};

export const GLASS_FROSTED: MaterialPreset = {
  id: 'glass-frosted',
  name: 'Frosted Glass',
  category: 'glass',
  properties: {
    color: '#f0f0f0',
    metalness: 0.0,
    roughness: 0.6,
    opacity: 0.5,
    transparent: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// RUBBER PRESETS
// ═══════════════════════════════════════════════════════════════

export const RUBBER_BLACK: MaterialPreset = {
  id: 'rubber-black',
  name: 'Black Rubber',
  category: 'rubber',
  properties: {
    color: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.95,
    opacity: 1,
    transparent: false,
  },
};

export const RUBBER_RED: MaterialPreset = {
  id: 'rubber-red',
  name: 'Red Rubber',
  category: 'rubber',
  properties: {
    color: '#8b0000',
    metalness: 0.0,
    roughness: 0.9,
    opacity: 1,
    transparent: false,
  },
};

export const RUBBER_GRAY: MaterialPreset = {
  id: 'rubber-gray',
  name: 'Gray Rubber',
  category: 'rubber',
  properties: {
    color: '#505050',
    metalness: 0.0,
    roughness: 0.95,
    opacity: 1,
    transparent: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// PRESET COLLECTIONS
// ═══════════════════════════════════════════════════════════════

export const METAL_PRESETS: MaterialPreset[] = [
  STEEL,
  ALUMINUM,
  COPPER,
  GOLD,
  BRONZE,
  CHROME,
];

export const PLASTIC_PRESETS: MaterialPreset[] = [
  PLASTIC_MATTE,
  PLASTIC_GLOSSY,
  PLASTIC_RED,
  PLASTIC_BLUE,
  PLASTIC_WHITE,
];

export const WOOD_PRESETS: MaterialPreset[] = [
  WOOD_OAK,
  WOOD_WALNUT,
  WOOD_PINE,
];

export const GLASS_PRESETS: MaterialPreset[] = [
  GLASS_CLEAR,
  GLASS_TINTED,
  GLASS_FROSTED,
];

export const RUBBER_PRESETS: MaterialPreset[] = [
  RUBBER_BLACK,
  RUBBER_RED,
  RUBBER_GRAY,
];

export const ALL_PRESETS: MaterialPreset[] = [
  ...METAL_PRESETS,
  ...PLASTIC_PRESETS,
  ...WOOD_PRESETS,
  ...GLASS_PRESETS,
  ...RUBBER_PRESETS,
];

export const PRESET_BY_ID: Record<string, MaterialPreset> = ALL_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<string, MaterialPreset>
);

export const PRESETS_BY_CATEGORY: Record<MaterialCategory, MaterialPreset[]> = {
  metal: METAL_PRESETS,
  plastic: PLASTIC_PRESETS,
  wood: WOOD_PRESETS,
  glass: GLASS_PRESETS,
  rubber: RUBBER_PRESETS,
  custom: [],
};

// Default material (used when no material is assigned)
export const DEFAULT_MATERIAL: MaterialPreset = {
  id: 'default',
  name: 'Default',
  category: 'custom',
  properties: {
    color: '#ffaa44',
    metalness: 0.1,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
  },
};

/**
 * Create a custom material preset
 */
export function createCustomMaterial(
  name: string,
  properties: Partial<MaterialProperties>
): MaterialPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    category: 'custom',
    properties: {
      color: properties.color ?? DEFAULT_MATERIAL.properties.color,
      metalness: properties.metalness ?? DEFAULT_MATERIAL.properties.metalness,
      roughness: properties.roughness ?? DEFAULT_MATERIAL.properties.roughness,
      opacity: properties.opacity ?? DEFAULT_MATERIAL.properties.opacity,
      transparent: properties.transparent ?? (properties.opacity !== undefined && properties.opacity < 1),
      emissive: properties.emissive,
      emissiveIntensity: properties.emissiveIntensity,
    },
  };
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: MaterialCategory): string {
  const names: Record<MaterialCategory, string> = {
    metal: 'Metal',
    plastic: 'Plastic',
    wood: 'Wood',
    glass: 'Glass',
    rubber: 'Rubber',
    custom: 'Custom',
  };
  return names[category];
}

/**
 * Get category icon (emoji for now, can be replaced with proper icons)
 */
export function getCategoryIcon(category: MaterialCategory): string {
  const icons: Record<MaterialCategory, string> = {
    metal: '🔩',
    plastic: '🧱',
    wood: '🪵',
    glass: '🪟',
    rubber: '⚫',
    custom: '🎨',
  };
  return icons[category];
}
