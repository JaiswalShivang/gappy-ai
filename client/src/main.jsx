import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './auth'
import LandingPage from './LandingPage.jsx'
import AuthPage from './AuthPage.jsx'
import Dashboard from './Dashboard.jsx'
import DashboardHome from './DashboardHome.jsx'
import MyMeetings from './MyMeetings.jsx'
import { LiveStreamPage, SettingsPage } from './DashboardPages.jsx'

// ── Guards ────────────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { isAuthed } = useAuth()
  return isAuthed ? children : <Navigate to="/sign-in" replace />
}

function PublicOnlyRoute({ children }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <Navigate to="/dashboard" replace /> : children
}

// ── Routes ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"        element={<LandingPage />} />
      <Route path="/sign-in" element={<PublicOnlyRoute><AuthPage mode="sign-in" /></PublicOnlyRoute>} />
      <Route path="/sign-up" element={<PublicOnlyRoute><AuthPage mode="sign-up" /></PublicOnlyRoute>} />

      {/* Legacy redirects */}
      <Route path="/app" element={<Navigate to="/dashboard/meetings" replace />} />

      {/* Protected dashboard shell with nested routes */}
      <Route
        path="/dashboard"
        element={<PrivateRoute><Dashboard /></PrivateRoute>}
      >
        <Route index           element={<DashboardHome />} />
        <Route path="meetings" element={<MyMeetings />} />
        <Route path="live"     element={<LiveStreamPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
