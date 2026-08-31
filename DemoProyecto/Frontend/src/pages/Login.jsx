import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background font-body-lg px-4">
      {/* Fondo de marca sutil — una cuadrícula "ink" discreta, sin gradientes ni manchas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e2e4ea 1px, transparent 1px), linear-gradient(to bottom, #e2e4ea 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 50% 42%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 50% 42%, black 40%, transparent 100%)',
        }}
      />

      <div className="relative w-full max-w-[26rem]">
        {/* Marca: ahora fuera de la tarjeta, como cabecera de toda la pantalla */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo-legumex.png"
            alt="Agroindustria Legumex"
            className="w-56 sm:w-64 h-auto drop-shadow-sm"
          />
          <div className="mt-3 flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span>Control Operativo</span>
            <span className="h-1 w-1 rounded-full bg-outline" aria-hidden="true" />
            <span>Administración Industrial</span>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          {/* Filete de acento en la parte superior de la tarjeta */}
          <div className="mx-auto mb-7 h-1 w-12 rounded-full bg-primary" aria-hidden="true" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
          <div className="flex flex-col gap-2">
            <label className="font-label-bold text-label-bold text-on-surface">Usuario</label>
            <input
              className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-bold text-label-bold text-on-surface">Contraseña</label>
            <input
              type="password"
              className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />}
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
        </div>

        <p className="mt-6 text-center font-label-sm text-label-sm text-on-surface-variant">
          Acceso restringido a personal autorizado de LEGUMEX.
        </p>
      </div>
    </div>
  )
}

export default Login
