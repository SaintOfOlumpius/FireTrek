import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Save, Trash2, UserPlus, Building2, Users, Mail,
  Lock, ChevronRight, AlertCircle,
} from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import {
  getOrganization, updateOrganization,
  listMembers, updateMember, removeMember,
  listInvitations, sendInvitation, deleteInvitation,
} from '../../api/organizations.js'
import { changePassword } from '../../api/auth.js'
import { useAuthStore } from '../../store/authStore.js'

const ROLES = ['owner', 'admin', 'operator', 'viewer']

const ROLE_STYLE = {
  owner:    'bg-red-600/15 text-red-400 border-red-600/25',
  admin:    'bg-orange-600/15 text-orange-400 border-orange-600/25',
  operator: 'bg-blue-600/15 text-blue-400 border-blue-600/25',
  viewer:   'bg-zinc-700/40 text-zinc-400 border-zinc-600/25',
}

const TABS = [
  { key: 'organization', icon: Building2, label: 'Organization' },
  { key: 'members',      icon: Users,     label: 'Members' },
  { key: 'account',      icon: Mail,      label: 'Account' },
]

// ── Shared primitives 
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
        {subtitle && <p className="text-zinc-600 text-xs mt-0.5">{subtitle}</p>}
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

function Input({ readOnly, ...props }) {
  return (
    <input
      readOnly={readOnly}
      className={`w-full bg-zinc-900 border text-white text-sm px-4 py-2.5 rounded font-mono
        placeholder:text-zinc-700 focus:outline-none transition-colors
        ${readOnly
          ? 'border-zinc-800 text-zinc-500 cursor-not-allowed'
          : 'border-zinc-800 focus:border-red-600'
        }`}
      {...props}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm px-4 py-2.5 rounded
        font-mono focus:outline-none focus:border-red-600 transition-colors"
      {...props}
    >
      {children}
    </select>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-5 h-px bg-red-600" />
      <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">{children}</span>
    </div>
  )
}

