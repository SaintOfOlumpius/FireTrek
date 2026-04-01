import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, Crosshair, Trash2, ExternalLink, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import Modal from '../../components/ui/Modal.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listFirearms, createFirearm, deleteFirearm, listCategories } from '../../api/firearms.js'
import { useAuthStore } from '../../store/authStore.js'

//  Status config 
const STATUS_STYLE = {
  active:          { dot: 'bg-emerald-500',          badge: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/25' },
  inactive:        { dot: 'bg-zinc-500',              badge: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/25' },
  lost:            { dot: 'bg-orange-500 animate-pulse', badge: 'bg-orange-600/15 text-orange-400 border-orange-600/25' },
  stolen:          { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-600/15 text-red-400 border-red-600/25' },
  decommissioned:  { dot: 'bg-zinc-700',              badge: 'bg-zinc-800/60 text-zinc-600 border-zinc-700/25' },
}
const getStatus = (s) => STATUS_STYLE[s] ?? STATUS_STYLE.inactive

const STATUSES = ['active', 'inactive', 'lost', 'stolen', 'decommissioned']

//  Primitives ─
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

function PanelHeader({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">{title}</h3>
        {subtitle && <p className="text-zinc-600 text-xs font-mono mt-0.5">{subtitle}</p>}
      </div>
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

//  License expiry colour 
function LicenseDate({ dateStr }) {
  if (!dateStr) return <span className="text-zinc-700 font-mono text-xs">—</span>
  const date = new Date(dateStr)
  const daysLeft = Math.ceil((date - Date.now()) / 86_400_000)
  const color = daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-orange-400' : 'text-zinc-500'
  return <span className={`font-mono text-xs ${color}`}>{format(date, 'dd MMM yyyy')}</span>
}

//  Main page 
export default function FirearmsPage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const params = {}
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (activeOrg) params.organization = activeOrg.id

  const { data, isLoading } = useQuery({
    queryKey: ['firearms', params],
    queryFn: () => listFirearms(params),
  })
  const { data: categories } = useQuery({
    queryKey: ['firearms-categories'],
    queryFn: listCategories,
  })

  const createMut = useMutation({
    mutationFn: createFirearm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firearms'] })
      toast.success('Firearm registered')
      setShowCreate(false)
      reset()
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed to create'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteFirearm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firearms'] })
      toast.success('Firearm deleted')
      setDeleteTarget(null)
    },
  })

  const { register, handleSubmit, reset } = useForm()
  const onCreateSubmit = (formData) => {
    if (activeOrg) formData.organization = activeOrg.id
    createMut.mutate(formData)
  }

  const firearms = data?.results ?? []
  const categoryList = categories?.results ?? categories ?? []

  // Summary counts for stat strip
  const activeCount        = firearms.filter((f) => f.status === 'active').length
  const criticalCount      = firearms.filter((f) => ['lost', 'stolen'].includes(f.status)).length
  const expiringCount      = firearms.filter((f) => {
    if (!f.license_expiry) return false
    return Math.ceil((new Date(f.license_expiry) - Date.now()) / 86_400_000) < 30
  }).length

  return (
    <div className="flex flex-col min-h-full bg-black">

      {/*  Page header  */}
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
            <SectionLabel>Asset Registry</SectionLabel>
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white mt-2">
              Firearms
            </h1>
          </div>
          <button
            onClick={() => { reset(); setShowCreate(true) }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
              text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
          >
            <Plus size={14} /> Add Firearm
          </button>
        </div>
      </div>

      {/*  Stat strip ─ */}
      <div className="px-6 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {[
            { label: 'Total Registered', value: data?.count ?? 0 },
            { label: 'Active',           value: activeCount },
            { label: 'Lost / Stolen',    value: criticalCount },
            { label: 'License Expiring', value: expiringCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-950 px-5 py-3.5 text-center">
              <p className="text-xl font-display font-black text-white">{value}</p>
              <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">

        {/*  Filters  */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm pl-9 pr-4 py-2.5
                rounded font-mono placeholder:text-zinc-700 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="Search serial, make, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-zinc-600 mr-1">
              <SlidersHorizontal size={12} />
            </div>
            {['', ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors border ${
                  statusFilter === s
                    ? 'bg-red-600/20 text-red-400 border-red-600/30'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/*  Table  */}
        <Panel>
          <PanelHeader
            title="Registry"
            subtitle={`${data?.count ?? 0} firearms registered`}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Serial', 'Make / Model', 'Calibre', 'Category', 'Status', 'Assigned To', 'License Exp.', ''].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-mono uppercase tracking-widest text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : firearms.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                          <Crosshair size={22} className="text-zinc-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-300 font-display font-semibold uppercase tracking-wider text-sm">
                            No Firearms Found
                          </p>
                          <p className="text-zinc-600 text-xs font-mono mt-1">
                            {search || statusFilter ? 'Try adjusting your filters.' : 'Add your first firearm to get started.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  firearms.map((f) => {
                    const cfg = getStatus(f.status)
                    return (
                      <tr key={f.id} className="hover:bg-zinc-900/40 transition-colors group">

                        {/* Serial */}
                        <td className="px-6 py-4">
                          <Link
                            to={`/firearms/${f.id}`}
                            className="text-red-400 hover:text-red-300 font-mono text-xs font-semibold transition-colors"
                          >
                            {f.serial_number}
                          </Link>
                        </td>

                        {/* Make / Model */}
                        <td className="px-6 py-4">
                          <p className="text-zinc-200 text-sm">{f.make} {f.model}</p>
                        </td>

                        {/* Calibre */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">{f.calibre || '—'}</span>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 text-xs">{f.category_name || '—'}</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${cfg.badge}`}>
                              {f.status}
                            </span>
                          </div>
                        </td>

                        {/* Assigned to */}
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">{f.assigned_to_email || '—'}</span>
                        </td>

                        {/* License expiry */}
                        <td className="px-6 py-4">
                          <LicenseDate dateStr={f.license_expiry} />
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/firearms/${f.id}`}
                              className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="View details"
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(f)}
                              className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                              title="Delete"
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

      {/*  Create modal  */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Firearm" size="md">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Serial Number *</FieldLabel>
              <Input placeholder="SN-00001" {...register('serial_number', { required: true })} />
            </div>
            <div>
              <FieldLabel>Calibre</FieldLabel>
              <Input placeholder="e.g. 9mm" {...register('calibre')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Make *</FieldLabel>
              <Input placeholder="e.g. Glock" {...register('make', { required: true })} />
            </div>
            <div>
              <FieldLabel>Model *</FieldLabel>
              <Input placeholder="e.g. G17" {...register('model', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Category</FieldLabel>
              <StyledSelect {...register('category')}>
                <option value="">None</option>
                {categoryList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </StyledSelect>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <StyledSelect {...register('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </StyledSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>License Number</FieldLabel>
              <Input placeholder="LIC-0000" {...register('license_number')} />
            </div>
            <div>
              <FieldLabel>License Expiry</FieldLabel>
              <input
                type="date"
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-2.5
                  rounded font-mono focus:outline-none focus:border-red-600 transition-colors"
                {...register('license_expiry')}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-2.5
                rounded font-mono placeholder:text-zinc-700 focus:outline-none focus:border-red-600
                transition-colors resize-none"
              {...register('notes')}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500
                text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
            >
              {createMut.isPending ? <Spinner size="sm" /> : <Plus size={13} />}
              Register
              <ChevronRight size={13} />
            </button>
          </div>
        </form>
      </Modal>

      {/*  Confirm delete ─ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Delete Firearm"
        message={`Delete ${deleteTarget?.serial_number}? This cannot be undone.`}
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}