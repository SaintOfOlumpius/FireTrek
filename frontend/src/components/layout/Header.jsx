import { Bell, ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listNotifications } from '../../api/notifications.js'
import { useAuthStore } from '../../store/authStore.js'

const ROUTE_LABELS = {
  '/':               ['Overview',    'Dashboard'],
  '/firearms':       ['Assets',      'Firearms'],
  '/devices':        ['Assets',      'Devices'],
  '/tracking':       ['Operations',  'Live Tracking'],
  '/geofencing':     ['Operations',  'Geofencing'],
  '/alerts':         ['Operations',  'Alerts'],
  '/incidents':      ['Operations',  'Incidents'],
  '/notifications':  ['System',      'Notifications'],
  '/audit':          ['System',      'Audit Logs'],
  '/settings':       ['System',      'Settings'],
}

export default function Header({ title, subtitle, actions }) {
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(),
    refetchInterval: 30_000,
  })

  const unreadCount = (notifs?.results ?? []).filter((n) => n.status !== 'read').length

  // Resolve breadcrumb from route or fall back to props
  const [section, pageTitle] = ROUTE_LABELS[pathname] ?? ['—', title]

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900">
      {/* ── Thin red accent line at very top ─────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />

      <div className="flex items-center justify-between px-6 h-14">

        {/* ── Left: breadcrumb + title ─────────────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Section label */}
          <span className="hidden sm:block text-zinc-600 text-xs font-mono uppercase tracking-widest shrink-0">
            {section}
          </span>
          <ChevronRight size={12} className="hidden sm:block text-zinc-800 shrink-0" />

          {/* Page title */}
          <h1 className="font-display font-bold text-sm uppercase tracking-[0.15em] text-white truncate">
            {pageTitle || title}
          </h1>

          {/* Optional subtitle inline */}
          {subtitle && (
            <>
              <span className="text-zinc-800 text-xs hidden md:block">·</span>
              <p className="text-zinc-600 text-xs font-mono hidden md:block truncate">{subtitle}</p>
            </>
          )}
        </div>

        {/* ── Right: actions + notifications + user ───────────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Page-level actions (e.g. "Provision Device" button) */}
          {actions && (
            <div className="flex items-center gap-2 mr-1">
              {actions}
            </div>
          )}

          {/* Notification bell */}
          <Link
            to="/notifications"
            className="relative p-2 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60
              transition-colors border border-transparent hover:border-zinc-800"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-red-600
                text-[9px] font-bold text-white flex items-center justify-center px-0.5 font-mono">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User avatar */}
          {user && (
            <Link
              to="/settings"
              className="flex items-center gap-2 pl-2 border-l border-zinc-800 ml-1"
            >
              <div className="w-6 h-6 rounded bg-red-600/20 border border-red-600/30
                flex items-center justify-center shrink-0">
                <span className="text-red-400 text-[10px] font-display font-black uppercase">
                  {user?.first_name?.[0] ?? user?.email?.[0] ?? 'U'}
                </span>
              </div>
              <span className="hidden lg:block text-zinc-500 text-xs font-mono hover:text-zinc-300 transition-colors truncate max-w-[100px]">
                {user?.full_name ?? user?.email}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}