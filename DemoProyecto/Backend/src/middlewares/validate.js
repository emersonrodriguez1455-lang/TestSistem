import { Link } from 'react-router-dom'

// Se muestra cuando la URL no coincide con ninguna ruta conocida (Fase 4).
// En vez de dejar una pantalla en blanco (comportamiento anterior) o
// redirigir en silencio, se avisa explícitamente y se ofrece un botón para
// volver al inicio.
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background font-body-lg px-4">
      <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-3xl">search_off</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary">
          Página no encontrada
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          La dirección a la que intentaste entrar no existe o ya no está disponible.
        </p>
        <Link
          to="/"
          className="mt-2 px-6 py-2.5 bg-primary-container text-on-primary rounded font-label-bold text-label-bold hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

export default NotFound
