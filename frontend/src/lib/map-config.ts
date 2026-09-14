import type { MapFeatureType } from '../types/map'

export type GeometryKind = 'point' | 'line' | 'polygon'

export interface FeatureTypeConfig {
  color: string
  kind: GeometryKind
  labelKey: string
  group: 'boundaries' | 'infrastructure' | 'governance'
}

/** Restrained, legend-friendly palette — one consistent color per feature type. */
export const FEATURE_TYPE_CONFIG: Record<MapFeatureType, FeatureTypeConfig> = {
  boundary:          { color: '#166534', kind: 'polygon', labelKey: 'map.type.boundary',          group: 'boundaries' },
  ward:              { color: '#5b8a6e', kind: 'polygon', labelKey: 'map.type.ward',              group: 'boundaries' },
  school:            { color: '#1d4ed8', kind: 'point',   labelKey: 'map.type.school',            group: 'infrastructure' },
  hospital:          { color: '#b91c1c', kind: 'point',   labelKey: 'map.type.hospital',          group: 'infrastructure' },
  anganwadi:         { color: '#c2410c', kind: 'point',   labelKey: 'map.type.anganwadi',         group: 'infrastructure' },
  water_tank:        { color: '#0891b2', kind: 'point',   labelKey: 'map.type.water_tank',        group: 'infrastructure' },
  hand_pump:         { color: '#22b8cf', kind: 'point',   labelKey: 'map.type.hand_pump',         group: 'infrastructure' },
  street_light:      { color: '#ca8a04', kind: 'point',   labelKey: 'map.type.street_light',      group: 'infrastructure' },
  government_office: { color: '#166534', kind: 'point',   labelKey: 'map.type.government_office', group: 'infrastructure' },
  community_center:  { color: '#7c3aed', kind: 'point',   labelKey: 'map.type.community_center',  group: 'infrastructure' },
  road:              { color: '#57534e', kind: 'line',    labelKey: 'map.type.road',              group: 'infrastructure' },
  project:           { color: '#d97722', kind: 'point',   labelKey: 'map.type.project',           group: 'governance' },
}

export const LAYER_GROUPS: Array<{ id: FeatureTypeConfig['group']; labelKey: string; types: MapFeatureType[] }> = [
  {
    id: 'boundaries',
    labelKey: 'map.group.boundaries',
    types: ['boundary', 'ward'],
  },
  {
    id: 'infrastructure',
    labelKey: 'map.group.infrastructure',
    types: ['school', 'hospital', 'anganwadi', 'water_tank', 'hand_pump', 'street_light', 'government_office', 'community_center', 'road'],
  },
  {
    id: 'governance',
    labelKey: 'map.group.governance',
    types: ['project'],
  },
]

/** Asset types an admin can place on the map (everything except boundaries,
 *  which are drawn as polygons and rarely created interactively). */
export const CREATABLE_TYPES: MapFeatureType[] = [
  'school', 'hospital', 'anganwadi', 'water_tank', 'hand_pump',
  'street_light', 'government_office', 'community_center', 'road', 'project',
]

export function geometryKindOf(type: MapFeatureType): GeometryKind {
  return FEATURE_TYPE_CONFIG[type].kind
}

export const DEFAULT_VISIBLE_TYPES: MapFeatureType[] = [
  'boundary', 'ward', 'project',
]

const STORAGE_KEY = 'sg-map-layers'

export function loadVisibleTypes(): MapFeatureType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE_TYPES
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((t: string) => t in FEATURE_TYPE_CONFIG)
      return valid.length > 0 ? valid : DEFAULT_VISIBLE_TYPES
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_VISIBLE_TYPES
}

export function saveVisibleTypes(types: MapFeatureType[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types))
  } catch {
    // persistence is best-effort
  }
}