// ── Main page 
export default function SettingsPage() {
  const qc = useQueryClient()
  const { activeOrg, user } = useAuthStore()
  const [tab, setTab] = useState('organization')
  const [showInvite, setShowInvite] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [deleteInviteTarget, setDeleteInviteTarget] = useState(null)
  const orgId = activeOrg?.id

  // ── Queries 
  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => getOrganization(orgId),
    enabled: !!orgId,
  })
  const { data: members } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => listMembers(orgId),
    enabled: !!orgId,
  })
  const { data: invitations } = useQuery({
    queryKey: ['invitations', orgId],
    queryFn: () => listInvitations(orgId),
    enabled: !!orgId,
  })

  // ── Mutations 
  const updateOrgMut = useMutation({
    mutationFn: (data) => updateOrganization(orgId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization', orgId] }); toast.success('Organization updated') },
    onError: () => toast.error('Failed to update'),
  })
  const updateMemberMut = useMutation({
    mutationFn: ({ memberId, role }) => updateMember(orgId, memberId, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', orgId] }); toast.success('Role updated') },
  })
  const removeMemberMut = useMutation({
    mutationFn: (memberId) => removeMember(orgId, memberId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', orgId] }); toast.success('Member removed'); setRemoveTarget(null) },
  })
  const inviteMut = useMutation({
    mutationFn: (data) => sendInvitation(orgId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invitations', orgId] }); toast.success('Invitation sent'); setShowInvite(false); resetInvite() },
    onError: () => toast.error('Failed to send invite'),
  })
  const deleteInviteMut = useMutation({
    mutationFn: (invId) => deleteInvitation(orgId, invId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invitations', orgId] }); toast.success('Invitation cancelled'); setDeleteInviteTarget(null) },
  })
  const changePassMut = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { toast.success('Password changed'); resetPass() },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed'),
  })

  // ── Forms 
  const { register: registerOrg, handleSubmit: handleOrgSubmit, reset: resetOrg } = useForm()
  const { register: registerInvite, handleSubmit: handleInviteSubmit, reset: resetInvite } = useForm({ defaultValues: { role: 'operator' } })
  const { register: registerPass, handleSubmit: handlePassSubmit, reset: resetPass, formState: { errors: passErrors } } = useForm()

  useEffect(() => { if (org) resetOrg(org) }, [org, resetOrg])

  const membersList = members?.results ?? members ?? []
  const invitationsList = invitations?.results ?? invitations ?? []

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
        <div className="relative">
          <SectionLabel>Configuration</SectionLabel>
          <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white mt-2">
            Settings
          </h1>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">

        {/*  Tabs  */}
        <div className="flex gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden w-fit">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-[0.15em] transition-colors ${
                tab === key
                  ? 'bg-red-600/15 text-red-400'
                  : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/*  Organization tab  */}
        {tab === 'organization' && (
          <Panel className="max-w-2xl">
            <PanelHeader
              title="Organization Details"
              subtitle="Update your organization's profile and contact information"
            />
            <form onSubmit={handleOrgSubmit((d) => updateOrgMut.mutate(d))} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input placeholder="Acme Corp" {...registerOrg('name')} />
                </div>
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <Input readOnly {...registerOrg('slug')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Contact Email</FieldLabel>
                  <Input type="email" placeholder="contact@org.com" {...registerOrg('contact_email')} />
                </div>
                <div>
                  <FieldLabel>Contact Phone</FieldLabel>
                  <Input placeholder="+1 555 000 0000" {...registerOrg('contact_phone')} />
                </div>
              </div>
              <div>
                <FieldLabel>Address</FieldLabel>
                <Input placeholder="123 Ops Center Blvd" {...registerOrg('address')} />
              </div>
              <div>
                <FieldLabel>Subscription Plan</FieldLabel>
                <Input readOnly {...registerOrg('subscription_plan')} />
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={updateOrgMut.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                    text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
                >
                  {updateOrgMut.isPending ? <Spinner size="sm" /> : <Save size={13} />}
                  Save Changes
                </button>
              </div>
            </form>
          </Panel>
        )}

        {/*  Members tab  */}
        {tab === 'members' && (
          <div className="space-y-5">

            {/* Members table */}
            <Panel>
              <PanelHeader
                title={`Members · ${membersList.length}`}
                subtitle="Manage team roles and access"
                action={
                  <button
                    onClick={() => { resetInvite(); setShowInvite(true) }}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
                      text-xs font-mono uppercase tracking-widest px-4 py-2 rounded transition-colors"
                  >
                    <UserPlus size={13} />
                    Invite
                  </button>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['User', 'Role', 'Joined', ''].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-mono uppercase tracking-widest text-zinc-600">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {membersList.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-red-600/15 border border-red-600/25 flex items-center justify-center shrink-0">
                              <span className="text-red-400 text-xs font-display font-bold uppercase">
                                {m.user_full_name?.[0] ?? m.user_email?.[0] ?? '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-200">{m.user_full_name}</p>
                              <p className="text-xs text-zinc-600 font-mono">{m.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            defaultValue={m.role}
                            onChange={(e) => updateMemberMut.mutate({ memberId: m.id, role: e.target.value })}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono
                              uppercase tracking-wider px-3 py-1.5 rounded focus:outline-none focus:border-red-600
                              transition-colors w-32"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-600 font-mono">
                            {m.joined_at ? format(new Date(m.joined_at), 'dd MMM yyyy') : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {m.user_email !== user?.email && (
                            <button
                              onClick={() => setRemoveTarget(m)}
                              className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Pending invitations */}
            {invitationsList.length > 0 && (
              <Panel>
                <PanelHeader title="Pending Invitations" subtitle="Awaiting acceptance" />
                <div className="divide-y divide-zinc-800/50">
                  {invitationsList.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                          <Mail size={13} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm text-zinc-200 font-mono">{inv.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${ROLE_STYLE[inv.role] ?? ROLE_STYLE.viewer}`}>
                              {inv.role}
                            </span>
                            <span className="text-xs text-zinc-600 font-mono">
                              {inv.accepted
                                ? 'Accepted'
                                : `Expires ${format(new Date(inv.expires_at), 'dd MMM')}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteInviteTarget(inv)}
                        className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/*  Account tab  */}
        {tab === 'account' && (
          <div className="max-w-md space-y-5">
            {/* Profile info strip */}
            {user && (
              <Panel>
                <PanelHeader title="Account" />
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-5 pb-5 border-b border-zinc-800">
                    <div className="w-12 h-12 rounded bg-red-600/15 border border-red-600/25 flex items-center justify-center shrink-0">
                      <span className="text-red-400 text-lg font-display font-black uppercase">
                        {user?.first_name?.[0] ?? user?.email?.[0] ?? 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-display font-semibold uppercase tracking-wider text-sm">
                        {user?.full_name ?? user?.email}
                      </p>
                      <p className="text-zinc-500 text-xs font-mono">{user?.email}</p>
                    </div>
                  </div>
                  {activeOrg && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-zinc-600 text-xs font-mono uppercase tracking-wider">Organization</span>
                      <span className="text-zinc-300 text-xs font-mono">{activeOrg.name}</span>
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Change password */}
            <Panel>
              <PanelHeader
                title="Change Password"
                subtitle="Use a strong, unique password"
              />
              <form onSubmit={handlePassSubmit((d) => changePassMut.mutate(d))} className="p-6 space-y-4">
                <div>
                  <FieldLabel>Current Password</FieldLabel>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm pl-9 pr-4 py-2.5
                        rounded font-mono focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-700"
                      {...registerPass('old_password', { required: 'Required' })}
                    />
                  </div>
                  {passErrors.old_password && (
                    <p className="flex items-center gap-1 text-xs text-red-400 font-mono mt-1.5">
                      <AlertCircle size={11} /> {passErrors.old_password.message}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>New Password</FieldLabel>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm pl-9 pr-4 py-2.5
                        rounded font-mono focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-700"
                      {...registerPass('new_password', { required: 'Required', minLength: { value: 8, message: 'Min. 8 characters' } })}
                    />
                  </div>
                  {passErrors.new_password && (
                    <p className="flex items-center gap-1 text-xs text-red-400 font-mono mt-1.5">
                      <AlertCircle size={11} /> {passErrors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={changePassMut.isPending}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                      text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
                  >
                    {changePassMut.isPending ? <Spinner size="sm" /> : <Save size={13} />}
                    Update Password
                  </button>
                </div>
              </form>
            </Panel>
          </div>
        )}
      </div>

      {/* ── Invite modal ───────────────────────────────────────────────────── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Send Invitation" size="sm">
        <form onSubmit={handleInviteSubmit((d) => inviteMut.mutate(d))} className="space-y-5">
          <div>
            <FieldLabel>Email Address *</FieldLabel>
            <Input
              type="email"
              placeholder="operator@unit.gov"
              {...registerInvite('email', { required: true })}
            />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select {...registerInvite('role')}>
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500
                text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMut.isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                text-white text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
            >
              {inviteMut.isPending && <Spinner size="sm" />}
              Send Invite
              <ChevronRight size={13} />
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm dialogs */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMemberMut.mutate(removeTarget.id)}
        title="Remove Member"
        message={`Remove ${removeTarget?.user_full_name} from the organization?`}
        danger
        loading={removeMemberMut.isPending}
      />
      <ConfirmDialog
        open={!!deleteInviteTarget}
        onClose={() => setDeleteInviteTarget(null)}
        onConfirm={() => deleteInviteMut.mutate(deleteInviteTarget.id)}
        title="Cancel Invitation"
        message={`Cancel invitation to ${deleteInviteTarget?.email}?`}
        danger
        loading={deleteInviteMut.isPending}
      />
    </div>
  )
}