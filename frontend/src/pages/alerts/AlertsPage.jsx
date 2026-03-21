import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { CheckCircle, Clock } from 'lucide-react'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listAlerts, acknowledgeAlert, resolveAlert } from '../../api/alerts.js'
import { useForm } from 'react-hook-form'

const ALERT_TYPES = [
  'geofence_breach','low_battery','critical_battery','device_offline',
  'tamper_detected','sos_signal','unauthorized_movement','license_expiry',
]
const SEVERITIES = ['critical','warning','info']

const TYPE_LABELS = {
  geofence_breach: 'Geofence Breach',
  low_battery: 'Low Battery',
  critical_battery: 'Critical Battery',
  device_offline: 'Device Offline',
  tamper_detected: 'Tamper Detected',
  sos_signal: 'SOS Signal',
  unauthorized_movement: 'Unauthorized Movement',
  license_expiry: 'License Expiry',
}

export default function AlertsPage() {
  const qc = useQueryClient()
  const [showResolved, setShowResolved] = useState(false)
  const [severityFilter, setSeverityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [resolveTarget, setResolveTarget] = useState(null)

  const params = {}
  if (showResolved) params.resolved = 'true'
  if (severityFilter) params.severity = severityFilter
  if (typeFilter) params.alert_type = typeFilter

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', params],
    queryFn: () => listAlerts(params),
    refetchInterval: 15_000,
  })

  const ackMut = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast.success('Alert acknowledged') },
    onError: () => toast.error('Failed'),
  })

  const resolveMut = useMutation({
    mutationFn: ({ id, note }) => resolveAlert(id, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast.success('Alert resolved'); setResolveTarget(null) },
    onError: () => toast.error('Failed'),
  })

  const { register, handleSubmit, reset } = useForm()

  const alerts = data?.results ?? []

  const severityBg = { critical: 'border-l-red-500', warning: 'border-l-yellow-500', info: 'border-l-blue-500' }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Alerts"
        subtitle={`${data?.count ?? 0} ${showResolved ? 'resolved' : 'open'} alerts`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${!showResolved ? 'bg-fire-600/20 text-fire-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
              onClick={() => setShowResolved(false)}
            >Open</button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showResolved ? 'bg-fire-600/20 text-fire-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
              onClick={() => setShowResolved(true)}
            >Resolved</button>
          </div>
          <select className="select w-36" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">All severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select w-44" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {ALERT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Alerts list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : alerts.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No alerts" description={showResolved ? 'No resolved alerts.' : 'All clear — no open alerts.'} />
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`card border-l-2 ${severityBg[alert.severity] ?? 'border-l-zinc-700'} hover:bg-zinc-800/30 transition-colors`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                      alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{alert.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{alert.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={alert.severity}>{alert.severity}</Badge>
                          <Badge variant="default">{TYPE_LABELS[alert.alert_type] ?? alert.alert_type}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-600">
                        {alert.device_uid && <span>Device: <span className="font-mono text-zinc-500">{alert.device_uid}</span></span>}
                        {alert.firearm_serial && <span>SN: <span className="font-mono text-zinc-500">{alert.firearm_serial}</span></span>}
                        <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
                        {alert.acknowledged_at && <span className="text-yellow-600">Acknowledged</span>}
                      </div>
                    </div>
                    {!showResolved && (
                      <div className="flex gap-2 shrink-0">
                        {!alert.acknowledged_at && (
                          <button
                            className="btn-secondary text-xs py-1 px-2"
                            onClick={() => ackMut.mutate(alert.id)}
                            disabled={ackMut.isPending}
                          >
                            <Clock size={12} /> Ack
                          </button>
                        )}
                        <button
                          className="btn-primary text-xs py-1 px-2"
                          onClick={() => { setResolveTarget(alert); reset() }}
                        >
                          <CheckCircle size={12} /> Resolve
                        </button>
                      </div>
                    )}
                    {showResolved && (
                      <div className="text-xs text-zinc-600 shrink-0">
                        {alert.resolved_at && format(new Date(alert.resolved_at), 'dd MMM HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Resolve Alert" size="sm">
        <form onSubmit={handleSubmit(({ note }) => resolveMut.mutate({ id: resolveTarget.id, note }))} className="space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-3">{resolveTarget?.title}</p>
            <label className="label">Resolution Note (optional)</label>
            <textarea className="input" rows={3} placeholder="Describe how this was resolved..." {...register('note')} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setResolveTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={resolveMut.isPending}>
              {resolveMut.isPending && <Spinner size="sm" />} Resolve
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
