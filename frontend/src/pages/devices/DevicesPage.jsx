import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Cpu, ExternalLink, Trash2, Copy, Check, ChevronRight, AlertTriangle, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Modal from '../../components/ui/Modal.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listDevices, provisionDevice, deleteDevice } from '../../api/devices.js'
import { listFirearms } from '../../api/firearms.js'
import { useAuthStore } from '../../store/authStore.js'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  online:         { dot: 'bg-emerald-500',          badge: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/25',  label: 'Online' },
  offline:        { dot: 'bg-zinc-600',              badge: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/25',           label: 'Offline' },
  low_battery:    { dot: 'bg-orange-500',            badge: 'bg-orange-600/15 text-orange-400 border-orange-600/25',    label: 'Low Battery' },
  tampered:       { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-600/15 text-red-400 border-red-600/25',             label: 'Tampered' },
  decommissioned: { dot: 'bg-zinc-800',              badge: 'bg-zinc-800/60 text-zinc-600 border-zinc-700/25',          label: 'Decomm.' },
}
const getStatus = (s) => STATUS[s] ?? STATUS.offline

// ── Shared primitives ─────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-5 h-px bg-red-600" />
      <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">{children}</span>
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">{title}</h3>
        {subtitle && <p className="text-zinc-600 text-xs mt-0.5 font-mono">{subtitle}</p>}
      </div>
      {action}
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

function BatteryBar({ level }) {
  const color = level > 50 ? 'bg-emerald-500' : level > 20 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${level}%` }} />
      </div>
      <span className={`text-xs font-mono ${level <= 20 ? 'text-red-400' : level <= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
        {level}%
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DevicesPage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()
  const [showProvision, setShowProvision] = useState(false)
  const [apiKeyResult, setApiKeyResult] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    refetchInterval: 30_000,
  })
  const { data: firearms } = useQuery({
    queryKey: ['firearms'],
    queryFn: () => listFirearms(),
  })

  const provisionMut = useMutation({
    mutationFn: provisionDevice,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      setShowProvision(false)
      setApiKeyResult(result)
      reset()
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Provision failed'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      toast.success('Device deleted')
      setDeleteTarget(null)
    },
  })

  const { register, handleSubmit, reset } = useForm()

  const onProvision = (formData) => {
    if (activeOrg) formData.organization = activeOrg.id
    provisionMut.mutate(formData)
  }

  const copyKey = () => {
    navigator.clipboard.writeText(apiKeyResult.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const devices = data?.results ?? []
  const firearmsList = firearms?.results ?? []

  const onlineCount = devices.filter((d) => d.status === 'online').length
  const lowBatteryCount = devices.filter((d) => d.last_battery != null && d.last_battery <= 20).length

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
            <SectionLabel>Asset Management</SectionLabel>
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white mt-2">
              Devices
            </h1>
          </div>
          <button
            onClick={() => { reset(); setShowProvision(true) }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
              text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
          >
            <Plus size={14} />
            Provision Device
          </button>
        </div>
      </div>

      {/* ── Stat strip ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {[
            { label: 'Total Devices',  value: data?.count ?? 0 },
            { label: 'Online',         value: onlineCount },
            { label: 'Low Battery',    value: lowBatteryCount },
            { label: 'Offline',        value: devices.filter((d) => d.status === 'offline').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-950 px-5 py-3.5 text-center">
              <p className="text-xl font-display font-black text-white">{value}</p>
              <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        <Panel>
          <PanelHeader
            title="All Devices"
            subtitle={`${data?.count ?? 0} provisioned units`}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['UID', 'Name', 'Status', 'Battery', 'Firmware', 'Last Seen', 'Firearm', ''].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-mono uppercase tracking-widest text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                          <Cpu size={22} className="text-zinc-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-300 font-display font-semibold uppercase tracking-wider text-sm">
                            No Devices
                          </p>
                          <p className="text-zinc-600 text-xs font-mono mt-1">
                            Provision your first ESP32 device.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => {
                    const cfg = getStatus(d.status)
                    return (
                      <tr key={d.id} className="hover:bg-zinc-900/40 transition-colors group">
                        {/* UID */}
                        <td className="px-6 py-4">
                          <Link
                            to={`/devices/${d.id}`}
                            className="text-red-400 hover:text-red-300 font-mono text-xs font-semibold transition-colors"
                          >
                            {d.uid}
                          </Link>
                        </td>

                        {/* Name */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-200 text-sm">{d.name}</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </td>

                        {/* Battery */}
                        <td className="px-6 py-4">
                          {d.last_battery != null ? (
                            <BatteryBar level={d.last_battery} />
                          ) : (
                            <span className="text-zinc-700 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Firmware */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">
                            {d.firmware_version ?? '—'}
                          </span>
                        </td>

                        {/* Last seen */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">
                            {d.last_seen
                              ? formatDistanceToNow(new Date(d.last_seen), { addSuffix: true })
                              : 'Never'}
                          </span>
                        </td>

                        {/* Firearm */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">
                            {d.firearm_serial ?? '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/devices/${d.id}`}
                              className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="View details"
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(d)}
                              className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                              title="Delete device"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* ── Provision modal ───────────────────────────────────────────────── */}
      <Modal open={showProvision} onClose={() => setShowProvision(false)} title="Provision Device">
        <form onSubmit={handleSubmit(onProvision)} className="space-y-5">
          <div>
            <FieldLabel>Device UID *</FieldLabel>
            <Input placeholder="FT-001" {...register('uid', { required: true })} />
            <p className="text-zinc-600 text-xs font-mono mt-1.5">
              Unique identifier for this ESP32 (e.g. FT-001)
            </p>
          </div>
          <div>
            <FieldLabel>Display Name *</FieldLabel>
            <Input placeholder="Tracker #1" {...register('name', { required: true })} />
          </div>
          <div>
            <FieldLabel>Assign to Firearm (optional)</FieldLabel>
            <select
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-2.5
                rounded font-mono focus:outline-none focus:border-red-600 transition-colors"
              {...register('firearm')}
            >
              <option value="">None</option>
              {firearmsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.serial_number} — {f.make} {f.model}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowProvision(false)}
              className="border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500
                text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={provisionMut.isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
            >
              {provisionMut.isPending ? <Spinner size="sm" /> : <Zap size={13} />}
              Provision
              <ChevronRight size={13} />
            </button>
          </div>
        </form>
      </Modal>

      {/* ── API key result modal ──────────────────────────────────────────── */}
      <Modal open={!!apiKeyResult} onClose={() => setApiKeyResult(null)} title="Device Provisioned" size="md">
        <div className="space-y-5">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-emerald-600/10 border border-emerald-600/25 rounded-lg px-4 py-3">
            <div className="w-7 h-7 rounded bg-emerald-600/15 border border-emerald-600/25 flex items-center justify-center shrink-0">
              <Check size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 text-sm font-mono font-semibold">{apiKeyResult?.uid}</p>
              <p className="text-emerald-600 text-xs font-mono">Device provisioned successfully</p>
            </div>
          </div>

          {/* API key */}
          <div>
            <FieldLabel>API Key — shown once, copy now</FieldLabel>
            <div className="flex gap-2">
              <input
                readOnly
                value={apiKeyResult?.api_key ?? ''}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-4 py-2.5
                  rounded font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={copyKey}
                className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs font-mono uppercase tracking-wider
                  transition-colors shrink-0 ${
                    copied
                      ? 'bg-emerald-600/15 border-emerald-600/30 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-start gap-2 mt-2.5 bg-orange-600/8 border border-orange-600/20 rounded px-3 py-2.5">
              <AlertTriangle size={13} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-orange-400/80 text-xs font-mono">
                Flash this key into your ESP32 firmware. It will <strong>not</strong> be shown again.
              </p>
            </div>
          </div>

          <button
            onClick={() => setApiKeyResult(null)}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-mono
              uppercase tracking-widest py-3 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* ── Confirm delete ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Delete Device"
        message={`Delete device ${deleteTarget?.uid}? This cannot be undone.`}
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}