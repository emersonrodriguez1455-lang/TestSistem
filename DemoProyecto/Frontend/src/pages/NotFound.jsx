import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

// Se muestra cuando la URL no coincide con ninguna ruta conocida (Fase 4).
// En vez de dejar una pantalla en blanco (comportamiento anterior) o
// redirigir en silencio, se avisa explícitamente y se ofrece un botón para
// volver al inicio.
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background font-body-lg px-4">
      <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-on-primary shadow-sm">
          <SearchX className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Página no encontrada
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          La dirección a la que intentaste entrar no existe o ya no está disponible.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

export default NotFound
