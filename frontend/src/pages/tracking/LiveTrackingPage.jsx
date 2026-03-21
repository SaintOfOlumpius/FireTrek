import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff, Battery, Navigation, Activity, MapPin, Radio } from 'lucide-react'
import { listDevices } from '../../api/devices.js'
import { useAuthStore } from '../../store/authStore.js'

let L = null
const EMPTY_ARR = []

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  online:      { dot: 'bg-emerald-500',           badge: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/25', label: 'Online',      mapColor: '#22c55e' },
  low_battery: { dot: 'bg-orange-500',             badge: 'bg-orange-600/15 text-orange-400 border-orange-600/25',   label: 'Low Battery', mapColor: '#f59e0b' },
  tampered:    { dot: 'bg-red-500 animate-pulse',  badge: 'bg-red-600/15 text-red-400 border-red-600/25',            label: 'Tampered',    mapColor: '#ef4444' },
  offline:     { dot: 'bg-zinc-600',               badge: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/25',         label: 'Offline',     mapColor: '#52525b' },
  decommissioned: { dot: 'bg-zinc-800',            badge: 'bg-zinc-800/60 text-zinc-600 border-zinc-700/25',         label: 'Decomm.',     mapColor: '#27272a' },
}
const getStatus = (s) => STATUS[s] ?? STATUS.offline

export default function LiveTrackingPage() {
  const { activeOrg, accessToken } = useAuthStore()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const wsRef = useRef(null)

  const [wsStatus, setWsStatus] = useState('disconnected')
  const [liveLocations, setLiveLocations] = useState({})
  const [selectedDevice, setSelectedDevice] = useState(null)

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
  })
  const devices = devicesData?.results || EMPTY_ARR
  const onlineCount = devices.filter((d) => d.status === 'online').length
  const liveCount = Object.keys(liveLocations).length

  // ── Init Leaflet map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    import('leaflet').then((leaflet) => {
      L = leaflet.default

      // Inject dark tile styles
      const style = document.createElement('style')
      style.textContent = `
        .leaflet-container { background: #09090b; }
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          border: 1px solid #27272a !important;
          border-radius: 8px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.7) !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip { background: #18181b !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-control-zoom a {
          background: #18181b !important;
          border-color: #27272a !important;
          color: #a1a1aa !important;
        }
        .leaflet-control-zoom a:hover { background: #27272a !important; color: #fff !important; }
        .leaflet-control-attribution { background: #09090b99 !important; color: #3f3f46 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #52525b !important; }
      `
      document.head.appendChild(style)

      const map = L.map(mapRef.current, { zoomControl: false }).setView([-25.7, 28.2], 10)

      // Dark OSM tiles
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

  // ── Update markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return

    devices.forEach((device) => {
      const live = liveLocations[device.uid]
      const lat = live?.latitude ?? device.last_latitude
      const lng = live?.longitude ?? device.last_longitude
      if (!lat || !lng) return

      const cfg = getStatus(device.status)
      const isLive = Boolean(live)

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:${cfg.mapColor};
          border:2px solid rgba(255,255,255,0.25);
          box-shadow:0 0 0 5px ${cfg.mapColor}28, 0 4px 12px rgba(0,0,0,0.6);
          ${isLive && device.status === 'online' ? 'animation:firetrek-pulse 2s ease-in-out infinite' : ''}
        "></div>
        <style>
          @keyframes firetrek-pulse {
            0%,100%{box-shadow:0 0 0 5px ${cfg.mapColor}28,0 4px 12px rgba(0,0,0,0.6)}
            50%{box-shadow:0 0 0 10px ${cfg.mapColor}10,0 4px 12px rgba(0,0,0,0.6)}
          }
        </style>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      const popupHtml = `
        <div style="padding:12px;min-width:180px;font-family:'JetBrains Mono',monospace;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #27272a;">
            <div style="width:8px;height:8px;border-radius:50%;background:${cfg.mapColor};flex-shrink:0;"></div>
            <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.05em;">${device.uid}</span>
            ${isLive ? '<span style="font-size:9px;background:#dc262620;color:#f87171;border:1px solid #dc262630;padding:1px 5px;border-radius:3px;letter-spacing:0.1em;">LIVE</span>' : ''}
          </div>
          <div style="space-y:4px;font-size:11px;color:#71717a;line-height:1.8;">
            <div>NAME &nbsp;<span style="color:#d4d4d8;">${device.name || '—'}</span></div>
            <div>LAT &nbsp;&nbsp;<span style="color:#d4d4d8;">${Number(lat).toFixed(6)}</span></div>
            <div>LNG &nbsp;&nbsp;<span style="color:#d4d4d8;">${Number(lng).toFixed(6)}</span></div>
            ${device.last_battery != null ? `<div>BAT &nbsp;&nbsp;<span style="color:${device.last_battery < 20 ? '#f87171' : '#34d399'};">${device.last_battery}%</span></div>` : ''}
            ${live?.speed != null ? `<div>SPD &nbsp;&nbsp;<span style="color:#d4d4d8;">${live.speed.toFixed(1)} m/s</span></div>` : ''}
          </div>
        </div>`

      if (markersRef.current[device.id]) {
        markersRef.current[device.id].setLatLng([lat, lng])
        markersRef.current[device.id].setIcon(icon)
      } else {
        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popupHtml, { closeButton: false, maxWidth: 220 })
        marker.on('click', () => setSelectedDevice(device))
        markersRef.current[device.id] = marker
      }
    })
  }, [devices, liveLocations])

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeOrg || !accessToken) return

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${window.location.host}/ws/tracking/${activeOrg.id}/?token=${accessToken}`)
      wsRef.current = ws

      ws.onopen = () => setWsStatus('connected')
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connect, 5000) }
      ws.onerror = () => setWsStatus('error')
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'location.update') {
            setLiveLocations((prev) => ({ ...prev, [msg.payload.device_uid]: msg.payload }))
          }
        } catch { /* ignore */ }
      }

      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 30_000)
      ws.addEventListener('close', () => clearInterval(ping))
    }

    connect()
    return () => wsRef.current?.close()
  }, [activeOrg, accessToken])

  const focusDevice = (device) => {
    setSelectedDevice(device)
    const live = liveLocations[device.uid]
    const lat = live?.latitude ?? device.last_latitude
    const lng = live?.longitude ?? device.last_longitude
    if (lat && lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1 })
      markersRef.current[device.id]?.openPopup()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-black">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 px-6 py-4 relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute right-0 top-0 w-48 h-full bg-red-600/4 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-5 h-px bg-red-600" />
              <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">
                Operations
              </span>
            </div>
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white">
              Live Tracking
            </h1>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* WS status */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5">
              {wsStatus === 'connected' ? (
                <>
                  <Wifi size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-mono uppercase tracking-wider">Live</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-zinc-600" />
                  <span className="text-zinc-600 text-xs font-mono uppercase tracking-wider">
                    {wsStatus === 'error' ? 'Error' : 'Reconnecting'}
                  </span>
                </>
              )}
            </div>

            {/* Stat pills — same gap-px grid style as landing */}
            <div className="hidden sm:flex gap-px bg-zinc-800 border border-zinc-800 rounded overflow-hidden">
              {[
                { value: devices.length, label: 'Total' },
                { value: onlineCount,    label: 'Online' },
                { value: liveCount,      label: 'Streaming' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-zinc-950 px-4 py-1.5 text-center">
                  <p className="text-sm font-display font-black text-white leading-none">{value}</p>
                  <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Device sidebar ─────────────────────────────────────────────── */}
        <div className="w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-hidden shrink-0">
          {/* Sidebar header */}
          <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={13} className="text-red-400" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">
                Devices
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-600">{devices.length}</span>
          </div>

          {/* Skeleton */}
          {isLoading && (
            <div className="flex-1 p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    <div className="h-3 bg-zinc-800 rounded flex-1" />
                  </div>
                  <div className="h-2.5 bg-zinc-800/60 rounded w-2/3 ml-4" />
                </div>
              ))}
            </div>
          )}

          {/* Device list */}
          {!isLoading && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <MapPin size={24} className="text-zinc-700" />
                  <p className="text-zinc-600 text-xs font-mono uppercase tracking-wider">No devices</p>
                </div>
              ) : (
                devices.map((device) => {
                  const live = liveLocations[device.uid]
                  const cfg = getStatus(device.status)
                  const isSelected = selectedDevice?.id === device.id
                  const hasPos = live?.latitude || device.last_latitude

                  return (
                    <button
                      key={device.id}
                      onClick={() => focusDevice(device)}
                      disabled={!hasPos}
                      className={`w-full text-left rounded-lg border px-3 py-3 transition-all duration-150 ${
                        isSelected
                          ? 'bg-red-600/10 border-red-600/30'
                          : 'bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900'
                      } ${!hasPos ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="text-zinc-100 text-xs font-mono font-semibold truncate">
                            {device.uid}
                          </span>
                          {live && (
                            <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 rounded font-mono uppercase tracking-wider shrink-0">
                              Live
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase tracking-wider shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-zinc-600 text-[11px] font-mono truncate pl-3.5 mb-2">
                        {device.name || '—'}
                      </p>

                      {(device.last_battery != null || live?.speed != null) && (
                        <div className="flex items-center gap-3 pl-3.5">
                          {device.last_battery != null && (
                            <div className="flex items-center gap-1">
                              <Battery size={10} className={device.last_battery < 20 ? 'text-red-400' : 'text-zinc-600'} />
                              <span className={`text-[10px] font-mono ${device.last_battery < 20 ? 'text-red-400' : 'text-zinc-600'}`}>
                                {device.last_battery}%
                              </span>
                            </div>
                          )}
                          {live?.speed != null && (
                            <div className="flex items-center gap-1">
                              <Navigation size={10} className="text-zinc-600" />
                              <span className="text-[10px] font-mono text-zinc-600">
                                {live.speed.toFixed(1)} m/s
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}
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
              <div className="text-center">
                <p className="text-white font-display font-bold uppercase tracking-wide text-lg">
                  No Organization
                </p>
                <p className="text-zinc-500 text-sm mt-1">
                  Select an organization to begin tracking.
                </p>
              </div>
            </div>
          )}

          {/* Selected device info — floating panel */}
          {selectedDevice && (
            <div className="absolute top-4 right-4 w-60 bg-zinc-950/95 backdrop-blur-sm border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatus(selectedDevice.status).dot}`} />
                  <span className="text-white text-xs font-mono font-bold">{selectedDevice.uid}</span>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs font-mono"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: 'Name', value: selectedDevice.name || '—' },
                  { label: 'Status', value: getStatus(selectedDevice.status).label },
                  { label: 'Battery', value: selectedDevice.last_battery != null ? `${selectedDevice.last_battery}%` : '—' },
                  {
                    label: 'Position',
                    value: (() => {
                      const live = liveLocations[selectedDevice.uid]
                      const lat = live?.latitude ?? selectedDevice.last_latitude
                      const lng = live?.longitude ?? selectedDevice.last_longitude
                      return lat && lng ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'Unknown'
                    })()
                  },
                  {
                    label: 'Speed',
                    value: liveLocations[selectedDevice.uid]?.speed != null
                      ? `${liveLocations[selectedDevice.uid].speed.toFixed(1)} m/s`
                      : '—'
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-zinc-600 text-[11px] font-mono uppercase tracking-wider">{label}</span>
                    <span className="text-zinc-200 text-[11px] font-mono text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connecting overlay */}
          {wsStatus !== 'connected' && activeOrg && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
              <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                {wsStatus === 'error' ? 'Connection error — retrying' : 'Connecting to live stream...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}