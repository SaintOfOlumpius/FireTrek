import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Shield, Trash2, MapPin, ChevronRight, Link2, Activity,
  X, AlertTriangle, Pencil, Layers, Clock,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import {
  listFences, createFence, deleteFence, updateFence,
  listAssignments, createAssignment, deleteAssignment,
  listEvents,
} from '../../api/geofencing.js'
import { listFirearms } from '../../api/firearms.js'
import { useAuthStore } from '../../store/authStore.js'

const FieldLabel = ({ children, required }) => (
  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
)

const TextInput = ({ error, ...p }) => (
  <input
    className={`w-full bg-zinc-900 border text-white text-sm px-3.5 py-2 rounded-md font-mono
      placeholder:text-zinc-700 focus:outline-none transition-colors
      ${error ? 'border-red-600/50' : 'border-zinc-800 focus:border-zinc-600'}`}
    {...p}
  />
)

const Sel = ({ children, ...p }) => (
  <select
    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-3.5 py-2
      rounded-md font-mono focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
    {...p}
  >{children}</select>
)

const Btn = ({ children, variant = 'primary', size = 'md', loading, disabled, className = '', ...p }) => {
  const s = { sm: 'text-[10px] px-3 py-1.5 gap-1.5', md: 'text-xs px-4 py-2 gap-2' }
  const v = {
    primary: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500',
    danger: 'bg-red-950/40 border border-red-600/20 text-red-400 hover:bg-red-950/60',
  }
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center font-mono uppercase tracking-widest rounded-md
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${s[size]} ${v[variant]} ${className}`}
      {...p}
    >
      {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  const w = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${w[size]} bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl`} style={{ zIndex: 10000 }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-4 bg-red-600 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const Confirm = ({ open, onClose, onConfirm, title, message, loading }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-zinc-950 border border-red-900/30 rounded-xl shadow-2xl p-5" style={{ zIndex: 10000 }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-white text-xs font-mono uppercase tracking-wider mb-1">{title}</p>
            <p className="text-zinc-500 text-xs font-mono leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" size="sm" loading={loading} onClick={onConfirm}>Delete</Btn>
        </div>
      </div>
    </div>
  )
}

const DirBadge = ({ dir }) => dir === 'enter'
  ? <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-mono uppercase tracking-wider"><ArrowDownLeft size={10} />Enter</span>
  : <span className="flex items-center gap-1 text-red-400 text-[9px] font-mono uppercase tracking-wider"><ArrowUpRight size={10} />Exit</span>

