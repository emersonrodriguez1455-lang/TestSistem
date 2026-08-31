import { useEffect, useState } from 'react'
import { PlusCircle, PencilLine, Trash2, Info, ChevronUp, Eye, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { obtenerAuditoria, exportarAuditoriaExcel } from '../services/api.js'
import BotonExcel from '../components/BotonExcel.jsx'

/*
 * Monocromático total: los 3 estados (CREADO, EDITADO, ELIMINADO) son
 * variantes de gris/negro, sin color, ni siquiera en ELIMINADO (el rojo
 * queda reservado solo para la acción interactiva de eliminar, no para
 * esta etiqueta de solo lectura).
 */
const ACCION_INFO = {
  CREAR: { label: 'Creado', icon: PlusCircle, classes: 'bg-surface-container-high text-on-surface' },
  EDITAR: { label: 'Editado', icon: PencilLine, classes: 'border border-outline bg-surface text-on-surface' },
  ELIMINAR: { label: 'Eliminado', icon: Trash2, classes: 'bg-on-surface text-surface' },
}

const NOMBRES_CAMPO = {
  fecha: 'Fecha',
  responsable: 'Responsable',
  departamento: 'Departamento',
  puesto: 'Puesto',
  planta: 'Planta',
  modalidad: 'Modalidad',
  tipo_equipo: 'Tipo de equipo',
  marca: 'Marca',
  modelo: 'Modelo',
  serie: 'No. de serie',
  nombre_equipo: 'Nombre del equipo',
  procesador: 'Procesador',
  memoria_ram: 'Memoria RAM',
  disco_duro: 'Disco duro',
  observaciones: 'Observaciones',
  estado_equipo: 'Estado del equipo',
  borrador: 'Borrador',
}

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === '') return 'vacío'
  return String(valor)
}

function iniciales(nombre) {
  if (!nombre) return '—'
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function Auditoria() {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandidoId, setExpandidoId] = useState(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    obtenerAuditoria(token)
      .then((res) => {
        if (activo) setLogs(res || [])
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo cargar la auditoría')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [token])

  return (
    <>
      {/* Scrollable Content Canvas */}
      <div className="flex-1 p-container-padding md:p-stack-lg bg-background">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-stack-lg">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">Registro de Auditoría</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Monitoreo de actividades del sistema operativo.
              </p>
            </div>
            <BotonExcel
              onExportar={(password) => exportarAuditoriaExcel(token, password)}
              nombreArchivo="Auditoria.xlsx"
            />
          </div>

          {/* Data Table Section */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Usuario
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Acción
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Acta Afectada
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider text-right">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-on-surface divide-y divide-outline-variant">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-on-surface-variant">
                        Cargando...
                      </td>
                    </tr>
                  )}
                  {!loading && error && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-error">
                        {error}
                      </td>
                    </tr>
                  )}
                  {!loading && !error && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-on-surface-variant">
                        Aún no hay registros de auditoría.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    logs.map((log) => {
                      const info = ACCION_INFO[log.accion] || {
                        label: log.accion,
                        icon: Info,
                        classes: 'bg-surface-container-high text-on-surface',
                      }
                      const AccionIcon = info.icon
                      return (
                        <>
                          <tr
                            key={log.id}
                            className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors group"
                          >
                            <td className="px-5 py-4 whitespace-nowrap align-top">
                              <div className="font-semibold text-on-surface">
                                {log.fecha ? new Date(log.fecha).toLocaleDateString('es-GT') : '-'}
                              </div>
                              <div className="font-label-sm text-label-sm text-on-surface-variant">
                                {log.fecha ? new Date(log.fecha).toLocaleTimeString('es-GT') : ''}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-2">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary-container font-label-bold text-[10px] text-on-secondary-container">
                                  {iniciales(log.usuario)}
                                </span>
                                <span className="font-medium text-on-surface">{log.usuario || 'Usuario eliminado'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-sm text-label-sm uppercase tracking-wide ${info.classes}`}
                              >
                                <AccionIcon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                                {info.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-on-surface">
                              {log.acta_responsable || log.nombre_equipo
                                ? `${log.acta_responsable || ''} ${log.nombre_equipo ? `(${log.nombre_equipo})` : ''}`.trim()
                                : 'Acta eliminada'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => setExpandidoId((id) => (id === log.id ? null : log.id))}
                                disabled={!log.detalle || Object.keys(log.detalle).length === 0}
                                className="grid h-9 w-9 ml-auto place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
                                title={log.detalle ? 'Ver cambios' : 'Sin detalle'}
                              >
                                {expandidoId === log.id ? (
                                  <ChevronUp className="h-4.5 w-4.5" strokeWidth={2} />
                                ) : (
                                  <Eye className="h-4.5 w-4.5" strokeWidth={2} />
                                )}
                              </button>
                            </td>
                          </tr>
                          {expandidoId === log.id && log.detalle && (
                            <tr className="bg-surface-container-low border-b border-outline-variant last:border-0">
                              <td colSpan={5} className="px-5 py-4">
                                <div className="flex flex-col gap-2">
                                  {Object.entries(log.detalle).map(([campo, cambio]) => (
                                    <div key={campo} className="flex flex-wrap items-center gap-2 text-sm">
                                      <span className="font-label-bold text-label-bold text-on-surface min-w-[140px]">
                                        {NOMBRES_CAMPO[campo] || campo}:
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container line-through">
                                        {formatearValor(cambio.antes)}
                                      </span>
                                      <ArrowRight className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
                                      <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container">
                                        {formatearValor(cambio.despues)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Auditoria
