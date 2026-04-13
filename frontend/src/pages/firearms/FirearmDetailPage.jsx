import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ArrowLeft, Save, Crosshair, Shield, Cpu } from 'lucide-react'
import { getFirearm, updateFirearm, listCategories } from '../../api/firearms.js'

const STATUSES = ['active', 'inactive', 'lost', 'stolen', 'decommissioned']

const STATUS_STYLE = {
  active:         'bg-emerald-600/15 text-emerald-400 border-emerald-600/25',
  inactive:       'bg-zinc-700/40 text-zinc-400 border-zinc-600/25',
  lost:           'bg-orange-600/15 text-orange-400 border-orange-600/25',
  stolen:         'bg-red-600/15 text-red-400 border-red-600/25',
  decommissioned: 'bg-zinc-800/60 text-zinc-600 border-zinc-700/25',
}

const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
    {children}
  </label>
)

const TextInput = ({ ...p }) => (
  <input
    className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-3.5 py-2.5 rounded-md
      font-mono placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
    {...p}
  />
)

const StyledSelect = ({ children, ...p }) => (
  <select
    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-3.5 py-2.5
      rounded-md font-mono focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
    {...p}
  >
    {children}
  </select>
)

const InfoRow = ({ label, value, mono }) => (
  <div className="flex justify-between items-start gap-4 py-2 border-b border-zinc-800/50 last:border-0">
    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 shrink-0">{label}</span>
    <span className={`text-xs text-zinc-300 text-right break-all ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
)

export default function FirearmDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: firearm, isLoading } = useQuery({
    queryKey: ['firearm', id],
    queryFn: () => getFirearm(id),
  })
  const { data: categories } = useQuery({
    queryKey: ['firearms-categories'],
    queryFn: listCategories,
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (!firearm) return
    reset({
      serial_number: firearm.serial_number,
      make: firearm.make,
      model: firearm.model,
      calibre: firearm.calibre,
      status: firearm.status,
      category: firearm.category ?? '',
      license_number: firearm.license_number,
      license_expiry: firearm.license_expiry
  ? format(new Date(firearm.license_expiry), 'yyyy-MM-dd')
  : '',
      notes: firearm.notes,
    })
  }, [firearm, reset])

  const updateMut = useMutation({
    mutationFn: (data) => updateFirearm(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firearm', id] })
      qc.invalidateQueries({ queryKey: ['firearms'] })
      toast.success('Firearm updated')
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed to update'),
  })

  const categoryList = categories?.results ?? categories ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!firearm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Crosshair size={24} className="text-zinc-700" />
        <p className="text-zinc-500 font-mono text-sm">Firearm not found</p>
      </div>
    )
  }

 const now = new Date()
const expiry = firearm.license_expiry ? new Date(firearm.license_expiry) : null

const daysToExpiry = expiry
  ? Math.ceil((expiry.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  : null

  return (
    <div className="flex flex-col min-h-full bg-black">

      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/firearms')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="w-px h-5 bg-zinc-800" />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-3 h-px bg-red-600" />
              <span className="text-red-500 text-[9px] font-mono uppercase tracking-[0.3em]">Asset Registry</span>
            </div>
            <h1 className="text-base font-mono font-bold uppercase tracking-wide text-white">
              {firearm.make} {firearm.model}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] px-2.5 py-1 rounded border font-mono uppercase tracking-wider ${STATUS_STYLE[firearm.status] ?? STATUS_STYLE.inactive}`}>
            {firearm.status}
          </span>
          <span className="text-zinc-600 font-mono text-xs">{firearm.serial_number}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Edit form */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2.5">
              <div className="w-1 h-4 bg-red-600 rounded-full" />
              <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-white">Firearm Details</h2>
            </div>
            <form onSubmit={handleSubmit((d) => updateMut.mutate(d))} className="p-5 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Serial Number</FieldLabel>
                  <TextInput {...register('serial_number')} />
                </div>
                <div>
                  <FieldLabel>Calibre</FieldLabel>
                  <TextInput placeholder="e.g. 9mm" {...register('calibre')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Make</FieldLabel>
                  <TextInput {...register('make')} />
                </div>
                <div>
                  <FieldLabel>Model</FieldLabel>
                  <TextInput {...register('model')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <StyledSelect {...register('status')}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </StyledSelect>
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <StyledSelect {...register('category')}>
                    <option value="">None</option>
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </StyledSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>License Number</FieldLabel>
                  <TextInput placeholder="LIC-0000" {...register('license_number')} />
                </div>
                <div>
                  <FieldLabel>License Expiry</FieldLabel>
                  <input
                    type="date"
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-3.5 py-2.5
                      rounded-md font-mono focus:outline-none focus:border-zinc-600 transition-colors"
                    {...register('license_expiry')}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-3.5 py-2.5
                    rounded-md font-mono placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600
                    transition-colors resize-none"
                  {...register('notes')}
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-800/60">
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40
                    text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded-md transition-colors"
                >
                  {updateMut.isPending
                    ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save size={13} />
                  }
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Assignment */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2.5">
              <Shield size={13} className="text-zinc-600" />
              <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400">Assignment</h3>
            </div>
            <div className="px-5 py-4">
              <InfoRow label="Assigned To" value={firearm.assigned_to_email ?? 'Unassigned'} />
              <InfoRow label="Active Device" value={firearm.active_device_uid ?? 'None'} mono />
            </div>
          </div>

          {/* License status */}
          {firearm.license_expiry && (
            <div className={`border rounded-xl px-5 py-4 ${
              daysToExpiry < 0
                ? 'bg-red-950/20 border-red-900/30'
                : daysToExpiry < 30
                ? 'bg-orange-950/20 border-orange-900/30'
                : 'bg-zinc-950 border-zinc-800'
            }`}>
              <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-600 mb-1">License Status</p>
              <p className={`text-sm font-mono font-bold ${
                daysToExpiry < 0 ? 'text-red-400' : daysToExpiry < 30 ? 'text-orange-400' : 'text-zinc-300'
              }`}>
                {daysToExpiry < 0
                  ? `Expired ${Math.abs(daysToExpiry)} days ago`
                  : daysToExpiry < 30
                  ? `Expires in ${daysToExpiry} days`
                  : format(new Date(firearm.license_expiry), 'dd MMM yyyy')
                }
              </p>
              {firearm.license_number && (
                <p className="text-[10px] font-mono text-zinc-600 mt-1">{firearm.license_number}</p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2.5">
              <Cpu size={13} className="text-zinc-600" />
              <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400">Metadata</h3>
            </div>
            <div className="px-5 py-4">
              <InfoRow label="ID" value={firearm.id?.slice(0, 8) + '...'} mono />
              <InfoRow
                label="Registered"
                value={firearm.created_at ? format(new Date(firearm.created_at), 'dd MMM yyyy') : '—'}
              />
              <InfoRow label="Organisation" value={firearm.organization} mono />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}