export default function GeofencingPage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()

  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const layersRef = useRef({})
  const drawLayerRef = useRef(null)
  const drawHandlerRef = useRef(null)

  const [tab, setTab] = useState('zones')
  const [activeFence, setActiveFence] = useState(null)
  const [drawState, setDrawState] = useState('idle') // idle | drawing | drawn
  const [drawnGeoJSON, setDrawnGeoJSON] = useState(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteAssignTarget, setDeleteAssignTarget] = useState(null)

  const orgId = activeOrg?.id

  const { data: fences, isLoading: fencesLoading } = useQuery({
    queryKey: ['fences', orgId],
    queryFn: () => listFences({ organization: orgId }),
    enabled: !!orgId,
  })
  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['assignments', orgId],
    queryFn: () => listAssignments({ organization: orgId }),
    enabled: !!orgId,
  })
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['geofence-events', orgId],
    queryFn: () => listEvents({ organization: orgId }),
    enabled: !!orgId && tab === 'events',
    refetchInterval: 30_000,
  })
  const { data: firearms } = useQuery({
    queryKey: ['firearms', orgId],
    queryFn: () => listFirearms({ organization: orgId }),
    enabled: !!orgId,
  })

  const fenceList   = useMemo(() => fences?.results   ?? fences   ?? [], [fences])
  const assignList  = useMemo(() => assignments?.results ?? assignments ?? [], [assignments])
  const eventList   = useMemo(() => events?.results   ?? events   ?? [], [events])
  const firearmList = useMemo(() => firearms?.results ?? [], [firearms])

  const fenceDrawKey = useMemo(
    () => fenceList.map((f) => `${f.id}:${f.updated_at ?? ''}:${f.color ?? ''}:${activeFence?.id ?? ''}`).join('|'),
    [fenceList, activeFence],
  )

  const createMut = useMutation({
    mutationFn: createFence,
    onSuccess: (newFence) => {
      qc.invalidateQueries({ queryKey: ['fences'] })
      toast.success('Zone created')
      setShowSaveForm(false)
      setDrawnGeoJSON(null)
      setDrawState('idle')
      resetCreate()
      drawLayerRef.current?.clearLayers()
      setActiveFence(newFence)
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create zone'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateFence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fences'] })
      toast.success('Zone updated')
      setShowEdit(false)
    },
    onError: () => toast.error('Failed to update zone'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteFence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fences'] })
      qc.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Zone deleted')
      setDeleteTarget(null)
      setActiveFence(null)
    },
  })

  const assignMut = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Rule created')
      setShowAssign(false)
      resetAssign()
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create rule'),
  })

  const deleteAssignMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Rule removed')
      setDeleteAssignTarget(null)
    },
  })

  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate, formState: { errors: errCreate } } =
    useForm({ defaultValues: { color: '#ef4444' } })
  const { register: regEdit, handleSubmit: hsEdit, reset: resetEdit } = useForm()
  const { register: regAssign, handleSubmit: hsAssign, reset: resetAssign } =
    useForm({ defaultValues: { rule: 'stay_inside' } })

  // Map init
  useEffect(() => {
    if (mapInst.current || !mapRef.current) return
    const container = mapRef.current
    if (container._leaflet_id) return

    import('leaflet').then(({ default: L }) => {
      if (mapInst.current || !container || container._leaflet_id) return
      window.L = L

      return import('leaflet-draw').then(() => {
        if (mapInst.current || container._leaflet_id) return

        const style = document.createElement('style')
        style.textContent = `
          .leaflet-container{background:#09090b}
          .leaflet-popup-content-wrapper{background:#18181b!important;border:1px solid #27272a!important;border-radius:10px!important;box-shadow:0 24px 48px rgba(0,0,0,.8)!important;padding:0!important}
          .leaflet-popup-tip{background:#18181b!important}
          .leaflet-popup-content{margin:0!important}
          .leaflet-control-zoom a{background:#18181b!important;border-color:#27272a!important;color:#71717a!important}
          .leaflet-control-zoom a:hover{background:#27272a!important;color:#fff!important}
          .leaflet-control-attribution{background:#09090b99!important;color:#3f3f46!important;font-size:9px!important}
          .leaflet-draw-guide-dash{background:#ef4444!important}
          .leaflet-draw-tooltip{background:#18181b!important;border:1px solid #27272a!important;color:#a1a1aa!important;border-radius:6px!important;font-family:monospace!important;font-size:11px!important;padding:4px 8px!important}
          .leaflet-mouse-marker{cursor:crosshair!important}
        `
        document.head.appendChild(style)

        const map = L.map(container, { zoomControl: false }).setView([-25.7, 28.2], 10)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
        }).addTo(map)
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        const drawnItems = new L.FeatureGroup().addTo(map)
        drawLayerRef.current = drawnItems

        map.on(L.Draw.Event.CREATED, (e) => {
          drawnItems.clearLayers()
          drawnItems.addLayer(e.layer)
          setDrawnGeoJSON(e.layer.toGeoJSON().geometry)
          setDrawState('drawn')
          setShowSaveForm(true)
        })

        mapInst.current = map
      })
    })

    return () => {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
    }
  }, [])

  const startDraw = useCallback(() => {
    if (!mapInst.current || !window.L) return
    const L = window.L
    drawLayerRef.current?.clearLayers()
    setDrawnGeoJSON(null)
    setDrawState('drawing')
    setShowSaveForm(false)
    setActiveFence(null)

    const handler = new L.Draw.Polygon(mapInst.current, {
      shapeOptions: { color: '#ef4444', weight: 2, fillOpacity: 0.12 },
      allowIntersection: false,
      showArea: true,
      metric: true,
    })
    handler.enable()
    drawHandlerRef.current = handler
  }, [])

  const cancelDraw = useCallback(() => {
    drawHandlerRef.current?.disable()
    drawHandlerRef.current = null
    drawLayerRef.current?.clearLayers()
    setDrawState('idle')
    setDrawnGeoJSON(null)
    setShowSaveForm(false)
    resetCreate()
  }, [resetCreate])

  // Render fence polygons
  useEffect(() => {
    if (!mapInst.current || fenceList.length === 0) return
    let cancelled = false
    import('leaflet').then(({ default: L }) => {
      if (cancelled) return
      const map = mapInst.current
      Object.values(layersRef.current).forEach((l) => { try { map.removeLayer(l) } catch { } })
      layersRef.current = {}

      fenceList.forEach((fence) => {
        const raw = fence.area ?? fence.area_geojson
        if (!raw) return
        try {
          const geojson = typeof raw === 'string' ? JSON.parse(raw) : raw
          const isSelected = activeFence?.id === fence.id
          const color = fence.color || '#ef4444'
          const layer = L.geoJSON(geojson, {
            style: {
              color,
              weight: isSelected ? 2.5 : 1.5,
              fillOpacity: isSelected ? 0.18 : 0.06,
              dashArray: isSelected ? null : '5 4',
              opacity: fence.is_active ? 1 : 0.35,
            },
          }).addTo(map)

          layer.bindPopup(`
            <div style="padding:12px;font-family:'JetBrains Mono',monospace;min-width:160px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="width:8px;height:8px;border-radius:2px;background:${color}"></div>
                <span style="color:#fff;font-size:12px;font-weight:700">${fence.name}</span>
                ${!fence.is_active ? '<span style="font-size:9px;color:#52525b;margin-left:4px">INACTIVE</span>' : ''}
              </div>
              ${fence.description ? `<p style="color:#71717a;font-size:11px;margin:0 0 6px">${fence.description}</p>` : ''}
              <div style="color:#52525b;font-size:10px">${fence.assignment_count ?? 0} rule${(fence.assignment_count ?? 0) !== 1 ? 's' : ''}</div>
            </div>
          `, { closeButton: false })

          layer.on('click', () => {
            if (drawState === 'idle') setActiveFence(fence)
          })
          layersRef.current[fence.id] = layer
        } catch { }
      })
    })
    return () => { cancelled = true }
  }, [fenceDrawKey, fenceList, activeFence, drawState])

  useEffect(() => {
    if (!activeFence || !mapInst.current) return
    const layer = layersRef.current[activeFence.id]
    if (layer) {
      try { mapInst.current.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 0.8 }) } catch { }
    }
  }, [activeFence])

  const onCreateSubmit = (data) => {
    if (!drawnGeoJSON) { toast.error('Draw a polygon first'); return }
    createMut.mutate({ ...data, organization: orgId, area_geojson: drawnGeoJSON })
  }

  const onEditSubmit = (data) => {
    if (!activeFence) return
    updateMut.mutate({ id: activeFence.id, data })
  }

  const openEdit = (fence) => {
    setActiveFence(fence)
    resetEdit({ name: fence.name, description: fence.description, color: fence.color, is_active: fence.is_active })
    setShowEdit(true)
  }

  const activeFenceAssigns = useMemo(
    () => activeFence ? assignList.filter((a) => String(a.geofence) === String(activeFence.id)) : [],
    [activeFence, assignList],
  )

  return (
    <div className="flex flex-col h-full bg-black" style={{ minHeight: 0 }}>

      {/* Header */}
      <div className="shrink-0 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-px bg-red-600" />
            <span className="text-red-500 text-[9px] font-mono uppercase tracking-[0.35em]">Tactical Boundaries</span>
          </div>
          <h1 className="text-lg font-mono font-bold uppercase tracking-wide text-white">Geofencing</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-px border border-zinc-800 rounded-md overflow-hidden">
            {[
              { k: 'zones', label: `Zones (${fenceList.length})` },
              { k: 'assignments', label: `Rules (${assignList.length})` },
              { k: 'events', label: 'Events' },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  tab === k ? 'bg-zinc-800 text-white' : 'bg-zinc-950 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {drawState === 'idle'
            ? <Btn onClick={startDraw}><Plus size={12} /> New Zone</Btn>
            : <Btn variant="ghost" onClick={cancelDraw}><X size={12} /> Cancel</Btn>
          }
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col border-r border-zinc-900 bg-zinc-950 overflow-hidden">

          {tab === 'zones' && (
            <>
              <div className="shrink-0 px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={11} className="text-red-500" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500">Zones</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-700">{fenceList.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                {fencesLoading
                  ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-zinc-900/60 rounded-lg border border-zinc-800/30 animate-pulse" />)
                  : fenceList.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <div className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                        <Shield size={16} className="text-zinc-700" />
                      </div>
                      <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-wider">No zones defined</p>
                      <Btn size="sm" onClick={startDraw}><Plus size={10} /> Draw first zone</Btn>
                    </div>
                  )
                  : fenceList.map((fence) => {
                      const isSelected = activeFence?.id === fence.id
                      return (
                        <div
                          key={fence.id}
                          onClick={() => drawState === 'idle' && setActiveFence(isSelected ? null : fence)}
                          className={`rounded-lg border px-3 py-2.5 transition-all duration-150 group ${
                            drawState !== 'idle' ? 'cursor-default opacity-50' :
                            isSelected ? 'bg-red-950/20 border-red-800/30 cursor-pointer' : 'bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50 hover:bg-zinc-900/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: fence.color ?? '#ef4444', opacity: fence.is_active ? 1 : 0.4 }} />
                              <span className={`text-xs font-mono truncate ${fence.is_active ? 'text-zinc-200' : 'text-zinc-500'}`}>{fence.name}</span>
                              {!fence.is_active && <span className="text-[8px] font-mono text-zinc-700 uppercase shrink-0">off</span>}
                            </div>
                            {drawState === 'idle' && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(fence) }} className="p-1 rounded text-zinc-700 hover:text-zinc-300 transition-colors">
                                  <Pencil size={10} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(fence) }} className="p-1 rounded text-zinc-700 hover:text-red-400 transition-colors">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                          {fence.description && <p className="text-[10px] text-zinc-600 font-mono mt-1 truncate pl-5">{fence.description}</p>}
                          <p className="text-[9px] text-zinc-700 font-mono mt-1 pl-5">{fence.assignment_count ?? 0} rule{(fence.assignment_count ?? 0) !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    })
                }
              </div>
            </>
          )}

          {tab === 'assignments' && (
            <>
              <div className="shrink-0 px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={11} className="text-zinc-600" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500">Rules</span>
                </div>
                <Btn size="sm" onClick={() => { resetAssign(); setShowAssign(true) }}><Plus size={10} /> Add</Btn>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                {assignLoading
                  ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-zinc-900/60 rounded-lg border border-zinc-800/30 animate-pulse" />)
                  : assignList.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <Link2 size={16} className="text-zinc-700" />
                      <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-wider">No rules defined</p>
                    </div>
                  )
                  : assignList.map((a) => (
                    <div key={a.id} className="rounded-lg border border-zinc-800/30 bg-zinc-900/30 px-3 py-2.5 group hover:border-zinc-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-zinc-300 font-mono truncate">{a.firearm_display ?? a.firearm_serial ?? a.firearm}</p>
                          <p className="text-[9px] text-zinc-600 font-mono mt-0.5 truncate">{a.geofence_name ?? a.geofence}</p>
                          <span className={`inline-block mt-1 text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            a.rule === 'stay_inside' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' : 'bg-orange-950/40 text-orange-400 border border-orange-900/30'
                          }`}>{a.rule?.replace('_', ' ')}</span>
                        </div>
                        <button onClick={() => setDeleteAssignTarget(a)} className="p-1 rounded text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}

          {tab === 'events' && (
            <>
              <div className="shrink-0 px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={11} className="text-zinc-600" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500">Events</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-700">Last 200</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                {eventsLoading
                  ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-zinc-900/60 rounded-lg border border-zinc-800/30 animate-pulse" />)
                  : eventList.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <Clock size={16} className="text-zinc-700" />
                      <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-wider">No events yet</p>
                    </div>
                  )
                  : eventList.map((ev) => (
                    <div key={ev.id} className="rounded-lg border border-zinc-800/30 bg-zinc-900/30 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-[10px] text-zinc-300 font-mono truncate flex-1">{ev.firearm_display ?? ev.firearm_serial}</p>
                        <DirBadge dir={ev.direction} />
                      </div>
                      <p className="text-[9px] text-zinc-600 font-mono truncate">{ev.geofence_name}</p>
                      <p className="text-[9px] text-zinc-700 font-mono mt-0.5">
                        {new Date(ev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {ev.alert_generated && <span className="ml-2 text-red-500">● alert</span>}
                      </p>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <div ref={mapRef} className="absolute inset-0" />

          {!activeOrg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-4 z-10">
              <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-xl flex items-center justify-center">
                <Activity size={20} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-mono uppercase tracking-wider">No Organization</p>
                <p className="text-zinc-600 text-xs font-mono mt-1">Select an org to view zones</p>
              </div>
            </div>
          )}

          {/* Drawing banner — pointer-events-none so it doesn't block map */}
          {drawState === 'drawing' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3
              bg-zinc-950/95 border border-red-800/40 rounded-lg px-4 py-2.5 shadow-xl pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-mono uppercase tracking-wider">
                Click to place points · Double-click to finish
              </span>
            </div>
          )}

          {/* Floating save form — appears after polygon drawn, no backdrop */}
          {showSaveForm && drawState === 'drawn' && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm
                bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
              style={{ zIndex: 1000 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white text-xs font-mono uppercase tracking-wider">Name This Zone</span>
                </div>
                <button onClick={cancelDraw} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <X size={13} />
                </button>
              </div>
              <form onSubmit={hsCreate(onCreateSubmit)} className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <FieldLabel required>Zone Name</FieldLabel>
                    <TextInput
                      placeholder="e.g. Armoury Zone"
                      error={errCreate.name}
                      autoFocus
                      {...regCreate('name', { required: true })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Color</FieldLabel>
                    <input type="color" className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 cursor-pointer focus:outline-none" {...regCreate('color')} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <TextInput placeholder="Optional..." {...regCreate('description')} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Btn variant="ghost" type="button" size="sm" onClick={cancelDraw} className="flex-1 justify-center">Discard</Btn>
                  <Btn type="submit" size="sm" loading={createMut.isPending} className="flex-1 justify-center">Save Zone</Btn>
                </div>
              </form>
            </div>
          )}

          {/* Active fence panel */}
          {activeFence && drawState === 'idle' && (
            <div className="absolute top-4 right-4 w-56 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-10">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: activeFence.color ?? '#ef4444' }} />
                  <span className="text-white text-xs font-mono font-bold truncate">{activeFence.name}</span>
                </div>
                <button onClick={() => setActiveFence(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors ml-2 shrink-0"><X size={12} /></button>
              </div>
              <div className="p-3 space-y-2.5">
                {activeFence.description && <p className="text-zinc-500 text-[10px] font-mono leading-relaxed">{activeFence.description}</p>}
                <div className="space-y-1.5 text-[9px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 uppercase tracking-wider">Status</span>
                    <span className={activeFence.is_active ? 'text-emerald-400' : 'text-zinc-600'}>{activeFence.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 uppercase tracking-wider">Rules</span>
                    <span className="text-zinc-300">{activeFenceAssigns.length}</span>
                  </div>
                </div>
                {activeFenceAssigns.length > 0 && (
                  <div className="space-y-1 border-t border-zinc-800/60 pt-2">
                    {activeFenceAssigns.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-zinc-900/60 rounded px-2 py-1.5">
                        <span className="text-zinc-400 text-[9px] font-mono truncate flex-1">{a.firearm_serial ?? a.firearm}</span>
                        <span className={`text-[8px] font-mono uppercase ml-2 shrink-0 ${a.rule === 'stay_inside' ? 'text-blue-400' : 'text-orange-400'}`}>{a.rule?.replace('_', ' ')}</span>
                      </div>
                    ))}
                    {activeFenceAssigns.length > 3 && <p className="text-[9px] text-zinc-700 font-mono text-center">+{activeFenceAssigns.length - 3} more</p>}
                  </div>
                )}
                <div className="flex gap-1.5 pt-1 border-t border-zinc-800/60">
                  <Btn variant="ghost" size="sm" className="flex-1 justify-center" onClick={() => openEdit(activeFence)}><Pencil size={10} /> Edit</Btn>
                  <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(activeFence)}><Trash2 size={10} /></Btn>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800/60 rounded-lg px-3 py-2 flex items-center gap-3 z-10">
            <div className="w-3 h-px bg-red-600" />
            <span className="text-zinc-600 text-[9px] font-mono uppercase tracking-wider">
              {fenceList.filter(f => f.is_active).length} active · {fenceList.filter(f => !f.is_active).length} inactive
            </span>
          </div>
        </div>
      </div>

      {/* Edit Zone Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Zone" size="md">
        <form onSubmit={hsEdit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Name</FieldLabel>
              <TextInput placeholder="Zone name" {...regEdit('name', { required: true })} />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <input type="color" className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 cursor-pointer focus:outline-none" {...regEdit('color')} />
            </div>
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextInput placeholder="Description..." {...regEdit('description')} />
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div>
              <p className="text-zinc-300 text-xs font-mono">Active</p>
              <p className="text-zinc-600 text-[10px] font-mono mt-0.5">Inactive zones are ignored by the alert engine</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...regEdit('is_active')} />
              <div className="w-8 h-4 bg-zinc-700 rounded-full peer peer-checked:bg-red-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800/60">
            <Btn variant="ghost" type="button" onClick={() => setShowEdit(false)}>Cancel</Btn>
            <Btn type="submit" loading={updateMut.isPending}>Save Changes</Btn>
          </div>
        </form>
      </Modal>

      {/* Assign Rule Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Create Boundary Rule" size="sm">
        <form onSubmit={hsAssign((d) => assignMut.mutate({ ...d, organization: orgId }))} className="space-y-4">
          <div>
            <FieldLabel required>Geofence Zone</FieldLabel>
            <Sel {...regAssign('geofence', { required: true })}>
              <option value="">Select zone...</option>
              {fenceList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Sel>
          </div>
          <div>
            <FieldLabel required>Firearm</FieldLabel>
            <Sel {...regAssign('firearm', { required: true })}>
              <option value="">Select firearm...</option>
              {firearmList.map((f) => (
                <option key={f.id} value={f.id}>{f.serial_number} — {f.make} {f.model}</option>
              ))}
            </Sel>
          </div>
          <div>
            <FieldLabel>Rule</FieldLabel>
            <Sel {...regAssign('rule')}>
              <option value="stay_inside">Must Stay Inside zone</option>
              <option value="stay_outside">Must Stay Outside zone</option>
            </Sel>
            <p className="text-zinc-700 text-[9px] font-mono mt-1.5 leading-relaxed">An alert fires when the firearm crosses this boundary against the rule.</p>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800/60">
            <Btn variant="ghost" type="button" onClick={() => setShowAssign(false)}>Cancel</Btn>
            <Btn type="submit" loading={assignMut.isPending}>Create Rule <ChevronRight size={11} /></Btn>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Delete Zone"
        message={`Delete "${deleteTarget?.name}"? All linked rules and events will be permanently removed.`}
        loading={deleteMut.isPending}
      />

      <Confirm
        open={!!deleteAssignTarget}
        onClose={() => setDeleteAssignTarget(null)}
        onConfirm={() => deleteAssignMut.mutate(deleteAssignTarget.id)}
        title="Remove Rule"
        message="Remove this boundary rule? Violation alerts for this firearm/zone pair will stop."
        loading={deleteAssignMut.isPending}
      />
    </div>
  )
}