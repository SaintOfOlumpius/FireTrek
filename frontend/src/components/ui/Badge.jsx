import clsx from 'clsx'

const variants = {
  critical: 'badge-red',
  warning:  'badge-yellow',
  info:     'badge-blue',
  success:  'badge-green',
  default:  'badge-zinc',
  orange:   'badge-orange',
  // status aliases
  active:             'badge-green',
  online:             'badge-green',
  inactive:           'badge-zinc',
  offline:            'badge-zinc',
  lost:               'badge-orange',
  stolen:             'badge-red',
  decommissioned:     'badge-zinc',
  low_battery:        'badge-yellow',
  tampered:           'badge-red',
  open:               'badge-red',
  investigating:      'badge-orange',
  resolved:           'badge-green',
  escalated:          'badge-red',
  closed:             'badge-zinc',
  pending:            'badge-yellow',
  in_progress:        'badge-blue',
  completed:          'badge-green',
  failed:             'badge-red',
  cancelled:          'badge-zinc',
  read:               'badge-zinc',
  sent:               'badge-blue',
  delivered:          'badge-green',
}

export default function Badge({ variant = 'default', children, className, dot = false }) {
  return (
    <span className={clsx(variants[variant] ?? 'badge-zinc', className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor(variant))} />}
      {children}
    </span>
  )
}

function dotColor(v) {
  if (['critical','stolen','tampered','open','escalated','failed'].includes(v)) return 'bg-red-400'
  if (['warning','lost','low_battery','pending'].includes(v)) return 'bg-yellow-400'
  if (['success','active','online','resolved','completed','delivered'].includes(v)) return 'bg-green-400'
  if (['info','in_progress','sent'].includes(v)) return 'bg-blue-400'
  return 'bg-zinc-400'
}
