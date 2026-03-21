import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Activity, AlertCircle, ChevronRight } from 'lucide-react'
import { login, getMe } from '../../api/auth.js'
import { listOrganizations } from '../../api/organizations.js'
import { useAuthStore } from '../../store/authStore.js'
import Spinner from '../../components/ui/Spinner.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login: storeLogin, devLogin } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setAuthError(null)
    try {
      const tokens = await login(email, password)
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh)
      const [user, orgs] = await Promise.all([getMe(), listOrganizations()])
      const firstOrg = orgs?.results?.[0] ?? orgs?.[0] ?? null
      storeLogin(user, tokens.access, tokens.refresh, firstOrg)
      toast.success('Access granted.')
      navigate('/dashboard')
    } catch (e) {
      setAuthError(e?.response?.data?.detail ?? 'Invalid credentials. Access denied.')
    }
  }

  const handleDevLogin = () => {
    devLogin()
    setTimeout(() => navigate('/dashboard'), 50)
  }

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">

      {/* ── Left panel — branding ──────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 border-r border-zinc-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Red glow */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-600/6 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <Activity size={15} className="text-white" />
          </div>
          <span className="font-display font-bold tracking-[0.2em] text-white uppercase text-base">
            FireTrek
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-red-600" />
            <span className="text-red-500 text-xs font-mono uppercase tracking-[0.3em]">
              Tactical Asset Intelligence
            </span>
          </div>

          <h2 className="font-display font-black text-5xl uppercase leading-tight text-white">
            Situational<br />
            Awareness.<br />
            <span className="text-red-600">In Real Time.</span>
          </h2>

          <p className="text-zinc-500 leading-relaxed max-w-sm text-sm">
            Monitor every asset. Respond to every alert. Command every incident —
            from a single, unified operations dashboard.
          </p>

          {/* Feature bullets */}
          <div className="space-y-3 pt-2">
            {[
              'Live GPS tracking on all registered assets',
              'Instant alerts for geofence breaches & anomalies',
              'Immutable chain-of-custody for every firearm',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-600/15 border border-red-600/30 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <span className="text-zinc-400 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat strip — same as landing page */}
        <div className="relative z-10 grid grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {[
            { value: '< 500ms', label: 'Latency' },
            { value: '99.97%', label: 'Uptime' },
            { value: 'AES-256', label: 'Encryption' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-zinc-950 px-4 py-3 text-center">
              <p className="text-base font-display font-bold text-white">{value}</p>
              <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/4 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center">
              <Activity size={13} className="text-white" />
            </div>
            <span className="font-display font-bold tracking-[0.2em] text-white uppercase">
              FireTrek
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-px bg-red-600" />
              <span className="text-red-500 text-xs font-mono uppercase tracking-[0.25em]">
                Secure Access
              </span>
            </div>
            <h1 className="text-white font-display font-black text-3xl uppercase tracking-wide">
              Sign In
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Authorized personnel only.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="operator@unit.gov"
                autoComplete="email"
                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-700 font-mono"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-xs text-red-400 font-mono mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 pr-11 rounded focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-700 font-mono"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-mono mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Auth error banner */}
            {authError && (
              <div className="flex items-center gap-2.5 bg-red-600/10 border border-red-600/25 rounded px-4 py-3">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs font-mono">{authError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-bold uppercase tracking-widest text-sm py-3.5 rounded transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access System
                  <ChevronRight size={15} />
                </>
              )}
            </button>

            {/* Dev bypass */}
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleDevLogin}
                className="w-full text-center text-xs text-zinc-700 hover:text-zinc-500 font-mono transition-colors pt-1"
              >
                ⚡ Dev bypass
              </button>
            )}
          </form>

          {/* Register link */}
          <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between">
            <p className="text-zinc-600 text-xs font-mono">
              No account?{' '}
              <Link
                to="/register"
                className="text-red-500 hover:text-red-400 transition-colors"
              >
                Request access
              </Link>
            </p>
            <p className="text-zinc-700 text-xs font-mono">v1.0</p>
          </div>

          {/* Legal note */}
          <p className="text-zinc-800 text-xs text-center font-mono mt-4">
            Unauthorized access is prohibited and monitored.
          </p>

        </div>
      </div>
    </div>
  )
}