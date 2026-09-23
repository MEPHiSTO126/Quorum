import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { token, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="protected-loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-base)',
      }}>
        <div className="civic-loading" style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px', borderWidth: 3 }} />
          <p className="text-secondary text-sm font-mono">Verifying credentials…</p>
        </div>
      </div>
    )
  }

  return token ? <Outlet /> : <Navigate to="/admin" replace />
}