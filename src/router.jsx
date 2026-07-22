import { createBrowserRouter } from 'react-router-dom'
import OrgAuth         from './pages/org/OrgAuth'
import AdminDashboard  from './pages/org/AdminDashboard'
import SessionBuilder  from './pages/org/SessionBuilder'
import LivePage        from './pages/LivePage'
import Accreditation   from './pages/voter/Accreditation'
import VoterLogin      from './pages/voter/VoterLogin'
import VotingBooth     from './pages/voter/VotingBooth'
import { ProtectedRoute } from './components/ProtectedRoute'

export const router = createBrowserRouter([
  /* ── Org / Admin ─────────────────────────────────── */
  {
    path: '/',
    element: <OrgAuth />,
  },

  /* Protected admin routes */
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/admin/dashboard',              element: <AdminDashboard /> },
      { path: '/admin/sessions/new',           element: <SessionBuilder /> },
      { path: '/admin/sessions/:id/edit',      element: <SessionBuilder /> },
      { path: '/admin/sessions/:id/live',      element: <LivePage /> },
    ],
  },

  /* ── Voter ────────────────────────────────────────── */
  { path: '/join',                             element: <Accreditation /> },
  { path: '/vote/:sessionCode/login',          element: <VoterLogin /> },
  { path: '/vote/:sessionCode',                element: <VotingBooth /> },

  /* ── Public live page ─────────────────────────────── */
  { path: '/live/:sessionCode',                element: <LivePage /> },

  /* ── 404 ────────────────────────────────────────────── */
  {
    path: '*',
    element: (
      <div style={{
        minHeight:'100dvh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:16,
        fontFamily:'var(--font-sans)', background:'var(--bg-base)', color:'var(--text-primary)'
      }}>
        <span style={{fontSize:64}}>🗳️</span>
        <h1 style={{fontSize:28, fontWeight:700}}>Page Not Found</h1>
        <a href="/" style={{color:'var(--brand-400)'}}>← Go Home</a>
      </div>
    ),
  },
])
