/** Map feature types supported by GET/POST /api/map/features.
 *  Keep in sync with MAP_FEATURE_TYPES in app.py. */
export const MAP_FEATURE_TYPES = [
  'boundary', 'ward', 'school', 'hospital', 'anganwadi', 'water_tank',
  'hand_pump', 'street_light', 'government_office', 'community_center',
  'road', 'project',
] as const

export type MapFeatureType = (typeof MAP_FEATURE_TYPES)[number]

export const ASSET_TYPES: MapFeatureType[] = [
  'school', 'hospital', 'anganwadi', 'water_tank', 'hand_pump',
  'street_light', 'government_office', 'community_center',
]

export type GeometryType = 'Point' | 'LineString' | 'Polygon'

export interface MapGeometry {
  type: GeometryType
  coordinates: number | number[] | number[][]
}

export interface MapFeatureProperties {
  name: string
  ward?: string
  status?: string
  description?: string
  progress?: number
}

/** A GeoJSON Feature as returned by the backend. */
export interface MapFeature {
  type: 'Feature'
  id: string
  geometry: MapGeometry
  properties: MapFeatureProperties
  feature_type: MapFeatureType
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface MapFeatureCollection {
  type: 'FeatureCollection'
  features: MapFeature[]
}

export interface MapFeaturePayload {
  type: MapFeatureType
  geometry: MapGeometry
  properties: MapFeatureProperties
}

export const FEATURE_STATUSES = [
  'operational', 'needs_attention', 'under_maintenance', 'inactive',
] as const

export const PROJECT_STATUSES = [
  'planned', 'approved', 'in_progress', 'completed', 'verified',
] as const
