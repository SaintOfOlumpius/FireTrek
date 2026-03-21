import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../components/layout/Header.jsx'
import Badge from '../../components/ui/Badge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { listNotifications, markRead, markAllRead } from '../../api/notifications.js'
import clsx from 'clsx'

const CHANNEL_COLORS = { in_app: 'badge-blue', email: 'badge-zinc', sms: 'badge-green', push: 'badge-orange' }

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(),
    refetchInterval: 30_000,
  })

  const markReadMut = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read') },
  })

  const notifications = data?.results ?? []
  const unreadCount = notifications.filter((n) => n.status !== 'read').length

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 && (
            <button className="btn-secondary" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}>
              {markAllMut.isPending ? <Spinner size="sm" /> : <CheckCheck size={16} />}
              Mark all read
            </button>
          )
        }
      />

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-zinc-800/50">
              {notifications.map((n) => {
                const isUnread = n.status !== 'read'
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      'flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer',
                      isUnread ? 'bg-fire-600/5 hover:bg-fire-600/10' : 'hover:bg-zinc-800/30',
                    )}
                    onClick={() => isUnread && markReadMut.mutate(n.id)}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-fire-500' : 'bg-zinc-700'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isUnread ? 'font-medium text-zinc-200' : 'text-zinc-400'}`}>{n.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <Badge className={CHANNEL_COLORS[n.channel] ?? 'badge-zinc'}>{n.channel}</Badge>
                        <Badge variant={n.status}>{n.status}</Badge>
                        <span className="text-xs text-zinc-600">{format(new Date(n.created_at), 'dd MMM HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
