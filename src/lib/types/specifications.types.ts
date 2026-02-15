// ============================================================================
// Specifications Type Definitions
// ============================================================================

/**
 * Supported icon names for spec groups and highlights (maps to lucide-react)
 */
export type IconName =
  | 'camera'
  | 'video'
  | 'scale'
  | 'battery'
  | 'aperture'
  | 'monitor'
  | 'layers'
  | 'move'
  | 'star'
  | 'zap'
  | 'hard-drive'
  | 'wifi'
  | 'ruler'
  | 'cable'
  | 'thermometer'
  | 'sun'
  | 'gauge'
  | 'info'

/**
 * Individual specification item within a group
 */
export interface SpecItem {
  /** Unique key for the specification (e.g., 'sensor', 'weight') */
  key: string
  /** Display label in English */
  label: string
  /** Display label in Arabic (optional) */
  labelAr?: string
  /** The value of the specification */
  value: string
  /** Visual type for rendering */
  type?: 'text' | 'boolean' | 'range' | 'colorTemp'
  /** Whether this spec should be visually highlighted as important */
  highlight?: boolean
  /** For type='range': percentage fill (0-100) */
  rangePercent?: number
  /** Unit of measurement (optional, can be embedded in value) */
  unit?: string
}

/**
 * A group of related specifications
 */
export interface SpecGroup {
  /** Group label in English */
  label: string
  /** Group label in Arabic (optional) */
  labelAr?: string
  /** Icon identifier (maps to lucide-react icon) */
  icon: string
  /** Display priority (lower numbers appear first) */
  priority: number
  /** Array of specifications in this group */
  specs: SpecItem[]
}

/**
 * Highlight card item (for hero section)
 */
export interface SpecHighlight {
  /** Icon identifier */
  icon: string
  /** Main label */
  label: string
  /** Main value to display */
  value: string
  /** Optional secondary text */
  sublabel?: string
}

/**
 * Quick spec pill (shown above tabs)
 */
export interface QuickSpec {
  /** Icon identifier */
  icon: string
  /** Label text */
  label: string
  /** Value text */
  value: string
}

/**
 * Complete structured specifications object
 */
export interface StructuredSpecifications {
  /** Hero highlights (3-4 max, shown at top) */
  highlights?: SpecHighlight[]
  /** Quick spec pills (4-6 max, shown above tabs) */
  quickSpecs?: QuickSpec[]
  /** Detailed specification groups */
  groups: SpecGroup[]
}

/**
 * Legacy flat specifications format (for backward compatibility)
 */
export type FlatSpecifications = Record<string, string | number | boolean>

/**
 * Union type for all specification formats
 */
export type AnySpecifications = StructuredSpecifications | FlatSpecifications

/**
 * Type guard to check if specifications are structured
 */
export function isStructuredSpecifications(
  specs: unknown
): specs is StructuredSpecifications {
  return (
    typeof specs === 'object' &&
    specs !== null &&
    'groups' in specs &&
    Array.isArray((specs as StructuredSpecifications).groups) &&
    (specs as StructuredSpecifications).groups.length > 0
  )
}

/**
 * Type guard to check if specifications are flat
 */
export function isFlatSpecifications(
  specs: unknown
): specs is FlatSpecifications {
  if (typeof specs !== 'object' || specs === null) return false
  if ('groups' in specs && Array.isArray((specs as { groups: unknown }).groups))
    return false
  return Object.keys(specs as Record<string, unknown>).length > 0
}
