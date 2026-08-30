import { useState } from 'react'
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
        className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-label-bold text-label-bold"
      >
        <span className="material-symbols-outlined text-[18px]">file_download</span>
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
