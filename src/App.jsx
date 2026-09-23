import { RouterProvider } from 'react-router-dom'
import { ThemeProvider }   from './context/ThemeContext'
import { AuthProvider }    from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import ErrorBoundary       from './components/ErrorBoundary'
import { router }          from './router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SessionProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </SessionProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

