import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background font-body-lg px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="h-[3px] w-full bg-primary" />

        <div className="p-stack-lg flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 bg-primary-container rounded flex items-center justify-center text-on-primary mb-2">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              factory
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">LEGUMEX</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Control Operativo · Administración Industrial
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-stack-lg pb-stack-lg flex flex-col gap-stack-md">
          <div className="flex flex-col gap-1">
            <label className="font-label-bold text-label-bold text-on-surface">Usuario</label>
            <input
              className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-bold text-label-bold text-on-surface">Contraseña</label>
            <input
              type="password"
              className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary py-2.5 rounded font-label-bold text-label-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>

         {/*  <p className="text-center font-label-sm text-label-sm text-on-surface-variant border-t border-outline-variant pt-3">
            Demo: <span className="font-mono">admin / admin123</span> (Administrador) ·{' '}
            <span className="font-mono">usuario / usuario123</span> (Usuario)
          </p> */}
        </form>
      </div>
    </div>
  )
}

export default Login
