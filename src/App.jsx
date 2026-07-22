import { RouterProvider } from 'react-router-dom'
import { AuthProvider }    from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { router }          from './router'

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </AuthProvider>
  )
}
