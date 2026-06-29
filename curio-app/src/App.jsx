import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './shared/AuthContext'
import AppLayout from './app/AppLayout'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Browse from './screens/Browse'
import Search from './screens/Search'
import Library from './screens/Library'
import Taste from './screens/Taste'
import Detail from './screens/Detail'

function RequireAuth({ children }) {
  const { isAuthed } = useAuth()
  if (!isAuthed) return <Navigate to="/login" replace />
  return children
}

function RequireOnboard({ children }) {
  const { onboarded } = useAuth()
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <RequireOnboard>
              <AppLayout />
            </RequireOnboard>
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/browse/:domain" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/taste" element={<Taste />} />
        <Route path="/item/:id" element={<Detail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
