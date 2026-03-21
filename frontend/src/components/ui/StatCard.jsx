import clsx from 'clsx'

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'zinc' }) {
  const colors = {
    red:    { bg: 'bg-fire-600/10',  icon: 'text-fire-500',   border: 'border-fire-600/20' },
    green:  { bg: 'bg-green-600/10', icon: 'text-green-500',  border: 'border-green-600/20' },
    yellow: { bg: 'bg-yellow-600/10',icon: 'text-yellow-500', border: 'border-yellow-600/20' },
    blue:   { bg: 'bg-blue-600/10',  icon: 'text-blue-500',   border: 'border-blue-600/20' },
    zinc:   { bg: 'bg-zinc-800',      icon: 'text-zinc-400',  border: 'border-zinc-700' },
  }
  const c = colors[color] ?? colors.zinc

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          {trend != null && (
            <p className={clsx('mt-2 text-xs font-medium', trend >= 0 ? 'text-red-400' : 'text-green-400')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} from last hour
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center border', c.bg, c.border)}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  )
}
