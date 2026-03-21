import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Power } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import { getDevice, getDeviceHealth, deactivateDevice } from '../../api/devices.js'
import { useState } from 'react'

export default function DeviceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showDeactivate, setShowDeactivate] = useState(false)

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDevice(id),
    refetchInterval: 15_000,
  })

  const { data: health } = useQuery({
    queryKey: ['device-health', id],
    queryFn: () => getDeviceHealth(id),
    refetchInterval: 15_000,
  })

  const deactivateMut = useMutation({
    mutationFn: () => deactivateDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', id] })
      toast.success('Device deactivated')
      setShowDeactivate(false)
    },
    onError: () => toast.error('Failed to deactivate'),
  })

  if (isLoading) return <PageLoader />

  const healthData = (health?.results ?? health ?? [])
    .slice()
    .reverse()
    .map((h) => ({
      time: format(new Date(h.timestamp), 'HH:mm'),
      battery: h.battery_level,
      signal: h.signal_strength ? Math.abs(h.signal_strength) : null,
      temp: h.temperature,
    }))

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={device?.name ?? device?.uid}
        subtitle={`UID: ${device?.uid}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => navigate('/devices')}>
              <ArrowLeft size={16} /> Back
            </button>
            {device?.is_active && (
              <button className="btn-danger" onClick={() => setShowDeactivate(true)}>
                <Power size={16} /> Deactivate
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Status row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard title="Status">
            <Badge variant={device?.status} dot>{device?.status?.replace('_', ' ')}</Badge>
          </InfoCard>
          <InfoCard title="Battery">
            <div className="flex items-center gap-2">
              {device?.last_battery != null ? (
                <>
                  <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${device.last_battery > 50 ? 'bg-green-500' : device.last_battery > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${device.last_battery}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-200">{device.last_battery}%</span>
                </>
              ) : <span className="text-zinc-500">—</span>}
            </div>
          </InfoCard>
          <InfoCard title="Firmware">
            <span className="font-mono text-zinc-300 text-sm">{device?.firmware_version ?? '—'}</span>
          </InfoCard>
          <InfoCard title="Last Seen">
            <span className="text-zinc-300 text-sm">
              {device?.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }) : 'Never'}
            </span>
          </InfoCard>
        </div>

        {/* Charts */}
        {healthData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-zinc-300">Battery History</h3>
              </div>
              <div className="p-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#f4f4f5' }} />
                    <Line type="monotone" dataKey="battery" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-zinc-300">Temperature History</h3>
              </div>
              <div className="p-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#f4f4f5' }} />
                    <Line type="monotone" dataKey="temp" stroke="#e11d48" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-zinc-300">Device Info</h3>
            </div>
            <div className="p-4 space-y-3">
              <Row label="UID" value={device?.uid} mono />
              <Row label="Name" value={device?.name} />
              <Row label="Firearm" value={device?.firearm_serial ?? 'Unassigned'} />
              <Row label="Organization" value={device?.organization} mono />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-zinc-300">Last Location</h3>
            </div>
            <div className="p-4 space-y-3">
              <Row label="Latitude" value={device?.last_latitude ?? '—'} mono />
              <Row label="Longitude" value={device?.last_longitude ?? '—'} mono />
              <Row label="Active" value={device?.is_active ? 'Yes' : 'No'} />
              <Row label="Provisioned" value={device?.created_at ? format(new Date(device.created_at), 'dd MMM yyyy') : '—'} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={() => deactivateMut.mutate()}
        title="Deactivate Device"
        message="This will decommission the device and stop all telemetry. Are you sure?"
        danger
        loading={deactivateMut.isPending}
      />
    </div>
  )
}

function InfoCard({ title, children }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs text-zinc-300 text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
