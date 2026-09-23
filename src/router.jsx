/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'

const LandingPage    = lazy(() => import('./pages/LandingPage'))
const OrgAuth        = lazy(() => import('./pages/org/OrgAuth'))
const AdminDashboard = lazy(() => import('./pages/org/AdminDashboard'))
const SessionBuilder = lazy(() => import('./pages/org/SessionBuilder'))
const LivePage       = lazy(() => import('./pages/LivePage'))
const ResultsPage    = lazy(() => import('./pages/ResultsPage'))
const Accreditation  = lazy(() => import('./pages/voter/Accreditation'))
const VoterLogin     = lazy(() => import('./pages/voter/VoterLogin'))
const VotingBooth    = lazy(() => import('./pages/voter/VotingBooth'))
const VerifyReceipt  = lazy(() => import('./pages/VerifyReceipt'))

function RouteFallback() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg-base)',
    }}>
      <div className="spinner spinner-lg" style={{ borderWidth: 3 }} />
      <p className="text-secondary text-sm font-mono">Loading civic record…</p>
    </div>
  )
}

function route(element) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  /* ── Public Landing / Info Page ──────────────────────── */
  {
    path: '/',
    element: route(<LandingPage />),
  },

  /* ── Org / Admin Auth ────────────────────────────────── */
  {
    path: '/admin',
    element: route(<OrgAuth />),
  },

  /* Protected admin routes */
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/admin/dashboard',              element: route(<AdminDashboard />) },
      { path: '/admin/sessions/new',           element: route(<SessionBuilder />) },
      { path: '/admin/sessions/:id/edit',      element: route(<SessionBuilder />) },
      { path: '/admin/sessions/:id/live',      element: route(<LivePage />) },
    ],
  },

  /* ── Voter ────────────────────────────────────────────── */
  { path: '/join',                             element: route(<Accreditation />) },
  { path: '/vote/:sessionCode/login',          element: route(<VoterLogin />) },
  { path: '/vote/:sessionCode',                element: route(<VotingBooth />) },

  /* ── Public live page (no auth required) ─────────────── */
  { path: '/live/:sessionCode',                element: route(<LivePage />) },

  /* ── Certified Results (public, for ended sessions) ──── */
  { path: '/results/:sessionCode',             element: route(<ResultsPage />) },

  /* ── Receipt Verification (public) ───────────────────── */
  { path: '/verify/:receiptId',                element: route(<VerifyReceipt />) },

  /* ── 404 ───────────────────────────────────────────────── */
  {
    path: '*',
    element: (
      <div style={{
        minHeight:'100dvh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:16,
        fontFamily:'var(--font-sans)', background:'var(--bg-base)', color:'var(--text-primary)'
      }}>
        <div style={{
          width:64, height:64, borderRadius:12, background:'var(--brand-500)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontFamily:'var(--font-serif)', fontSize:32, fontWeight:700,
        }}>Q</div>
        <h1 style={{fontSize:28, fontWeight:700}}>Page Not Found</h1>
        <a href="/" style={{color:'var(--brand-400)'}}>← Go Home</a>
      </div>
    ),
  },
])
