import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Flame } from 'lucide-react'
import { register as registerUser, login, getMe } from '../../api/auth.js'
import { listOrganizations } from '../../api/organizations.js'
import { useAuthStore } from '../../store/authStore.js'
import Spinner from '../../components/ui/Spinner.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      await registerUser({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        password_confirm: data.password_confirm,
      })
      const tokens = await login(data.email, data.password)
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh)
      const [user, orgs] = await Promise.all([getMe(), listOrganizations()])
      const firstOrg = orgs?.results?.[0] ?? orgs?.[0] ?? null
      storeLogin(user, tokens.access, tokens.refresh, firstOrg)
      toast.success('Account created!')
      navigate('/')
    } catch (e) {
      const msg = e?.response?.data
      if (typeof msg === 'object') {
        const first = Object.values(msg)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error('Registration failed')
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-fire-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-fire-600 flex items-center justify-center mb-4 shadow-lg shadow-fire-600/30">
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">FireTrek</h1>
          <p className="text-sm text-zinc-500 mt-1">Create your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input className="input" placeholder="John" {...register('first_name', { required: true })} />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Doe" {...register('last_name', { required: true })} />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" {...register('email', { required: true })} />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  {...register('password', { required: true, minLength: { value: 8, message: 'Min 8 chars' } })}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-fire-400 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password_confirm', {
                  required: true,
                  validate: (v) => v === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.password_confirm && <p className="text-xs text-fire-400 mt-1">{errors.password_confirm.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={isSubmitting}>
              {isSubmitting && <Spinner size="sm" />}
              Create Account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-fire-400 hover:text-fire-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
