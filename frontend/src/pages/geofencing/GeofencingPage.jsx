import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Shield, Trash2, MapPin, ChevronRight, Link2, Activity } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import {
  listFences, createFence, deleteFence,
  listAssignments, createAssignment, deleteAssignment,
} from '../../api/geofencing.js'
import { listFirearms } from '../../api/firearms.js'
import { useAuthStore } from '../../store/authStore.js'

// ── Shared primitives ─────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-5 h-px bg-red-600" />
      <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">{children}</span>
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
      {children}
    </label>
  )
}

function Input({ ...props }) {
  return (
    <input
      className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-2.5 rounded
        font-mono placeholder:text-zinc-700 focus:outline-none focus:border-red-600 transition-colors"
      {...props}
    />
  )
}

function StyledSelect({ children, ...props }) {
  return (
    <select
      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-2.5
        rounded font-mono focus:outline-none focus:border-red-600 transition-colors"
      {...props}
    >
      {children}
    </select>
  )
}

function PrimaryBtn({ children, disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
        text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
      {...props}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, ...props }) {
  return (
    <button
      className="border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500
        text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded transition-colors"
      {...props}
    >
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeofencingPage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const layersRef = useRef({})

  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [drawnCoords, setDrawnCoords] = useState(null)
  const [activeFence, setActiveFence] = useState(null)

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: fences, isLoading } = useQuery({ queryKey: ['fences'], queryFn: listFences })
  const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: listAssignments })
  const { data: firearms } = useQuery({ queryKey: ['firearms'], queryFn: () => listFirearms() })

  const fenceList     = useMemo(() => fences?.results     ?? fences     ?? [], [fences])
  const assignmentList= useMemo(() => assignments?.results ?? assignments ?? [], [assignments])
  const firearmsList  = useMemo(() => firearms?.results   ?? [],                [firearms])

  const fenceDrawKey = useMemo(
    () => fenceList.map((f) => `${f.id}:${f.updated_at ?? f.created_at ?? ''}:${f.color ?? ''}`).join('|'),
    [fenceList],
  )

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: createFence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fences'] })
      toast.success('Zone created')
      setShowCreate(false)
      setDrawnCoords(null)
      reset()
    },
    onError: () => toast.error('Failed to create zone'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteFence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fences'] })
      toast.success('Zone deleted')
      setDeleteTarget(null)
      setActiveFence(null)
    },
  })

  const assignMut = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignment created')
      setShowAssign(false)
      resetAssign()
    },
    onError: () => toast.error('Failed to assign'),
  })

  const deleteAssignMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const { register, handleSubmit, reset } = useForm({ defaultValues: { color: '#dc2626' } })
  const { register: registerAssign, handleSubmit: handleAssignSubmit, reset: resetAssign } = useForm({ defaultValues: { rule: 'stay_inside' } })

  // ── Init Leaflet map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    import('leaflet').then((leaflet) => {
      const L = leaflet.default

      // Dark map CSS overrides
      const style = document.createElement('style')
      style.textContent = `
        .leaflet-container { background: #09090b; }
        .leaflet-popup-content-wrapper {
          background: #18181b !important; border: 1px solid #27272a !important;
          border-radius: 8px !important; box-shadow: 0 20px 40px rgba(0,0,0,0.7) !important; padding: 0 !important;
        }
        .leaflet-popup-tip { background: #18181b !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-control-zoom a { background: #18181b !important; border-color: #27272a !important; color: #a1a1aa !important; }
        .leaflet-control-zoom a:hover { background: #27272a !important; color: #fff !important; }
        .leaflet-control-attribution { background: #09090b99 !important; color: #3f3f46 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #52525b !important; }
      `
      document.head.appendChild(style)

      const map = L.map(mapRef.current, { zoomControl: false }).setView([-25.7, 28.2], 10)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapInstanceRef.current = map
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // ── Draw/refresh fence polygons ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || fenceList.length === 0) return
    let cancelled = false

    import('leaflet').then((leaflet) => {
      if (cancelled) return
      const L = leaflet.default
      const map = mapInstanceRef.current

      Object.values(layersRef.current).forEach((layer) => {
        try { map.removeLayer(layer) } catch { /* ignore */ }
      })
      layersRef.current = {}

      fenceList.forEach((fence) => {
        if (!fence.area_geojson && !fence.area) return
        try {
          const geojson = fence.area_geojson || fence.area
          const isActive = activeFence?.id === fence.id
          const color = fence.color || '#dc2626'
          const layer = L.geoJSON(geojson, {
            style: {
              color,
              weight: isActive ? 2.5 : 1.5,
              fillOpacity: isActive ? 0.2 : 0.1,
              dashArray: isActive ? null : '6 4',
            },
          }).addTo(map)
          layer.bindPopup(`
            <div style="padding:10px;font-family:'JetBrains Mono',monospace;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;"></div>
                <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.05em;">${fence.name}</span>
              </div>
              ${fence.description ? `<p style="color:#71717a;font-size:11px;margin:0;">${fence.description}</p>` : ''}
            </div>
          `, { closeButton: false })
          layersRef.current[fence.id] = layer
        } catch { /* ignore */ }
      })
    })

    return () => { cancelled = true }
  }, [fenceDrawKey, fenceList, activeFence])

  // Fly to active fence
  useEffect(() => {
    if (!activeFence || !mapInstanceRef.current) return
    const layer = layersRef.current[activeFence.id]
    if (layer) {
      try {
        mapInstanceRef.current.flyToBounds(layer.getBounds(), { padding: [40, 40], duration: 1 })
        layer.openPopup()
      } catch { /* ignore */ }
    }
  }, [activeFence])

  const onCreateSubmit = (data) => {
    if (!drawnCoords) { toast.error('Enter polygon coordinates first'); return }
    if (activeOrg) data.organization = activeOrg.id
    data.area_geojson = { type: 'Polygon', coordinates: [drawnCoords] }
    createMut.mutate(data)
  }

  // Active fence assignments
  const activeFenceAssignments = activeFence
    ? assignmentList.filter((a) => String(a.geofence) === String(activeFence.id))
    : []

  return (
    <div className="flex flex-col min-h-full bg-black">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 px-6 py-5 relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute right-0 top-0 w-48 h-full bg-red-600/4 blur-3xl pointer-events-none" />
        <div className="relative flex items-end justify-between">
          <div>
            <SectionLabel>Tactical Boundaries</SectionLabel>
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white mt-2">
              Geofencing
            </h1>
          </div>
          <PrimaryBtn onClick={() => { reset(); setShowCreate(true) }}>
            <Plus size={14} /> New Zone
          </PrimaryBtn>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="w-80 bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-hidden shrink-0">

          {/* Zones header */}
          <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-red-400" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Zones</span>
            </div>
            <span className="text-xs font-mono text-zinc-600">{fenceList.length}</span>
          </div>

          {/* Zone list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-zinc-800" />
                    <div className="h-3 bg-zinc-800 rounded flex-1" />
                  </div>
                </div>
              ))
            ) : fenceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                  <Shield size={18} className="text-zinc-700" />
                </div>
                <p className="text-zinc-600 text-xs font-mono uppercase tracking-wider text-center">
                  No zones defined
                </p>
              </div>
            ) : (
              fenceList.map((fence) => {
                const isActive = activeFence?.id === fence.id
                return (
                  <div
                    key={fence.id}
                    onClick={() => setActiveFence(isActive ? null : fence)}
                    className={`rounded-lg border px-3 py-3 cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-red-600/10 border-red-600/30'
                        : 'bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
                          style={{ background: fence.color ?? '#dc2626' }}
                        />
                        <span className="text-sm text-zinc-200 truncate font-medium">{fence.name}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(fence) }}
                        className="p-1 rounded text-zinc-700 hover:text-red-400 hover:bg-red-600/10 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {fence.description && (
                      <p className="text-xs text-zinc-600 font-mono mt-1.5 truncate pl-5">{fence.description}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Assignments section */}
          <div className="border-t border-zinc-900 shrink-0">
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-zinc-500" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Assignments</span>
              </div>
              <button
                onClick={() => { resetAssign(); setShowAssign(true) }}
                className="text-xs text-red-500 hover:text-red-400 font-mono uppercase tracking-wider transition-colors"
              >
                + Assign
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto">
              {assignmentList.length === 0 ? (
                <p className="px-4 py-4 text-xs text-zinc-700 font-mono text-center">No assignments</p>
              ) : (
                <div className="p-2 space-y-1">
                  {assignmentList.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 bg-zinc-900/60 border border-zinc-800/60
                        rounded px-3 py-2 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300 font-mono truncate">{a.firearm ?? a.geofence}</p>
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                          {a.rule?.replace('_', ' ')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAssignMut.mutate(a.id)}
                        className="p-1 rounded text-zinc-700 hover:text-red-400 hover:bg-red-600/10
                          transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative bg-zinc-950 overflow-hidden">
          <div ref={mapRef} className="w-full h-full" />

          {/* No org overlay */}
          {!activeOrg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-4">
              <div className="w-12 h-12 bg-red-600/10 border border-red-600/25 rounded-lg flex items-center justify-center">
                <Activity size={22} className="text-red-400" />
              </div>
              <p className="text-white font-display font-bold uppercase tracking-wide">
                No Organization Selected
              </p>
            </div>
          )}

          {/* Active fence detail panel */}
          {activeFence && (
            <div className="absolute top-4 right-4 w-64 bg-zinc-950/95 backdrop-blur-sm border border-zinc-800
              rounded-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
                    style={{ background: activeFence.color ?? '#dc2626' }}
                  />
                  <span className="text-white text-xs font-mono font-bold truncate">{activeFence.name}</span>
                </div>
                <button
                  onClick={() => setActiveFence(null)}
                  className="text-zinc-600 hover:text-zinc-300 text-xs font-mono ml-2 shrink-0"
                >✕</button>
              </div>
              <div className="p-4 space-y-2">
                {activeFence.description && (
                  <p className="text-zinc-500 text-xs font-mono leading-relaxed pb-2 border-b border-zinc-800">
                    {activeFence.description}
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600 text-[11px] font-mono uppercase tracking-wider">Assignments</span>
                  <span className="text-zinc-300 text-[11px] font-mono">{activeFenceAssignments.length}</span>
                </div>
                {activeFenceAssignments.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {activeFenceAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-zinc-900 rounded px-2 py-1.5">
                        <span className="text-zinc-400 text-[11px] font-mono">{a.firearm ?? '—'}</span>
                        <span className="text-zinc-600 text-[10px] font-mono uppercase">{a.rule?.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setDeleteTarget(activeFence)}
                  className="w-full flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-zinc-800
                    text-zinc-600 hover:text-red-400 text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  <Trash2 size={12} /> Delete Zone
                </button>
              </div>
            </div>
          )}

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800
            rounded-lg px-4 py-2.5 flex items-center gap-3">
            <div className="w-4 h-0.5 bg-red-600" />
            <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider">
              {fenceList.length} zone{fenceList.length !== 1 ? 's' : ''} rendered
            </span>
          </div>
        </div>
      </div>

      {/* ── Create zone modal ─────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Geofence Zone" size="md">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
          {/* Info note */}
          <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <MapPin size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-zinc-500 text-xs font-mono leading-relaxed">
              Enter GeoJSON polygon coordinates below. Full map drawing requires the Leaflet.draw plugin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Name *</FieldLabel>
              <Input placeholder="Armoury Zone" {...register('name', { required: true })} />
            </div>
            <div>
              <FieldLabel>Zone Color</FieldLabel>
              <input
                type="color"
                className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 cursor-pointer
                  focus:outline-none focus:border-red-600 transition-colors"
                {...register('color')}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <Input placeholder="Optional description..." {...register('description')} />
          </div>

          <div>
            <FieldLabel>Polygon Coordinates (GeoJSON ring)</FieldLabel>
            <textarea
              rows={4}
              placeholder='[[28.2,-25.7],[28.3,-25.7],[28.3,-25.8],[28.2,-25.8],[28.2,-25.7]]'
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-4 py-3 rounded
                font-mono placeholder:text-zinc-700 focus:outline-none focus:border-red-600 transition-colors resize-none"
              onChange={(e) => {
                try { setDrawnCoords(JSON.parse(e.target.value)) } catch { /* ignore */ }
              }}
            />
            <p className="text-zinc-700 text-xs font-mono mt-1.5">
              Format: [lng, lat] pairs. Close the ring by repeating the first point.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
            <GhostBtn type="button" onClick={() => setShowCreate(false)}>Cancel</GhostBtn>
            <PrimaryBtn type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Spinner size="sm" /> : <Plus size={13} />}
              Create Zone
              <ChevronRight size={13} />
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* ── Assign modal ──────────────────────────────────────────────────── */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Create Assignment" size="sm">
        <form onSubmit={handleAssignSubmit((d) => assignMut.mutate(d))} className="space-y-5">
          <div>
            <FieldLabel>Geofence Zone *</FieldLabel>
            <StyledSelect {...registerAssign('geofence', { required: true })}>
              <option value="">Select zone</option>
              {fenceList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>Firearm *</FieldLabel>
            <StyledSelect {...registerAssign('firearm', { required: true })}>
              <option value="">Select firearm</option>
              {firearmsList.map((f) => (
                <option key={f.id} value={f.id}>{f.serial_number} — {f.make} {f.model}</option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>Rule</FieldLabel>
            <StyledSelect {...registerAssign('rule')}>
              <option value="stay_inside">Stay Inside</option>
              <option value="stay_outside">Stay Outside</option>
            </StyledSelect>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
            <GhostBtn type="button" onClick={() => setShowAssign(false)}>Cancel</GhostBtn>
            <PrimaryBtn type="submit" disabled={assignMut.isPending}>
              {assignMut.isPending && <Spinner size="sm" />}
              Assign <ChevronRight size={13} />
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* ── Confirm delete ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Delete Zone"
        message={`Delete "${deleteTarget?.name}"? All assignments will be removed.`}
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}