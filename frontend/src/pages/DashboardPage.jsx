import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import {
  Crosshair, Cpu, AlertTriangle, FileWarning,
  CheckCircle, ChevronRight, Activity, TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listFirearms } from '../api/firearms.js'
import { listDevices } from '../api/devices.js'
import { listAlerts } from '../api/alerts.js'
import { listIncidents } from '../api/incidents.js'

// ── Design tokens (matching landing page) ───────────────────────────────────
// bg-black / bg-zinc-950 panels
// border-zinc-800 / border-zinc-900 borders
// font-display uppercase tracking-wider headings
// text-red-500/400 accents
// text-zinc-500 body / labels
// font-mono for data/values

const ALERT_TYPE_LABELS = {
  geofence_breach: 'Geofence',
  low_battery: 'Low Battery',
  critical_battery: 'Crit Battery',
  device_offline: 'Offline',
  tamper_detected: 'Tamper',
  sos_signal: 'SOS',
  unauthorized_movement: 'Unauth Move',
  license_expiry: 'License',
}

const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca']

const severityDot = {
  critical: 'bg-red-500 animate-pulse',
  warning: 'bg-orange-500',
  info: 'bg-zinc-500',
}

const severityBadgeStyle = {
  critical: 'bg-red-600/15 text-red-400 border border-red-600/25',
  warning: 'bg-orange-600/15 text-orange-400 border border-orange-600/25',
  info: 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/25',
}

const pieColors = {
  online: '#22c55e',
  offline: '#3f3f46',
  low_battery: '#f59e0b',
  tampered: '#ef4444',
  decommissioned: '#27272a',
}

// ── Custom chart tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
      <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-red-400 text-sm font-display font-bold">{payload[0].value} alerts</p>
    </div>
  )
}

// ── Stat card (landing-page-matching aesthetic) ───────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, accent = false }) {
  return (
    <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-5 group hover:border-zinc-700 transition-all duration-200 overflow-hidden">
      {/* Subtle corner glow on accent */}
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/6 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded border flex items-center justify-center shrink-0 ${
          accent
            ? 'bg-red-600/10 border-red-600/20 text-red-400'
            : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400'
        }`}>
          <Icon size={16} />
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${accent ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'}`} />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">{title}</p>
      <p className="text-3xl font-display font-black text-white leading-none">{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-600 mt-2 font-mono">{subtitle}</p>
      )}
    </div>
  )
}

// ── Section label (same pill as landing page) ────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-5 h-px bg-red-600" />
      <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">{children}</span>
    </div>
  )
}

// ── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ children, className = '' }) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function PanelHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">{title}</h3>
      {action}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: firearms, isLoading: firearmsLoading } = useQuery({
    queryKey: ['firearms'],
    queryFn: () => listFirearms(),
  })
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => listDevices(),
  })
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'open'],
    queryFn: () => listAlerts(),
    refetchInterval: 15_000,
  })
  const { data: incidents } = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => listIncidents({ status: 'open' }),
  })

  const isLoading = firearmsLoading || devicesLoading || alertsLoading

  const onlineDevices = devices?.results?.filter((d) => d.status === 'online') ?? []
  const openAlerts = alerts?.results ?? []
  const recentAlerts = openAlerts.slice(0, 8)

  const alertTypeCounts = openAlerts.reduce((acc, a) => {
    acc[a.alert_type] = (acc[a.alert_type] ?? 0) + 1
    return acc
  }, {})
  const alertChartData = Object.entries(alertTypeCounts).map(([type, count]) => ({
    name: ALERT_TYPE_LABELS[type] ?? type,
    count,
  }))

  const deviceStatusCounts = (devices?.results ?? []).reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(deviceStatusCounts).map(([name, value]) => ({ name, value }))

  // Skeleton shimmer
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-7 w-56 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-4">
              <div className="h-9 w-9 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg h-64 animate-pulse" />
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-black">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 px-6 py-5 relative overflow-hidden">
        {/* Subtle grid texture — same as landing hero */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute right-0 top-0 w-64 h-full bg-red-600/4 blur-3xl pointer-events-none" />

        <div className="relative">
          <SectionLabel>Operations Center</SectionLabel>
          <div className="flex items-end justify-between mt-2">
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white">
              Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                Live · {format(new Date(), 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Firearms"
            value={firearms?.count ?? '—'}
            subtitle={`${firearms?.results?.filter(f => f.status === 'active').length ?? 0} active`}
            icon={Crosshair}
            accent
          />
          <StatCard
            title="Devices Online"
            value={onlineDevices.length}
            subtitle={`of ${devices?.count ?? 0} total`}
            icon={Cpu}
          />
          <StatCard
            title="Open Alerts"
            value={alerts?.count ?? '—'}
            subtitle="Requires attention"
            icon={AlertTriangle}
            accent={alerts?.count > 0}
          />
          <StatCard
            title="Open Incidents"
            value={incidents?.count ?? '—'}
            subtitle="Active investigations"
            icon={FileWarning}
          />
        </div>

        {/* ── Charts ────────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>System Analytics</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">

            {/* Bar chart — 2/3 width */}
            <Panel className="lg:col-span-2">
              <PanelHeader
                title="Open Alerts by Type"
                action={
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-zinc-600" />
                    <span className="text-xs text-zinc-600 font-mono">{openAlerts.length} total</span>
                  </div>
                }
              />
              <div className="p-5 h-52">
                {alertChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alertChartData} barCategoryGap="35%">
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {alertChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-10 h-10 rounded border border-emerald-600/20 bg-emerald-600/10 flex items-center justify-center">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-300 text-sm font-display font-semibold uppercase tracking-wider">All Clear</p>
                      <p className="text-zinc-600 text-xs font-mono mt-0.5">No open alerts</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Pie chart — 1/3 width */}
            <Panel>
              <PanelHeader title="Device Status" />
              <div className="p-5 h-52">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="42%"
                        outerRadius={65}
                        innerRadius={38}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={pieColors[entry.name] ?? '#52525b'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#09090b',
                          border: '1px solid #27272a',
                          borderRadius: 8,
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{
                          fontSize: 10,
                          color: '#71717a',
                          fontFamily: 'JetBrains Mono, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs font-mono">
                    No device data
                  </div>
                )}
              </div>
            </Panel>

          </div>
        </div>

        {/* ── Recent alerts ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Alert Feed</SectionLabel>
          <Panel className="mt-3">
            <PanelHeader
              title="Recent Alerts"
              action={
                <Link
                  to="/alerts"
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-mono uppercase tracking-wider transition-colors"
                >
                  View all <ChevronRight size={11} />
                </Link>
              }
            />

            {recentAlerts.length > 0 ? (
              <div className="divide-y divide-zinc-800/60">
                {recentAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to="/alerts"
                    className="flex items-start gap-4 px-5 py-3.5 hover:bg-zinc-900/60 transition-colors group"
                  >
                    {/* Severity dot */}
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[alert.severity] ?? severityDot.info}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                        {alert.title}
                      </p>
                      <p className="text-xs text-zinc-600 font-mono mt-0.5">
                        {alert.firearm_serial && `SN: ${alert.firearm_serial}`}
                        {alert.firearm_serial && alert.device_uid && ' · '}
                        {alert.device_uid && `Device: ${alert.device_uid}`}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider ${severityBadgeStyle[alert.severity] ?? severityBadgeStyle.info}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-zinc-700 font-mono w-10 text-right">
                        {format(new Date(alert.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-10 h-10 rounded border border-emerald-600/20 bg-emerald-600/10 flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-zinc-300 text-sm font-display font-semibold uppercase tracking-wider">
                    All Clear
                  </p>
                  <p className="text-zinc-600 text-xs font-mono mt-0.5">No open alerts</p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── System status strip — same as landing page security section ── */}
        <div>
          <SectionLabel>System Health</SectionLabel>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
            {[
              {
                label: 'Firearms Tracked',
                value: `${firearms?.count ?? 0}`,
                sub: 'in registry',
              },
              {
                label: 'Devices Online',
                value: `${onlineDevices.length}/${devices?.count ?? 0}`,
                sub: 'live connections',
              },
              {
                label: 'Alert Rate',
                value: openAlerts.length > 0 ? `${openAlerts.length}` : '0',
                sub: 'open right now',
              },
              {
                label: 'Incidents',
                value: `${incidents?.count ?? 0}`,
                sub: 'under review',
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-zinc-950 px-5 py-4 text-center hover:bg-zinc-900/60 transition-colors">
                <p className="text-xl font-display font-black text-white">{value}</p>
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">{label}</p>
                <p className="text-zinc-700 text-xs font-mono mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}