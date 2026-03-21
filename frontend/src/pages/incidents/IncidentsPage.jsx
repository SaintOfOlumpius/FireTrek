import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Plus, FileWarning, ExternalLink } from 'lucide-react'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listIncidents, createIncident } from '../../api/incidents.js'
import { listFirearms } from '../../api/firearms.js'
import { useAuthStore } from '../../store/authStore.js'

const STATUSES = ['open','investigating','resolved','escalated','closed']
const PRIORITIES = ['critical','high','medium','low']

const priorityColors = {
  critical: 'badge-red', high: 'badge-orange', medium: 'badge-yellow', low: 'badge-zinc',
}

export default function IncidentsPage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const params = {}
  if (statusFilter) params.status = statusFilter
  if (priorityFilter) params.priority = priorityFilter

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', params],
    queryFn: () => listIncidents(params),
  })

  const { data: firearms } = useQuery({
    queryKey: ['firearms'],
    queryFn: () => listFirearms(),
  })

  const createMut = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident created')
      setShowCreate(false)
      reset()
    },
    onError: () => toast.error('Failed to create'),
  })

  const { register, handleSubmit, reset } = useForm({ defaultValues: { priority: 'medium', status: 'open' } })

  const onSubmit = (data) => {
    if (activeOrg) data.organization = activeOrg.id
    if (!data.firearm) delete data.firearm
    createMut.mutate(data)
  }

  const incidents = data?.results ?? []
  const firearmsList = firearms?.results ?? []

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Incidents"
        subtitle={`${data?.count ?? 0} total`}
        actions={
          <button className="btn-primary" onClick={() => { reset(); setShowCreate(true) }}>
            <Plus size={16} /> New Incident
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select className="select w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select w-36" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : incidents.length === 0 ? (
          <EmptyState icon={FileWarning} title="No incidents" description="Create an incident to track security events." />
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="card block p-4 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge variant={inc.status} dot>{inc.status}</Badge>
                      <Badge className={priorityColors[inc.priority]}>{inc.priority}</Badge>
                    </div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{inc.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{inc.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-600">
                      <span>{format(new Date(inc.created_at), 'dd MMM yyyy HH:mm')}</span>
                      {inc.assigned_to && <span>Assigned</span>}
                      {inc.notes?.length > 0 && <span>{inc.notes.length} note{inc.notes.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Incident" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Brief incident description" {...register('title', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Detailed description..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="select" {...register('priority')}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" {...register('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Related Firearm</label>
            <select className="select" {...register('firearm')}>
              <option value="">None</option>
              {firearmsList.map((f) => <option key={f.id} value={f.id}>{f.serial_number} — {f.make} {f.model}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending && <Spinner size="sm" />} Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
