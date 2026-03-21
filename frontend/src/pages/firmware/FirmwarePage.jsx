import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Plus, Upload, XCircle, HardDrive } from 'lucide-react'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listVersions, createVersion, listDeployments, createDeployment, cancelDeployment } from '../../api/firmware.js'
import { useAuthStore } from '../../store/authStore.js'

export default function FirmwarePage() {
  const qc = useQueryClient()
  const { activeOrg } = useAuthStore()
  const [showUpload, setShowUpload] = useState(false)
  const [showDeploy, setShowDeploy] = useState(false)
  const [tab, setTab] = useState('versions')

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['firmware-versions'],
    queryFn: listVersions,
  })
  const { data: deployments, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['firmware-deployments'],
    queryFn: listDeployments,
  })

  const uploadMut = useMutation({
    mutationFn: (formData) => createVersion(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['firmware-versions'] }); toast.success('Firmware uploaded'); setShowUpload(false); reset() },
    onError: () => toast.error('Upload failed'),
  })

  const deployMut = useMutation({
    mutationFn: createDeployment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['firmware-deployments'] }); toast.success('Deployment queued'); setShowDeploy(false); resetDeploy() },
    onError: () => toast.error('Deploy failed'),
  })

  const cancelMut = useMutation({
    mutationFn: cancelDeployment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['firmware-deployments'] }); toast.success('Cancelled') },
  })

  const { register, handleSubmit, reset } = useForm()
  const { register: registerDeploy, handleSubmit: handleDeploySubmit, reset: resetDeploy } = useForm()

  const onUpload = (data) => {
    const fd = new FormData()
    fd.append('version', data.version)
    fd.append('changelog', data.changelog || '')
    fd.append('is_stable', data.is_stable ? 'true' : 'false')
    if (data.file?.[0]) fd.append('file', data.file[0])
    if (activeOrg) fd.append('organization', activeOrg.id)
    uploadMut.mutate(fd)
  }

  const versionsList = versions?.results ?? versions ?? []
  const deploymentsList = deployments?.results ?? deployments ?? []

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Firmware"
        subtitle="OTA firmware management"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => { resetDeploy(); setShowDeploy(true) }}>
              <Upload size={16} /> Deploy
            </button>
            <button className="btn-primary" onClick={() => { reset(); setShowUpload(true) }}>
              <Plus size={16} /> Upload Version
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Tabs */}
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden w-fit">
          {['versions', 'deployments'].map((t) => (
            <button
              key={t}
              className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-fire-600/20 text-fire-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Versions */}
        {tab === 'versions' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Version</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Stable</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Changelog</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {versionsLoading ? (
                  <tr><td colSpan={5} className="py-16 text-center"><Spinner /></td></tr>
                ) : versionsList.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon={HardDrive} title="No firmware versions" description="Upload a firmware binary." /></td></tr>
                ) : (
                  versionsList.map((v) => (
                    <tr key={v.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-fire-400 text-sm">{v.version}</td>
                      <td className="px-6 py-3">
                        {v.is_stable ? <Badge variant="success">Stable</Badge> : <Badge variant="default">Dev</Badge>}
                      </td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">
                        {v.file_size ? `${(v.file_size / 1024).toFixed(0)} KB` : '—'}
                      </td>
                      <td className="px-6 py-3 text-zinc-400 text-xs max-w-xs truncate">{v.changelog || '—'}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs">
                        {v.created_at ? format(new Date(v.created_at), 'dd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Deployments */}
        {tab === 'deployments' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Version</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Started</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Completed</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {deploymentsLoading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Spinner /></td></tr>
                ) : deploymentsList.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={Upload} title="No deployments" description="Deploy firmware to your devices." /></td></tr>
                ) : (
                  deploymentsList.map((d) => (
                    <tr key={d.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-200">{d.name}</td>
                      <td className="px-6 py-3"><Badge variant={d.status} dot>{d.status.replace('_', ' ')}</Badge></td>
                      <td className="px-6 py-3 font-mono text-fire-400 text-xs">{d.firmware_version ?? '—'}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs">{d.started_at ? format(new Date(d.started_at), 'dd MMM HH:mm') : '—'}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs">{d.completed_at ? format(new Date(d.completed_at), 'dd MMM HH:mm') : '—'}</td>
                      <td className="px-6 py-3">
                        {['pending', 'in_progress'].includes(d.status) && (
                          <button className="btn-ghost p-1.5 h-auto text-zinc-500 hover:text-red-400" onClick={() => cancelMut.mutate(d.id)}>
                            <XCircle size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Firmware Version">
        <form onSubmit={handleSubmit(onUpload)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Version String *</label>
              <input className="input font-mono" placeholder="1.2.0" {...register('version', { required: true })} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-zinc-600 bg-zinc-800 text-fire-600" {...register('is_stable')} />
                <span className="text-sm text-zinc-300">Mark as Stable</span>
              </label>
            </div>
          </div>
          <div>
            <label className="label">Firmware File *</label>
            <input
              type="file"
              className="input py-1.5 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-fire-600/20 file:text-fire-400 file:text-xs"
              {...register('file')}
            />
          </div>
          <div>
            <label className="label">Changelog</label>
            <textarea className="input" rows={3} placeholder="What changed in this version..." {...register('changelog')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={uploadMut.isPending}>
              {uploadMut.isPending && <Spinner size="sm" />} Upload
            </button>
          </div>
        </form>
      </Modal>

      {/* Deploy Modal */}
      <Modal open={showDeploy} onClose={() => setShowDeploy(false)} title="Create Deployment" size="sm">
        <form onSubmit={handleDeploySubmit((d) => deployMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Deployment Name *</label>
            <input className="input" placeholder="Release v1.2.0 rollout" {...registerDeploy('name', { required: true })} />
          </div>
          <div>
            <label className="label">Firmware Version *</label>
            <select className="select" {...registerDeploy('firmware_version', { required: true })}>
              <option value="">Select version</option>
              {versionsList.map((v) => <option key={v.id} value={v.id}>{v.version} {v.is_stable ? '(stable)' : ''}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowDeploy(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={deployMut.isPending}>
              {deployMut.isPending && <Spinner size="sm" />} Deploy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
