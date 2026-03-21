import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ArrowLeft, Save } from 'lucide-react'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import { getFirearm, updateFirearm, listCategories } from '../../api/firearms.js'

const STATUSES = ['active', 'inactive', 'lost', 'stolen', 'decommissioned']

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
  useEffect(() => { if (firearm) reset(firearm) }, [firearm, reset])

  const updateMut = useMutation({
    mutationFn: (data) => updateFirearm(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firearm', id] })
      qc.invalidateQueries({ queryKey: ['firearms'] })
      toast.success('Firearm updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  if (isLoading) return <PageLoader />

  const categoryList = categories?.results ?? categories ?? []

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={`${firearm?.make} ${firearm?.model}`}
        subtitle={`SN: ${firearm?.serial_number}`}
        actions={
          <button className="btn-ghost" onClick={() => navigate('/firearms')}>
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Firearm Details</h3>
              <Badge variant={firearm?.status} dot>{firearm?.status}</Badge>
            </div>
            <form onSubmit={handleSubmit((d) => updateMut.mutate(d))} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Serial Number</label>
                  <input className="input" {...register('serial_number')} />
                </div>
                <div>
                  <label className="label">Calibre</label>
                  <input className="input" {...register('calibre')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Make</label>
                  <input className="input" {...register('make')} />
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input" {...register('model')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Status</label>
                  <select className="select" {...register('status')}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="select" {...register('category')}>
                    <option value="">None</option>
                    {categoryList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">License Number</label>
                  <input className="input" {...register('license_number')} />
                </div>
                <div>
                  <label className="label">License Expiry</label>
                  <input type="date" className="input" {...register('license_expiry')} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} {...register('notes')} />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
                  {updateMut.isPending ? <Spinner size="sm" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-zinc-300">Assignment</h3>
            </div>
            <div className="p-4 space-y-3">
              <InfoRow label="Assigned to" value={firearm?.assigned_to_email ?? 'Unassigned'} />
              <InfoRow label="Active Device" value={firearm?.active_device_uid ?? 'None'} mono />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-zinc-300">Metadata</h3>
            </div>
            <div className="p-4 space-y-3">
              <InfoRow label="ID" value={firearm?.id?.slice(0,8) + '...'} mono />
              <InfoRow label="Created" value={firearm?.created_at ? format(new Date(firearm.created_at), 'dd MMM yyyy') : '—'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs text-zinc-300 text-right break-all ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
