import { useState } from 'react'
import { Download } from 'lucide-react'
import ConfirmModal from './ConfirmModal.jsx'

/**
 * Botón "Exportar" reutilizable para Historial y Auditoría (Fase 8).
 * Pide contraseña con ConfirmModal antes de exportar y dispara la descarga
 * del archivo .xlsx que devuelve `onExportar`.
 *
 * Props:
 * - onExportar(password): función async que devuelve un Blob del xlsx
 * - nombreArchivo: nombre con el que se descarga el archivo
 * - etiqueta: texto del botón (por defecto "Exportar")
 */
function BotonExcel({ onExportar, nombreArchivo = 'Exportar.xlsx', etiqueta = 'Exportar' }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmar(password) {
    setExportando(true)
    setError('')
    try {
      const blob = await onExportar(password)
      const url = window.URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      window.URL.revokeObjectURL(url)
      setModalAbierto(false)
    } catch (err) {
      setError(err.message || 'No se pudo generar el archivo')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high active:brightness-95"
      >
        <Download className="h-4 w-4" strokeWidth={2.25} />
        {etiqueta}
      </button>

      <ConfirmModal
        abierto={modalAbierto}
        titulo="Exportar a Excel"
        mensaje="Ingresa tu contraseña para confirmar la exportación."
        requierePassword
        procesando={exportando}
        error={error}
        textoConfirmar="Exportar"
        onConfirmar={handleConfirmar}
        onCancelar={() => {
          setModalAbierto(false)
          setError('')
        }}
      />
    </>
  )
}

export default BotonExcel
