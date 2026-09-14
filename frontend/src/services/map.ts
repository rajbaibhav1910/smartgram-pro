import { fetchWithAuth, ApiNotFoundError } from './api'
import type { MapFeature, MapFeatureCollection, MapFeaturePayload } from '../types/map'

export const mapAPI = {
  /** All map features as a GeoJSON FeatureCollection (public). */
  list: () => fetchWithAuth<MapFeatureCollection>('/map/features'),

  get: (id: string) => fetchWithAuth<{ feature: MapFeature }>(
    `/map/features/${encodeURIComponent(id)}`,
  ),

  /** Admin: create a feature. Returns 403 unless authorized by Flask. */
  create: (payload: MapFeaturePayload) =>
    fetchWithAuth<{ feature: MapFeature }>('/map/features', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: MapFeaturePayload) =>
    fetchWithAuth<{ feature: MapFeature }>(`/map/features/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    fetchWithAuth<{ success: boolean }>(`/map/features/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}

export function isNotFound(err: unknown): err is ApiNotFoundError {
  return err instanceof ApiNotFoundError
}
