import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import FirearmsPage from './pages/firearms/FirearmsPage.jsx'
import FirearmDetailPage from './pages/firearms/FirearmDetailPage.jsx'
import DevicesPage from './pages/devices/DevicesPage.jsx'
import DeviceDetailPage from './pages/devices/DeviceDetailPage.jsx'
import LiveTrackingPage from './pages/tracking/LiveTrackingPage.jsx'
import GeofencingPage from './pages/geofencing/GeofencingPage.jsx'
import AlertsPage from './pages/alerts/AlertsPage.jsx'
import IncidentsPage from './pages/incidents/IncidentsPage.jsx'
import IncidentDetailPage from './pages/incidents/IncidentDetailPage.jsx'
import NotificationsPage from './pages/notifications/NotificationsPage.jsx'
import FirmwarePage from './pages/firmware/FirmwarePage.jsx'
import AuditPage from './pages/audit/AuditPage.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected app routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/firearms" element={<FirearmsPage />} />
          <Route path="/firearms/:id" element={<FirearmDetailPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/tracking" element={<LiveTrackingPage />} />
          <Route path="/geofencing" element={<GeofencingPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/firmware" element={<FirmwarePage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}