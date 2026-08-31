import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { obtenerAuditoria, exportarAuditoriaExcel } from '../services/api.js'
import BotonExcel from '../components/BotonExcel.jsx'

const ACCION_INFO = {
  CREAR: { label: 'Creado', icon: 'add_circle', classes: 'bg-surface-container-highest border-primary text-primary' },
  EDITAR: { label: 'Editado', icon: 'edit_document', classes: 'bg-surface-container-low border-secondary text-secondary' },
  ELIMINAR: { label: 'Eliminado', icon: 'delete', classes: 'bg-error-container border-error text-error' },
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
      {/* Top App Bar for Desktop */}
      <div className="hidden md:flex justify-between items-center px-container-padding py-stack-md bg-surface border-b border-outline-variant">
        <div className="font-headline-lg text-headline-lg font-bold text-primary">Registro de Auditoría</div>
        <div className="flex items-center gap-stack-md">
          <BotonExcel
            onExportar={(password) => exportarAuditoriaExcel(token, password)}
            nombreArchivo="Auditoria.xlsx"
          />
        </div>
      </div>

      {/* Scrollable Content Canvas */}
      <div className="flex-1 p-container-padding md:p-stack-lg bg-surface-bright">
        <div className="max-w-[896px] mx-auto flex flex-col gap-stack-lg">
          {/* Mobile Header Title */}
          <div className="md:hidden">
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Registro de Auditoría</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Monitoreo de actividades del sistema operativo.
            </p>
          </div>

          {/* Data Table Section */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-header-fill border-b border-outline-variant">
                    <th className="p-3 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="p-3 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Usuario
                    </th>
                    <th className="p-3 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Acción
                    </th>
                    <th className="p-3 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Acta Afectada
                    </th>
                    <th className="p-3 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider text-right">
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
                        icon: 'info',
                        classes: 'bg-surface-container-highest border-outline text-on-surface',
                      }
                      return (
                        <>
                          <tr key={log.id} className="hover:bg-surface-blue transition-colors group">
                            <td className="p-3 whitespace-nowrap font-label-sm text-on-surface-subtle">
                              <div className="font-body-md text-on-surface">
                                {log.fecha ? new Date(log.fecha).toLocaleDateString('es-GT') : '-'}
                              </div>
                              <div>{log.fecha ? new Date(log.fecha).toLocaleTimeString('es-GT') : ''}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center font-label-bold text-[10px] bg-secondary-container text-on-secondary-container">
                                  {iniciales(log.usuario)}
                                </div>
                                <span className="font-medium">{log.usuario || 'Usuario eliminado'}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 border font-label-sm rounded uppercase ${info.classes}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
                                {info.label}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-primary">
                              {log.acta_responsable || log.nombre_equipo
                                ? `${log.acta_responsable || ''} ${log.nombre_equipo ? `(${log.nombre_equipo})` : ''}`.trim()
                                : 'Acta eliminada'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setExpandidoId((id) => (id === log.id ? null : log.id))}
                                disabled={!log.detalle || Object.keys(log.detalle).length === 0}
                                className="text-on-surface-variant hover:text-secondary group-hover:opacity-100 opacity-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                title={log.detalle ? 'Ver cambios' : 'Sin detalle'}
                              >
                                <span className="material-symbols-outlined">
                                  {expandidoId === log.id ? 'expand_less' : 'visibility'}
                                </span>
                              </button>
                            </td>
                          </tr>
                          {expandidoId === log.id && log.detalle && (
                            <tr className="bg-surface-container-low">
                              <td colSpan={5} className="p-4">
                                <div className="flex flex-col gap-2">
                                  {Object.entries(log.detalle).map(([campo, cambio]) => (
                                    <div key={campo} className="flex flex-wrap items-center gap-2 text-sm">
                                      <span className="font-label-bold text-label-bold text-on-surface min-w-[140px]">
                                        {NOMBRES_CAMPO[campo] || campo}:
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container line-through">
                                        {formatearValor(cambio.antes)}
                                      </span>
                                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                        arrow_forward
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container">
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
