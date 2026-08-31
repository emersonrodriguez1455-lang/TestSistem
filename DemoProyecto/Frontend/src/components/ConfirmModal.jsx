import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Modal de confirmación reutilizable, acorde al estilo de ActaModal
 * (Historial.jsx). Reemplaza window.alert / window.prompt / window.confirm.
 *
 * Props:
 * - abierto: boolean
 * - titulo, mensaje: texto a mostrar
 * - requierePassword: si true, muestra un input de contraseña y lo exige
 *   antes de permitir confirmar
 * - procesando: boolean, deshabilita botones y muestra estado de carga
 * - error: string opcional con un mensaje de error a mostrar
 * - textoConfirmar, textoCancelar: labels de los botones
 * - variante: 'default' | 'peligro' (cambia el color del botón confirmar)
 * - onConfirmar(password): llamado al confirmar. Si requierePassword es true,
 *   recibe la contraseña ingresada.
 * - onCancelar(): llamado al cancelar o cerrar
 */
function ConfirmModal({
  abierto,
  titulo = 'Confirmar acción',
  mensaje = '',
  requierePassword = false,
  procesando = false,
  error = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'default',
  onConfirmar,
  onCancelar,
}) {
  const [password, setPassword] = useState('')
  const [errorLocal, setErrorLocal] = useState('')

  useEffect(() => {
    if (abierto) {
      setPassword('')
      setErrorLocal('')
    }
  }, [abierto])

  if (!abierto) return null

  function handleConfirmar(e) {
    e.preventDefault()
    if (requierePassword && !password) {
      setErrorLocal('Ingresa tu contraseña para continuar.')
      return
    }
    setErrorLocal('')
    onConfirmar(requierePassword ? password : undefined)
  }

  const errorAMostrar = error || errorLocal
  const colorConfirmar =
    variante === 'peligro'
      ? 'bg-error text-on-error shadow-sm hover:brightness-110 active:brightness-95'
      : 'bg-primary text-on-primary shadow-sm hover:brightness-110 active:brightness-95'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/40 px-4">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-lg border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">{titulo}</h3>
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleConfirmar} className="px-5 py-4 flex flex-col gap-stack-md">
          {mensaje && (
            <p className="font-body-md text-body-md text-on-surface">{mensaje}</p>
          )}

          {requierePassword && (
            <div className="flex flex-col gap-1.5">
              <label className="font-label-bold text-label-bold text-on-surface">
                Tu contraseña
              </label>
              <input
                type="password"
                autoFocus
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                value={password}
                disabled={procesando}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {errorAMostrar && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
              {errorAMostrar}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              disabled={procesando}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface px-4 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
            >
              {textoCancelar}
            </button>
            <button
              type="submit"
              disabled={procesando}
              className={`inline-flex h-10 items-center justify-center rounded-lg px-4 font-label-bold text-label-bold transition-all disabled:opacity-60 ${colorConfirmar}`}
            >
              {procesando ? 'Procesando...' : textoConfirmar}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConfirmModal
