import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ClipboardList, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { listAuditLogs } from '../../api/audit.js'

// ── Method config ─────────────────────────────────────────────────────────────
const METHOD = {
  GET:    { text: 'text-blue-400',    bg: 'bg-blue-600/10 border-blue-600/20' },
  POST:   { text: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-600/20' },
  PUT:    { text: 'text-yellow-400',  bg: 'bg-yellow-600/10 border-yellow-600/20' },
  PATCH:  { text: 'text-orange-400',  bg: 'bg-orange-600/10 border-orange-600/20' },
  DELETE: { text: 'text-red-400',     bg: 'bg-red-600/10 border-red-600/20' },
}
const getMethod = (m) => METHOD[m] ?? { text: 'text-zinc-400', bg: 'bg-zinc-800/60 border-zinc-700/30' }

// ── Status code colour ────────────────────────────────────────────────────────
function statusColor(code) {
  if (!code) return 'text-zinc-600'
  if (code < 300) return 'text-emerald-400'
  if (code < 400) return 'text-yellow-400'
  return 'text-red-400'
}

// ── Primitives ────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-5 h-px bg-red-600" />
      <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">{children}</span>
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [search, setSearch]         = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [page, setPage]             = useState(1)

  const params = { page }
  if (search)       params.search = search
  if (methodFilter) params.method = methodFilter

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
  })

  const logs       = data?.results ?? []
  const totalPages = Math.ceil((data?.count ?? 0) / 50)

  return (
    <div className="flex flex-col min-h-full bg-black">

      {/* ── Page header ───────────────────────────────────────────────────── */}
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
          <SectionLabel>System</SectionLabel>
          <div className="flex items-end justify-between mt-2">
            <h1 className="font-display font-black text-2xl uppercase tracking-wide text-white">
              Audit Logs
            </h1>
            {/* Live count strip */}
            <div className="flex gap-px bg-zinc-800 border border-zinc-800 rounded overflow-hidden">
              {[
                { label: 'Total',   value: data?.count ?? 0 },
                { label: 'Page',    value: `${page}/${totalPages || 1}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-950 px-4 py-1.5 text-center">
                  <p className="text-sm font-display font-black text-white leading-none">{value}</p>
                  <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm pl-9 pr-4 py-2.5
                rounded font-mono placeholder:text-zinc-700 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="Search path, email, object ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          {/* Method filter pills */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={12} className="text-zinc-600 mr-1" />
            {['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => {
              const cfg = m ? getMethod(m) : null
              const isActive = methodFilter === m
              return (
                <button
                  key={m}
                  onClick={() => { setMethodFilter(m); setPage(1) }}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono uppercase tracking-wider
                    transition-colors border ${
                      isActive
                        ? m
                          ? `${cfg.bg} ${cfg.text}`
                          : 'bg-red-600/20 text-red-400 border-red-600/30'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                    }`}
                >
                  {m || 'All'}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Log table ─────────────────────────────────────────────────── */}
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Method', 'Path', 'Status', 'User', 'IP Address', 'Elapsed', 'Timestamp'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className={`h-3 bg-zinc-800 rounded animate-pulse ${j === 1 ? 'w-full' : 'w-16'}`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                          <ClipboardList size={22} className="text-zinc-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-300 font-display font-semibold uppercase tracking-wider text-sm">
                            No Audit Logs
                          </p>
                          <p className="text-zinc-600 text-xs font-mono mt-1">
                            {search || methodFilter ? 'Try adjusting your filters.' : 'All system actions will appear here.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const m = getMethod(log.method)
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-zinc-900/40 transition-colors group"
                      >
                        {/* Method badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[10px] font-mono font-bold px-2 py-0.5
                            rounded border uppercase tracking-wider ${m.bg} ${m.text}`}>
                            {log.method}
                          </span>
                        </td>

                        {/* Path */}
                        <td className="px-4 py-3 max-w-xs">
                          <span className="font-mono text-xs text-zinc-400 truncate block" title={log.path}>
                            {log.path}
                          </span>
                        </td>

                        {/* Status code */}
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs font-bold ${statusColor(log.status_code)}`}>
                            {log.status_code ?? '—'}
                          </span>
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 max-w-[140px]">
                          <span className="text-zinc-400 text-xs font-mono truncate block">
                            {log.user_email || (
                              <span className="text-zinc-700">anonymous</span>
                            )}
                          </span>
                        </td>

                        {/* IP */}
                        <td className="px-4 py-3">
                          <span className="text-zinc-600 text-xs font-mono">{log.ip_address || '—'}</span>
                        </td>

                        {/* Elapsed */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono ${
                            log.elapsed_ms != null
                              ? log.elapsed_ms > 1000 ? 'text-orange-400'
                              : log.elapsed_ms > 500  ? 'text-yellow-500'
                              : 'text-zinc-600'
                              : 'text-zinc-700'
                          }`}>
                            {log.elapsed_ms != null ? `${log.elapsed_ms}ms` : '—'}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-3">
                          <span className="text-zinc-600 text-xs font-mono whitespace-nowrap">
                            {log.timestamp
                              ? format(new Date(log.timestamp), 'dd MMM HH:mm:ss')
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — inside the panel, at the bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800">
              <p className="text-zinc-600 text-xs font-mono">
                Page {page} of {totalPages} · {data?.count ?? 0} entries
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200
                    hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed
                    text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200
                    hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed
                    text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}