import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'
/* MapLibre v6 loads its worker from a separate file that itself imports
 * ./maplibre-gl-shared.mjs. Bundlers split those imports, so we serve the
 * original pair verbatim from /maplibre/ (copied into public/) and point
 * the library at it. */
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, Plus, Minus, Crosshair, Layers, List, Map as MapIcon, X,
  Pencil, Trash2, Loader2, TriangleAlert, ChevronRight, Home,
  CircleCheck, CircleAlert, Wrench, CircleSlash, ClipboardList,
  CircleDot, Info,
} from 'lucide-react'
import { mapAPI } from '../services/map'
import { useAuth } from '../hooks/use-auth'
import { useTheme } from '../hooks/use-theme'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import Drawer from '../components/ui/Drawer'
import Button from '../components/ui/Button'
import { ErrorState } from '../components/ui/States'
import {
  FEATURE_TYPE_CONFIG, LAYER_GROUPS, CREATABLE_TYPES,
  loadVisibleTypes, saveVisibleTypes, geometryKindOf,
} from '../lib/map-config'
import type { MapFeature, MapFeatureType, MapFeaturePayload } from '../types/map'
import { cn } from '../lib/utils'

const BASE_STYLE = (dark: boolean) => ({
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    basemap: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'basemap',
      type: 'raster' as const,
      source: 'basemap',
      // Dim OSM in dark mode so overlays stay readable
      paint: dark ? { 'raster-brightness-max': 0.6 } : {},
    },
  ],
})

const DEFAULT_CENTER: [number, number] = [79.51, 28.955]
const DEFAULT_ZOOM = 12

type Mode = 'map' | 'list'

type AddState =
  | { phase: 'idle' }
  | { phase: 'placing'; type: MapFeatureType; coords?: [number, number]; vertices?: [number, number][] }
  | { phase: 'form'; type: MapFeatureType; coords?: [number, number]; vertices?: [number, number][] }

const FEATURE_STATUS_META: Record<string, { labelKey: string; icon: typeof CircleCheck; className: string }> = {
  operational:        { labelKey: 'map.status.operational',        icon: CircleCheck,  className: 'text-status-resolved-text' },
  needs_attention:    { labelKey: 'map.status.needs_attention',    icon: CircleAlert,  className: 'text-warning' },
  under_maintenance:  { labelKey: 'map.status.under_maintenance',  icon: Wrench,       className: 'text-status-progress-text' },
  inactive:           { labelKey: 'map.status.inactive',           icon: CircleSlash,  className: 'text-text-faint' },
  planned:            { labelKey: 'map.projectStatus.planned',     icon: ClipboardList, className: 'text-text-muted' },
  approved:           { labelKey: 'map.projectStatus.approved',    icon: CircleDot,    className: 'text-status-progress-text' },
  in_progress:        { labelKey: 'map.projectStatus.in_progress', icon: Loader2,      className: 'text-status-progress-text' },
  completed:          { labelKey: 'map.projectStatus.completed',   icon: CircleCheck,  className: 'text-status-resolved-text' },
  verified:           { labelKey: 'map.projectStatus.verified',    icon: CircleCheck,  className: 'text-status-resolved-text' },
}

