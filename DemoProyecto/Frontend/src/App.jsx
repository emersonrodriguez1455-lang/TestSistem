import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Devolucion from './pages/Devolucion.jsx'
import Historial from './pages/Historial.jsx'
import Auditoria from './pages/Auditoria.jsx'
import RequireAuth from './routes/RequireAuth.jsx'
import RequireAdmin from './routes/RequireAdmin.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Devolucion />} />
        <Route path="historial" element={<Historial />} />
        <Route
          path="auditoria"
          element={
            <RequireAdmin>
              <Auditoria />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
