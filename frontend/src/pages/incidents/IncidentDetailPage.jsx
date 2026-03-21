import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ArrowLeft, Send, CheckCircle, MessageSquare } from 'lucide-react'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { getIncident, addNote, resolveIncident } from '../../api/incidents.js'
import { useState } from 'react'

const priorityColors = { critical:'badge-red', high:'badge-orange', medium:'badge-yellow', low:'badge-zinc' }

export default function IncidentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showResolve, setShowResolve] = useState(false)

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(id),
    refetchInterval: 30_000,
  })

  const noteMut = useMutation({
    mutationFn: (content) => addNote(id, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', id] }); resetNote() },
    onError: () => toast.error('Failed to add note'),
  })

  const resolveMut = useMutation({
    mutationFn: () => resolveIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', id] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident resolved')
      setShowResolve(false)
    },
  })

  const { register: registerNote, handleSubmit: handleNoteSubmit, reset: resetNote } = useForm()

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={incident?.title}
        subtitle={`Incident #${incident?.id?.slice(0, 8)}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => navigate('/incidents')}>
              <ArrowLeft size={16} /> Back
            </button>
            {incident?.status !== 'resolved' && incident?.status !== 'closed' && (
              <button className="btn-primary" onClick={() => setShowResolve(true)}>
                <CheckCircle size={16} /> Resolve
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card">
            <div className="card-header flex items-center gap-3">
              <Badge variant={incident?.status} dot>{incident?.status}</Badge>
              <Badge className={priorityColors[incident?.priority]}>{incident?.priority}</Badge>
            </div>
            <div className="p-6">
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{incident?.description || 'No description provided.'}</p>
            </div>
          </div>

          {/* Notes timeline */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <MessageSquare size={14} className="text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-300">
                Notes ({incident?.notes?.length ?? 0})
              </h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {(incident?.notes ?? []).map((note) => (
                <div key={note.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-fire-700 flex items-center justify-center text-xs font-bold text-white">
                      {note.author_email?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="text-xs font-medium text-zinc-300">{note.author_email}</span>
                    <span className="text-xs text-zinc-600">{format(new Date(note.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                  <p className="text-sm text-zinc-400 pl-8 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
            {/* Add note */}
            <div className="p-4 border-t border-zinc-800">
              <form onSubmit={handleNoteSubmit(({ content }) => noteMut.mutate(content))} className="flex gap-2">
                <textarea
                  className="input flex-1 resize-none"
                  rows={2}
                  placeholder="Add a note..."
                  {...registerNote('content', { required: true })}
                />
                <button type="submit" className="btn-primary self-end" disabled={noteMut.isPending}>
                  {noteMut.isPending ? <Spinner size="sm" /> : <Send size={14} />}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-zinc-300">Details</h3></div>
            <div className="p-4 space-y-3">
              <Row label="ID" value={incident?.id?.slice(0, 8) + '...'} mono />
              <Row label="Status" value={incident?.status} />
              <Row label="Priority" value={incident?.priority} />
              <Row label="Firearm" value={incident?.firearm ?? 'None'} />
              <Row label="Assigned To" value={incident?.assigned_to ?? 'Unassigned'} />
              <Row label="Created By" value={incident?.created_by} />
              <Row label="Created" value={incident?.created_at ? format(new Date(incident.created_at), 'dd MMM yyyy HH:mm') : '—'} />
              {incident?.resolved_at && (
                <Row label="Resolved" value={format(new Date(incident.resolved_at), 'dd MMM yyyy HH:mm')} />
              )}
            </div>
          </div>

          {incident?.linked_alert_ids?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="text-sm font-semibold text-zinc-300">Linked Alerts</h3></div>
              <div className="p-4 space-y-2">
                {incident.linked_alert_ids.map((aid) => (
                  <div key={aid} className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1.5 rounded">
                    {aid.slice(0, 16)}...
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showResolve}
        onClose={() => setShowResolve(false)}
        onConfirm={() => resolveMut.mutate()}
        title="Resolve Incident"
        message="Mark this incident as resolved? This will close the investigation."
        loading={resolveMut.isPending}
      />
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