/** Status chip with icon + text — never colour alone. */
export function MapStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const meta = FEATURE_STATUS_META[status]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.78rem] font-medium', meta.className)}>
      <Icon size={13} className={status === 'in_progress' ? 'animate-spin' : undefined} aria-hidden="true" />
      {t(meta.labelKey)}
    </span>
  )
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime())
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return isValidDate(d) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export default function MapPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { theme } = useTheme()
  const { toast } = useToast()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const isAdmin = user?.role === 'panchayat_admin' || user?.role === 'super_admin'
  usePageTitle(t('map.title'))

  const [params] = useSearchParams()
  const demo = params.get('demo') === '1'
  const deepLinkFeature = params.get('feature')

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [mode, setMode] = useState<Mode>('map')
  const [visibleTypes, setVisibleTypes] = useState<MapFeatureType[]>(() => loadVisibleTypes())
  const [selected, setSelected] = useState<MapFeature | null>(null)
  const [wardFilter] = useState('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState<'layers' | 'legend' | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [addState, setAddState] = useState<AddState>({ phase: 'idle' })
  const [editing, setEditing] = useState<MapFeature | null>(null)

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const featuresQuery = useQuery({
    queryKey: demo ? ['map', 'features', 'demo'] : ['map', 'features', user?.panchayatId],
    queryFn: async () => {
      if (demo) {
        const mod = await import('../data/demo-panchayat.json')
        return mod.default as unknown as { type: 'FeatureCollection'; features: MapFeature[] }
      }
      return mapAPI.list()
    },
    staleTime: 60_000,
  })

  const allFeatures = useMemo(() => {
    const raw = featuresQuery.data?.features ?? []
    return raw.filter((f) => {
      if (!f || !f.geometry || !f.geometry.type || !f.geometry.coordinates) return false
      if (!f.feature_type || !(f.feature_type in FEATURE_TYPE_CONFIG)) return false
      return true
    })
  }, [featuresQuery.data])

  const visibleFeatures = useMemo(
    () =>
      allFeatures.filter((f) => {
        if (!visibleTypes.includes(f.feature_type)) return false
        if (wardFilter && f.properties?.ward !== wardFilter) return false
        return true
      }),
    [allFeatures, visibleTypes, wardFilter],
  )

  /* ── Map initialisation ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE(theme === 'dark'),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    // Expose for QA diagnostics only (read-only usage)
    ;(window as unknown as { __sgMap?: MapLibreMap }).__sgMap = map
    map.on('load', () => setMapReady(true))
    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [theme])

  const flyTo = useCallback(
    (coords: [number, number], zoom = 16) => {
      const map = mapRef.current
      if (!map) return
      if (reduced) map.jumpTo({ center: coords, zoom })
      else map.flyTo({ center: coords, zoom, duration: 900, essential: true })
    },
    [reduced],
  )

  /* ── Sources & layers sync ────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    const points = visibleFeatures.filter((f) => geometryKindOf(f.feature_type) === 'point')
    const lines = visibleFeatures.filter((f) => geometryKindOf(f.feature_type) === 'line')
    const polygons = visibleFeatures.filter((f) => geometryKindOf(f.feature_type) === 'polygon')

    const toFC = (list: MapFeature[]) => ({
      type: 'FeatureCollection' as const,
      // feature_type feeds the style expressions; fid survives supercluster's
      // numeric re-indexing so click handlers can map back to the API feature
      features: list.map((f) => ({
        ...f,
        properties: { ...f.properties, feature_type: f.feature_type, fid: f.id },
      })),
    })
    const emptyFC = toFC([])

    const colorMatch: unknown[] = ['match', ['get', 'feature_type']]
    for (const tp of CREATABLE_TYPES) colorMatch.push(tp, FEATURE_TYPE_CONFIG[tp].color)
    colorMatch.push('#166534')

    if (!map.getSource('sg-points')) {
      map.addSource('sg-points', { type: 'geojson', data: emptyFC, cluster: true, clusterMaxZoom: 14, clusterRadius: 40 })
      map.addLayer({
        id: 'sg-clusters', type: 'circle', source: 'sg-points', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#166534', 'circle-opacity': 0.85, 'circle-radius': 16, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      })
      map.addLayer({
        id: 'sg-cluster-count', type: 'symbol', source: 'sg-points', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Open Sans Semibold'] },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'sg-points-layer', type: 'circle', source: 'sg-points', filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': colorMatch as never, 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      })
    }
    if (!map.getSource('sg-lines')) {
      map.addSource('sg-lines', { type: 'geojson', data: emptyFC })
      map.addLayer({
        id: 'sg-lines-layer', type: 'line', source: 'sg-lines',
        paint: { 'line-color': colorMatch as never, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 6] },
      })
    }
    if (!map.getSource('sg-polygons')) {
      map.addSource('sg-polygons', { type: 'geojson', data: emptyFC })
      map.addLayer({
        id: 'sg-polygons-fill', type: 'fill', source: 'sg-polygons',
        paint: {
          'fill-color': ['match', ['get', 'feature_type'], 'boundary', '#166534', '#5b8a6e'],
          'fill-opacity': ['match', ['get', 'feature_type'], 'boundary', 0.04, 0.08],
        },
      })
      map.addLayer({
        id: 'sg-polygons-outline', type: 'line', source: 'sg-polygons',
        paint: {
          'line-color': ['match', ['get', 'feature_type'], 'boundary', '#166534', '#5b8a6e'],
          'line-width': ['match', ['get', 'feature_type'], 'boundary', 2.5, 1.5],
          'line-dasharray': ['match', ['get', 'feature_type'], 'boundary', ['literal', [1, 0]], ['literal', [2, 2]]],
        },
      })
    }
    if (!map.getSource('sg-selected')) {
      map.addSource('sg-selected', { type: 'geojson', data: emptyFC })
      map.addLayer({
        id: 'sg-selected-ring', type: 'circle', source: 'sg-selected',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': 'transparent', 'circle-radius': 13, 'circle-stroke-width': 3, 'circle-stroke-color': '#166534' },
      })
    }

    ;(map.getSource('sg-points') as maplibregl.GeoJSONSource).setData(toFC(points))
    ;(map.getSource('sg-lines') as maplibregl.GeoJSONSource).setData(toFC(lines))
    ;(map.getSource('sg-polygons') as maplibregl.GeoJSONSource).setData(toFC(polygons))

    const selectedVisible = selected && visibleFeatures.some((f) => f.id === selected.id) ? selected : null
    ;(map.getSource('sg-selected') as maplibregl.GeoJSONSource).setData(
      selectedVisible && selectedVisible.geometry.type === 'Point' ? toFC([selectedVisible]) : emptyFC,
    )

    // Draft placement preview
    const draftFeatures: MapFeature[] = []
    if (addState.phase === 'placing') {
      if (addState.coords) {
        draftFeatures.push({
          type: 'Feature', id: 'draft-pt', feature_type: addState.type,
          geometry: { type: 'Point', coordinates: addState.coords }, properties: { name: '' },
        })
      }
      if (addState.vertices && addState.vertices.length > 0) {
        draftFeatures.push({
          type: 'Feature', id: 'draft-line', feature_type: addState.type,
          geometry: { type: 'LineString', coordinates: addState.vertices }, properties: { name: '' },
        })
      }
    }
    if (!map.getSource('sg-draft')) {
      map.addSource('sg-draft', { type: 'geojson', data: emptyFC })
      map.addLayer({ id: 'sg-draft-line', type: 'line', source: 'sg-draft', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#d97722', 'line-width': 3, 'line-dasharray': [2, 2] } })
      map.addLayer({ id: 'sg-draft-point', type: 'circle', source: 'sg-draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': '#d97722', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
    }
    ;(map.getSource('sg-draft') as maplibregl.GeoJSONSource).setData(toFC(draftFeatures))

    map.getCanvas().style.cursor = addState.phase === 'placing' ? 'crosshair' : ''
  }, [mapReady, visibleFeatures, selected, addState])

  /* ── Map interactions ─────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    const findFeature = (id: unknown) => {
      if (id == null) return undefined
      return (
        allFeatures.find((f) => f.id === id) ??
        allFeatures.find((f) => f.id === (id as { fid?: string })?.fid)
      )
    }

    const onClickPointOrCluster = (e: any) => {
      if (addState.phase === 'placing') return
      const f0 = e.features?.[0]
      if (f0?.properties?.cluster_id != null) {
        const source = map.getSource('sg-points') as maplibregl.GeoJSONSource
        source.getClusterExpansionZoom(f0.properties.cluster_id).then((zoom: number) => {
          map.easeTo({ center: f0.geometry.coordinates, zoom })
        })
        return
      }
      const f = findFeature(f0?.properties?.fid ?? f0?.id)
      if (f) setSelected(f)
    }
    const onClickLine = (e: any) => {
      if (addState.phase === 'placing') return
      const f0 = e.features?.[0]
      const f = findFeature(f0?.properties?.fid ?? f0?.id)
      if (f) setSelected(f)
    }
    const onClickPolygon = (e: any) => {
      const f0 = e.features?.[0]
      const f = findFeature(f0?.properties?.fid ?? f0?.id)
      if (f) setSelected(f)
    }
    const onClickMap = (e: any) => {
      if (addState.phase !== 'placing') return
      const coords = e.lngLat.toArray() as [number, number]
      if (geometryKindOf(addState.type) === 'line') {
        setAddState({ ...addState, vertices: [...(addState.vertices ?? []), coords] })
      } else {
        // A single click places the point — open the form right away
        setAddState({ ...addState, phase: 'form', coords })
      }
    }

    map.on('click', 'sg-points-layer', onClickPointOrCluster)
    map.on('click', 'sg-clusters', onClickPointOrCluster)
    map.on('click', 'sg-lines-layer', onClickLine)
    map.on('click', 'sg-polygons-fill', onClickPolygon)
    map.on('click', onClickMap)

    for (const layer of ['sg-points-layer', 'sg-clusters', 'sg-lines-layer', 'sg-polygons-fill']) {
      map.on('mouseenter', layer, () => {
        if (addState.phase !== 'placing') map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        if (addState.phase !== 'placing') map.getCanvas().style.cursor = ''
      })
    }

    return () => {
      map.off('click', 'sg-points-layer', onClickPointOrCluster)
      map.off('click', 'sg-clusters', onClickPointOrCluster)
      map.off('click', 'sg-lines-layer', onClickLine)
      map.off('click', 'sg-polygons-fill', onClickPolygon)
      map.off('click', onClickMap)
    }
  }, [mapReady, allFeatures, addState])

  /* ── Deep link ?feature=<id> ──────────────────────────────────────────── */
  const deepLinkApplied = useRef(false)
  useEffect(() => {
    if (!deepLinkFeature || deepLinkApplied.current || allFeatures.length === 0) return
    const target = allFeatures.find((f) => f.id === deepLinkFeature)
    if (target) {
      deepLinkApplied.current = true
      setVisibleTypes((v) => (v.includes(target.feature_type) ? v : [...v, target.feature_type]))
      setSelected(target)
      if (target.geometry.type === 'Point') {
        const [lng, lat] = target.geometry.coordinates as [number, number]
        flyTo([lng, lat])
      }
    }
  }, [deepLinkFeature, allFeatures, flyTo])

  /* ── Mutations (admin) ────────────────────────────────────────────────── */
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['map', 'features'] })

  const createMutation = useMutation({
    mutationFn: (payload: MapFeaturePayload) => mapAPI.create(payload),
    onSuccess: () => {
      invalidate()
      toast(t('map.saved'))
      setAddState({ phase: 'idle' })
    },
    onError: (err: Error) => toast(err.message || t('map.saveFailed'), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapFeaturePayload }) => mapAPI.update(id, payload),
    onSuccess: () => {
      invalidate()
      toast(t('map.saved'))
      setEditing(null)
      setSelected(null)
    },
    onError: (err: Error) => toast(err.message || t('map.saveFailed'), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mapAPI.remove(id),
    onSuccess: () => {
      invalidate()
      toast(t('map.deleted'))
      setSelected(null)
    },
    onError: (err: Error) => toast(err.message || t('map.saveFailed'), 'error'),
  })

  /* ── Search ───────────────────────────────────────────────────────────── */
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return allFeatures
      .filter((f) =>
        [f.properties?.name ?? '', f.properties?.ward ?? '', t(`map.type.${f.feature_type}`)]
          .some((v) => v.toLowerCase().includes(q)),
      )
      .slice(0, 12)
  }, [search, allFeatures, t])

  const groupedSearch = useMemo(() => {
    const groups: Record<string, MapFeature[]> = {}
    for (const r of searchResults) {
      const group = FEATURE_TYPE_CONFIG[r.feature_type].group
      groups[group] = groups[group] ?? []
      groups[group].push(r)
    }
    return groups
  }, [searchResults])

  const selectFeature = (f: MapFeature) => {
    setVisibleTypes((v) => (v.includes(f.feature_type) ? v : [...v, f.feature_type]))
    setSelected(f)
    setSearch('')
    if (f.geometry.type === 'Point') {
      const [lng, lat] = f.geometry.coordinates as [number, number]
      flyTo([lng, lat])
    } else if (f.geometry.type === 'Polygon') {
      const ring = f.geometry.coordinates as [number, number][]
      const lons = ring.map((c) => c[0])
      const lats = ring.map((c) => c[1])
      mapRef.current?.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding: 60, duration: reduced ? 0 : 900, essential: true },
      )
    }
  }

  const toggleType = (type: MapFeatureType) => {
    setVisibleTypes((v) => {
      const next = v.includes(type) ? v.filter((x) => x !== type) : [...v, type]
      saveVisibleTypes(next)
      return next
    })
  }

  const wardSummary = useMemo(() => {
    if (!selected || selected.feature_type !== 'ward') return null
    const ward = selected.properties?.ward ?? ''
    const inWard = allFeatures.filter(
      (f) => f.properties?.ward === ward && f.feature_type !== 'ward' && f.feature_type !== 'boundary',
    )
    return {
      ward,
      assets: inWard.filter((f) => f.feature_type !== 'project').length,
      projects: inWard.filter((f) => f.feature_type === 'project').length,
    }
  }, [selected, allFeatures])

  const listFeatures = useMemo(
    () =>
      visibleFeatures.filter((f) => f.feature_type !== 'boundary' && f.feature_type !== 'ward'),
    [visibleFeatures],
  )

  const emptyNotDemo = !demo && !featuresQuery.isLoading && !featuresQuery.isError && allFeatures.length === 0

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className={cn('relative', fullscreen ? 'fixed inset-0 z-[80] bg-canvas' : 'container-page py-6 pb-24 lg:pb-8')}>
      {!fullscreen && (
        <div className="row-between mb-4">
          <div>
            <nav aria-label="Breadcrumb" className="mb-2 hidden lg:block">
              <ol className="flex items-center gap-1.5 text-[0.8rem] text-text-muted">
                <li className="flex items-center gap-1">
                  <Home size={12} />
                  <button type="button" onClick={() => navigate('/')} className="hover:text-primary transition-colors">
                    {t('nav.home')}
                  </button>
                </li>
                <li aria-hidden="true"><ChevronRight size={12} className="text-text-faint" /></li>
                <li aria-current="page" className="font-medium text-ink">{t('map.title')}</li>
              </ol>
            </nav>
            <h1 className="h1 mb-1">{t('map.title')}</h1>
            <p className="text-text-muted text-sm">{t('map.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && !demo && addState.phase === 'idle' && (
              <Button variant="primary" onClick={() => setAddState({ phase: 'placing', type: 'water_tank' })}>
                <Plus size={15} />
                {t('map.addAsset')}
              </Button>
            )}
            <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-label={t('map.modeToggle')}>
              <button
                type="button"
                onClick={() => setMode('map')}
                aria-pressed={mode === 'map'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                  mode === 'map' ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted hover:text-ink',
                )}
              >
                <MapIcon size={15} />
                {t('map.map')}
              </button>
              <button
                type="button"
                onClick={() => setMode('list')}
                aria-pressed={mode === 'list'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border',
                  mode === 'list' ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted hover:text-ink',
                )}
              >
                <List size={15} />
                {t('map.list')}
              </button>
            </div>
          </div>
        </div>
      )}

      {featuresQuery.isError ? (
        <div className="bg-surface border border-border rounded-xl shadow-xs">
          <ErrorState message={t('map.errorTitle')} onRetry={() => featuresQuery.refetch()} />
        </div>
      ) : mode === 'list' ? (
        <ListMode features={listFeatures} onSelect={(f) => { selectFeature(f); setMode('map') }} />
      ) : (
        <div className={cn('relative rounded-xl overflow-hidden border border-border', fullscreen ? 'h-full' : 'h-[70vh] min-h-[420px]')}>
          <div ref={containerRef} className="absolute inset-0" />

          {demo && (
            <div role="status" className="absolute top-16 lg:top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-saffron-subtle border border-border text-[0.8rem] font-medium text-ink shadow-sm">
              <TriangleAlert size={13} className="text-saffron shrink-0" aria-hidden="true" />
              {t('map.demoBanner')}
            </div>
          )}

          {/* Search */}
          <div className="absolute top-3 left-3 z-10 w-[calc(100%-1.5rem)] max-w-xs">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('map.searchPlaceholder')}
                aria-label={t('map.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-text-faint shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {search.trim().length >= 2 && (
              <div className="mt-1.5 bg-surface border border-border rounded-lg shadow-md max-h-72 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-text-muted">{t('map.noResults')}</p>
                ) : (
                  Object.entries(groupedSearch).map(([group, items]) => (
                    <div key={group}>
                      <p className="px-3 pt-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-text-faint">
                        {t(`map.group.${group}`)}
                      </p>
                      {items.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => selectFeature(f)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-subtle transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: FEATURE_TYPE_CONFIG[f.feature_type].color }} />
                            <span className="text-sm font-medium text-ink truncate">{f.properties?.name}</span>
                          </span>
                          <span className="text-[0.72rem] text-text-faint ml-4 block">
                            {t(`map.type.${f.feature_type}`)}{f.properties?.ward ? ` · ${t('map.ward')} ${f.properties.ward}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Layers panel (desktop) */}
          <div className="absolute top-16 left-3 z-10 hidden lg:block">
            <button
              type="button"
              onClick={() => setPanelOpen(panelOpen === 'layers' ? null : 'layers')}
              aria-expanded={panelOpen === 'layers'}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-ink shadow-md hover:border-border-strong transition-colors"
            >
              <Layers size={15} />
              {t('map.layers')}
            </button>
            {panelOpen === 'layers' && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 w-72 max-h-[60vh] overflow-y-auto bg-surface border border-border rounded-lg shadow-md p-3"
              >
                <LayerList allFeatures={allFeatures} visibleTypes={visibleTypes} onToggle={toggleType} />
              </motion.div>
            )}
          </div>

          {/* Legend */}
          {panelOpen === 'legend' ? (
            <div className="absolute bottom-3 left-3 z-10 hidden lg:block bg-surface border border-border rounded-lg shadow-md p-3 max-w-[220px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-text-faint">{t('map.legend')}</p>
                <button type="button" onClick={() => setPanelOpen(null)} aria-label={t('common.close')}>
                  <X size={14} className="text-text-faint hover:text-ink" />
                </button>
              </div>
              <ul className="space-y-1">
                {visibleTypes
                  .filter((tp) => tp !== 'boundary' && tp !== 'ward')
                  .map((tp) => (
                    <li key={tp} className="flex items-center gap-2 text-[0.8rem] text-ink">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: FEATURE_TYPE_CONFIG[tp].color }} />
                      {t(FEATURE_TYPE_CONFIG[tp].labelKey)}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPanelOpen('legend')}
              className="absolute bottom-3 left-3 z-10 hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-ink shadow-md hover:border-border-strong transition-colors"
            >
              {t('map.legend')}
            </button>
          )}

          {/* Controls */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
            <MapControlButton label={t('map.zoomIn')} onClick={() => mapRef.current?.zoomIn()}>
              <Plus size={16} />
            </MapControlButton>
            <MapControlButton label={t('map.zoomOut')} onClick={() => mapRef.current?.zoomOut()}>
              <Minus size={16} />
            </MapControlButton>
            <MapControlButton
              label={t('map.resetView')}
              onClick={() => mapRef.current?.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: reduced ? 0 : 600 })}
            >
              <Crosshair size={16} />
            </MapControlButton>
            <MapControlButton
              label={fullscreen ? t('map.exitFullscreen') : t('map.fullscreen')}
              onClick={() => setFullscreen((f) => !f)}
            >
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </MapControlButton>
          </div>

          {/* Mobile toolbar */}
          {!fullscreen && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 lg:hidden">
              <div className="flex rounded-lg border border-border bg-surface shadow-md overflow-hidden" role="group" aria-label={t('map.layers')}>
                <button type="button" onClick={() => setPanelOpen(panelOpen === 'layers' ? null : 'layers')} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink border-r border-border">
                  <Layers size={15} />
                  {t('map.layers')}
                </button>
                <button type="button" onClick={() => setMode('list')} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink">
                  <List size={15} />
                  {t('map.list')}
                </button>
              </div>
            </div>
          )}

          {/* Mobile layers sheet */}
          {panelOpen === 'layers' && (
            <div className="absolute inset-x-3 bottom-16 z-20 lg:hidden bg-surface border border-border rounded-xl shadow-lg p-3 max-h-[55vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-ink">{t('map.layers')}</p>
                <button type="button" onClick={() => setPanelOpen(null)} aria-label={t('common.close')}>
                  <X size={16} className="text-text-faint" />
                </button>
              </div>
              <LayerList allFeatures={allFeatures} visibleTypes={visibleTypes} onToggle={toggleType} compact />
            </div>
          )}

          {/* Placement hint */}
          {addState.phase === 'placing' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md px-4 py-3 rounded-lg bg-surface border border-border shadow-md">
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                <Crosshair size={15} className="text-primary shrink-0" />
                {geometryKindOf(addState.type) === 'line' ? t('map.placingLineHint') : t('map.placingHint')}
              </p>
              <div className="flex gap-2 mt-2.5">
                {geometryKindOf(addState.type) === 'line' && (addState.vertices?.length ?? 0) >= 2 && (
                  <Button variant="primary" size="sm" onClick={() => setAddState({ ...addState, phase: 'form' })}>
                    {t('map.finishLine')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setAddState({ phase: 'idle' })}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {featuresQuery.isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60" role="status" aria-label={t('map.loading')}>
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {/* Empty state (hidden while placing a new asset) */}
          {emptyNotDemo && addState.phase === 'idle' && !editing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-surface border border-border rounded-xl shadow-md p-6 text-center max-w-sm pointer-events-auto">
                <Info size={22} className="mx-auto text-text-faint mb-2" aria-hidden="true" />
                <h2 className="h3 mb-1.5">{t('map.emptyTitle')}</h2>
                <p className="text-sm text-text-muted mb-4">{t('map.emptyDesc')}</p>
                {isAdmin && (
                  <Button variant="primary" onClick={() => setAddState({ phase: 'placing', type: 'water_tank' })}>
                    <Plus size={15} />
                    {t('map.addFirst')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature / ward drawer */}
      <FeatureDrawer
        feature={selected}
        wardSummary={wardSummary}
        isAdmin={isAdmin && !demo}
        deleting={deleteMutation.isPending}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setEditing(selected)
          setSelected(null)
        }}
        onDelete={() => deleteMutation.mutate(selected!.id)}
      />

      {/* Add / edit form drawer */}
      {(addState.phase === 'form' || editing) && (
        <FeatureFormDrawer
          key={editing?.id ?? 'new'}
          editing={editing}
          draftType={addState.phase !== 'idle' ? addState.type : undefined}
          draftCoords={addState.phase !== 'idle' ? addState.coords : undefined}
          draftVertices={addState.phase !== 'idle' ? addState.vertices : undefined}
          saving={createMutation.isPending || updateMutation.isPending}
          onClose={() => {
            setAddState({ phase: 'idle' })
            setEditing(null)
          }}
          onSubmit={(payload) => {
            if (editing) updateMutation.mutate({ id: editing.id, payload })
            else createMutation.mutate(payload)
          }}
        />
      )}
    </div>
  )
}

/* ── Layer list (shared desktop panel / mobile sheet) ─────────────────────── */
function LayerList({
  allFeatures, visibleTypes, onToggle, compact,
}: {
  allFeatures: MapFeature[]
  visibleTypes: MapFeatureType[]
  onToggle: (type: MapFeatureType) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <>
      {LAYER_GROUPS.map((group) => (
        <div key={group.id} className="mb-3 last:mb-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-text-faint mb-1.5">
            {t(group.labelKey)}
          </p>
          <ul className={compact ? 'grid grid-cols-2 gap-x-2' : 'space-y-0.5'}>
            {group.types.map((type) => {
              const count = allFeatures.filter((f) => f.feature_type === type).length
              const visible = visibleTypes.includes(type)
              return (
                <li key={type}>
                  <label className={cn('flex items-center gap-2.5 rounded-md cursor-pointer text-sm hover:bg-surface-subtle transition-colors', compact ? 'py-1.5' : 'px-2 py-1.5')}>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggle(type)}
                      className="accent-[#166534] w-4 h-4"
                    />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: FEATURE_TYPE_CONFIG[type].color }} />
                    <span className="flex-1 text-ink truncate">{t(FEATURE_TYPE_CONFIG[type].labelKey)}</span>
                    {count > 0 && <span className="text-[0.7rem] text-text-faint">{count}</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

function MapControlButton({
  label, onClick, children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface text-ink shadow-md hover:border-border-strong transition-colors"
    >
      {children}
    </button>
  )
}

function MaximizeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
}
function MinimizeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
}

/* ── List mode (accessible alternative to the map) ────────────────────────── */
function ListMode({ features, onSelect }: { features: MapFeature[]; onSelect: (f: MapFeature) => void }) {
  const { t } = useTranslation()
  const grouped = useMemo(() => {
    const groups: Record<string, MapFeature[]> = {}
    for (const f of features) {
      groups[f.feature_type] = groups[f.feature_type] ?? []
      groups[f.feature_type].push(f)
    }
    return groups
  }, [features])

  if (features.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl shadow-xs py-14 text-center">
        <p className="text-sm text-text-muted">{t('map.listEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <section key={type} aria-label={t(`map.type.${type}`)}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink uppercase tracking-wider mb-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: FEATURE_TYPE_CONFIG[type as MapFeatureType].color }} />
            {t(`map.type.${type}`)} ({items.length})
          </h2>
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onSelect(f)}
                  className="w-full text-left bg-surface border border-border rounded-lg p-3.5 hover:border-border-strong hover:shadow-sm transition-all"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{f.properties?.name}</span>
                    {f.properties?.ward && <span className="caption shrink-0">{t('map.ward')} {f.properties.ward}</span>}
                  </span>
                  {f.properties?.status && (
                    <span className="block mt-1"><MapStatusBadge status={f.properties.status} /></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* ── Feature / ward drawer ────────────────────────────────────────────────── */
function FeatureDrawer({
  feature, wardSummary, isAdmin, deleting, onClose, onEdit, onDelete,
}: {
  feature: MapFeature | null
  wardSummary: { ward: string; assets: number; projects: number } | null
  isAdmin: boolean
  deleting: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setConfirmDelete(false)
  }, [feature?.id])

  if (!feature) return null
  const p = feature.properties ?? {}

  return (
    <Drawer open onClose={onClose} title={p.name ?? t('map.featureDetails')}>
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border border-border bg-surface-subtle text-text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: FEATURE_TYPE_CONFIG[feature.feature_type].color }} />
            {t(FEATURE_TYPE_CONFIG[feature.feature_type].labelKey)}
          </span>
          {p.status && <MapStatusBadge status={p.status} />}
        </div>

        {wardSummary ? (
          <section aria-label={t('map.wardSummary')} className="border border-border rounded-xl p-4 bg-surface-subtle">
            <h3 className="h4 mb-3">{t('map.wardSummaryTitle', { ward: wardSummary.ward })}</h3>
            <dl className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface border border-border rounded-lg">
                <dt className="caption mb-1">{t('map.wardAssets')}</dt>
                <dd className="text-xl font-bold text-ink">{wardSummary.assets}</dd>
              </div>
              <div className="p-3 bg-surface border border-border rounded-lg">
                <dt className="caption mb-1">{t('map.wardProjects')}</dt>
                <dd className="text-xl font-bold text-ink">{wardSummary.projects}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section aria-label={t('map.featureDetails')}>
            {p.description && <p className="text-sm text-text-muted leading-relaxed">{p.description}</p>}
            <dl className="space-y-3 text-sm mt-3">
              {p.ward && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">{t('map.ward')}</dt>
                  <dd className="font-medium text-ink">{p.ward}</dd>
                </div>
              )}
              {feature.feature_type === 'project' && typeof p.progress === 'number' && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <dt className="text-text-muted">{t('map.progress')}</dt>
                    <dd className="font-medium text-ink">{p.progress}%</dd>
                  </div>
                  <div className="h-2 bg-surface-subtle border border-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              )}
              {feature.updated_at && isValidDate(new Date(feature.updated_at)) && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">{t('map.lastUpdated')}</dt>
                  <dd className="font-medium text-ink">{formatDate(feature.updated_at)}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {isAdmin && (
          <div className="flex gap-2 pt-2 border-t border-border">
            {confirmDelete ? (
              <>
                <Button variant="danger-ghost" size="sm" className="flex-1" isLoading={deleting} onClick={onDelete}>
                  {t('map.confirmDelete')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="default" size="sm" className="flex-1" onClick={onEdit}>
                  <Pencil size={14} />
                  {t('map.editFeature')}
                </Button>
                <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                  {t('map.deleteFeature')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Drawer>
  )
}

/* ── Add / edit form drawer ───────────────────────────────────────────────── */
function FeatureFormDrawer({
  editing, draftType, draftCoords, draftVertices, saving, onClose, onSubmit,
}: {
  editing: MapFeature | null
  draftType?: MapFeatureType
  draftCoords?: [number, number]
  draftVertices?: [number, number][]
  saving: boolean
  onClose: () => void
  onSubmit: (payload: MapFeaturePayload) => void
}) {
  const { t } = useTranslation()
  const [type, setType] = useState<MapFeatureType>(editing?.feature_type ?? draftType ?? 'water_tank')
  const [name, setName] = useState(editing?.properties?.name ?? '')
  const [ward, setWard] = useState(editing?.properties?.ward ?? '')
  const [status, setStatus] = useState(editing?.properties?.status ?? '')
  const [description, setDescription] = useState(editing?.properties?.description ?? '')
  const [progress, setProgress] = useState<number>(editing?.properties?.progress ?? 0)
  const [error, setError] = useState('')

  const kind = geometryKindOf(type)
  const isLine = kind === 'line'

  const statusOptions = type === 'project'
    ? ['planned', 'approved', 'in_progress', 'completed', 'verified']
    : ['operational', 'needs_attention', 'under_maintenance', 'inactive']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('map.nameRequired'))
      return
    }
    if (!editing && kind === 'point' && !draftCoords) {
      setError(t('map.pickLocation'))
      return
    }
    if (!editing && isLine && (draftVertices?.length ?? 0) < 2) {
      setError(t('map.pickLocation'))
      return
    }
    setError('')
    const properties: MapFeature['properties'] = { name: name.trim() }
    if (ward.trim()) properties.ward = ward.trim()
    if (type === 'project') {
      properties.status = status || 'planned'
      properties.progress = progress
    } else if (status) {
      properties.status = status
    }
    if (description.trim()) properties.description = description.trim()

    let geometry: MapFeature['geometry']
    if (kind === 'point') {
      const coords = editing?.geometry.type === 'Point' ? editing.geometry.coordinates : draftCoords!
      geometry = { type: 'Point', coordinates: coords }
    } else if (isLine) {
      const coords = editing?.geometry.type === 'LineString' ? editing.geometry.coordinates : draftVertices!
      geometry = { type: 'LineString', coordinates: coords }
    } else {
      geometry = editing!.geometry
    }
    onSubmit({ type, geometry, properties })
  }

  return (
    <Drawer open onClose={onClose} title={editing ? t('map.editFeature') : t('map.addAsset')}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p role="alert" className="p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="mf-type" className="label block mb-1.5">{t('map.featureType')}</label>
          <select
            id="mf-type"
            value={type}
            onChange={(e) => setType(e.target.value as MapFeatureType)}
            disabled={Boolean(editing)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60"
          >
            {CREATABLE_TYPES.map((tp) => (
              <option key={tp} value={tp}>{t(FEATURE_TYPE_CONFIG[tp].labelKey)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mf-name" className="label block mb-1.5">{t('map.nameLabel')}</label>
          <input
            id="mf-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('map.namePlaceholder')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="mf-ward" className="label block mb-1.5">{t('map.ward')}</label>
          <input
            id="mf-ward"
            type="text"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            placeholder={t('map.wardPlaceholder')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="mf-status" className="label block mb-1.5">{t('map.statusLabel')}</label>
          <select
            id="mf-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{t('map.noStatus')}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{t(`map.status.${s}`)}</option>
            ))}
          </select>
        </div>

        {type === 'project' && (
          <div>
            <label htmlFor="mf-progress" className="label block mb-1.5">{t('map.progressLabel')} {progress}%</label>
            <input
              id="mf-progress"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[#166534]"
            />
          </div>
        )}

        <div>
          <label htmlFor="mf-desc" className="label block mb-1.5">{t('map.descLabel')}</label>
          <textarea
            id="mf-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
          />
        </div>

        {!editing && (
          <p className="text-[0.8rem] text-text-muted flex items-center gap-1.5">
            <Crosshair size={13} className="text-primary shrink-0" />
            {isLine
              ? t('map.pickedVertices', { count: draftVertices?.length ?? 0 })
              : t('map.pickedLocation', {
                  coords: draftCoords ? `${draftCoords[1].toFixed(5)}, ${draftCoords[0].toFixed(5)}` : '—',
                })}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={saving}>
            {t('map.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
