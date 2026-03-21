import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!accessToken) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}