import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'
import clsx from 'clsx'
import {
  LayoutDashboard, Crosshair, Cpu, MapPin, Shield,
  Bell, AlertTriangle, FileWarning, Settings, ChevronLeft,
  ChevronRight, ClipboardList, LogOut, Activity,
} from 'lucide-react'

const NAV = [
  { section: 'Overview', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  ]},
  { section: 'Assets', items: [
    { to: '/firearms', icon: Crosshair, label: 'Firearms' },
    { to: '/devices',  icon: Cpu,       label: 'Devices' },
  ]},
  { section: 'Tracking', items: [
    { to: '/tracking',   icon: MapPin, label: 'Live Tracking' },
    { to: '/geofencing', icon: Shield, label: 'Geofencing' },
  ]},
  { section: 'Operations', items: [
    { to: '/alerts',        icon: AlertTriangle, label: 'Alerts' },
    { to: '/incidents',     icon: FileWarning,   label: 'Incidents' },
    { to: '/notifications', icon: Bell,          label: 'Notifications' },
  ]},
  { section: 'System', items: [
    { to: '/audit',    icon: ClipboardList, label: 'Audit Logs' },
    { to: '/settings', icon: Settings,      label: 'Settings' },
  ]},
]

export default function Sidebar() {
  const { user, activeOrg, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-zinc-950 border-r border-zinc-900 transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* ── Logo  */}
      <div className={clsx(
        'flex items-center gap-3 border-b border-zinc-900 h-16 px-4 relative overflow-hidden',
        sidebarCollapsed && 'justify-center px-0',
      )}>
        {/* Subtle grid behind logo — same as landing nav */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo mark */}
        <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center shrink-0 relative z-10">
          <Activity size={13} className="text-white" />
        </div>

        {/* Wordmark */}
        {!sidebarCollapsed && (
          <div className="relative z-10 min-w-0">
            <span className="font-display font-bold tracking-[0.18em] text-white uppercase text-sm leading-none">
              FireTrek
            </span>
            {activeOrg && (
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider truncate max-w-[120px] mt-0.5">
                {activeOrg.name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Nav  */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            {/* Section label — same red line + mono style as landing */}
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <div className="w-3 h-px bg-red-600/60" />
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                  {section}
                </p>
              </div>
            )}

            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-2.5 py-2 rounded text-sm transition-all duration-150 border group',
                      sidebarCollapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-red-600/12 text-red-400 border-red-600/25'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 border-transparent',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={15}
                        className={clsx(
                          'shrink-0 transition-colors',
                          isActive ? 'text-red-400' : 'text-zinc-600 group-hover:text-zinc-300',
                        )}
                      />
                      {!sidebarCollapsed && (
                        <span className="font-medium text-sm">{label}</span>
                      )}
                      {/* Active indicator dot */}
                      {!sidebarCollapsed && isActive && (
                        <span className="ml-auto w-1 h-1 rounded-full bg-red-500 shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User + Logout  */}
      <div className={clsx(
        'border-t border-zinc-900 p-2',
        sidebarCollapsed ? 'flex flex-col items-center gap-1' : '',
      )}>
        {/* User card */}
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded bg-zinc-900/60 border border-zinc-800/60">
            {/* Avatar */}
            <div className="w-7 h-7 rounded bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
              <span className="text-red-400 text-xs font-display font-bold uppercase">
                {user?.first_name?.[0] ?? user?.email?.[0] ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">
                {user?.full_name ?? user?.email}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">
                {user?.email}
              </p>
            </div>
          </div>
        )}

        {/* Collapsed avatar */}
        {sidebarCollapsed && user && (
          <div className="w-7 h-7 rounded bg-red-600/20 border border-red-600/30 flex items-center justify-center mb-1">
            <span className="text-red-400 text-xs font-display font-bold uppercase">
              {user?.first_name?.[0] ?? user?.email?.[0] ?? 'U'}
            </span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className={clsx(
            'flex items-center gap-2 px-2.5 py-2 w-full rounded text-xs text-zinc-600',
            'hover:text-red-400 hover:bg-zinc-800/60 transition-colors border border-transparent',
            'font-mono uppercase tracking-wider',
            sidebarCollapsed && 'justify-center',
          )}
        >
          <LogOut size={14} className="shrink-0" />
          {!sidebarCollapsed && 'Logout'}
        </button>
      </div>

      {/* ── Collapse toggle  */}
      <button
        onClick={toggleSidebar}
        className={clsx(
          'absolute -right-3 top-[68px] w-6 h-6 rounded-full z-10',
          'bg-zinc-900 border border-zinc-700 flex items-center justify-center',
          'text-zinc-500 hover:text-zinc-100 hover:border-zinc-500 transition-all duration-150',
        )}
      >
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </aside>
  )
}