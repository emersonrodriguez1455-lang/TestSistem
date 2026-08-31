import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  listarActas,
  obtenerActa,
  editarActa,
  eliminarActa,
  descargarPdfActa,
  reiniciarFirma,
  exportarActasExcel,
} from '../services/api.js'
import Buscador from '../components/Buscador.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import BotonExcel from '../components/BotonExcel.jsx'

// Campos del acta sobre los que se compara el texto ingresado en el buscador.
// Incluye los datos visibles/relevantes del historial (responsable, departamento,
// puesto, planta, marca, serie, nombre del equipo) y otros campos capturados
// en el acta que también son útiles para localizarla.
const CAMPOS_BUSCABLES = [
  'responsable',
  'departamento',
  'puesto',
  'planta',
  'modalidad',
  'tipo_equipo',
  'marca',
  'modelo',
  'serie',
  'nombre_equipo',
  'procesador',
  'memoria_ram',
  'disco_duro',
  'estado_equipo',
  'observaciones',
]

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function actaCoincide(acta, terminoNormalizado) {
  const coincideCampo = CAMPOS_BUSCABLES.some((campo) =>
    normalizar(acta[campo]).includes(terminoNormalizado)
  )
  if (coincideCampo) return true

  if (acta.fecha) {
    const fechaFormateada = new Date(acta.fecha).toLocaleDateString('es-GT')
    if (normalizar(fechaFormateada).includes(terminoNormalizado)) return true
  }

  return false
}

const CAMPOS_EDITABLES = [
  { key: 'fecha', label: 'Fecha', type: 'date' },
  { key: 'responsable', label: 'Responsable', type: 'text' },
  { key: 'departamento', label: 'Departamento', type: 'text' },
  { key: 'planta', label: 'Planta', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'serie', label: 'No. de Serie', type: 'text' },
  { key: 'nombre_equipo', label: 'Nombre del Equipo', type: 'text' },
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
]

function ActaModal({ acta, modo, onClose, onGuardado }) {
  const { token } = useAuth()
  const [datos, setDatos] = useState(() => {
    const base = {}
    CAMPOS_EDITABLES.forEach((c) => {
      base[c.key] = acta[c.key]
        ? c.type === 'date'
          ? String(acta[c.key]).slice(0, 10)
          : acta[c.key]
        : ''
    })
    return base
  })
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [firmaEntregaUrl, setFirmaEntregaUrl] = useState(acta.firma_entrega_url || null)
  const [firmaRecibeUrl, setFirmaRecibeUrl] = useState(acta.firma_recibe_url || null)
  const [modalReiniciarFirma, setModalReiniciarFirma] = useState(null) // 'entrega' | 'recibe' | null
  const [reiniciandoFirma, setReiniciandoFirma] = useState(false)
  const [errorReiniciarFirma, setErrorReiniciarFirma] = useState('')

  const soloLectura = modo === 'ver'

  async function handleReiniciarFirma(passwordReinicio) {
    const tipo = modalReiniciarFirma
    setReiniciandoFirma(true)
    setErrorReiniciarFirma('')
    try {
      await reiniciarFirma(token, acta.id, tipo, passwordReinicio)
      if (tipo === 'entrega') setFirmaEntregaUrl(null)
      else setFirmaRecibeUrl(null)
      setModalReiniciarFirma(null)
      onGuardado()
    } catch (err) {
      setErrorReiniciarFirma(err.message || 'No se pudo reiniciar la firma')
    } finally {
      setReiniciandoFirma(false)
    }
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!password) {
      setError('Ingresa tu contraseña para confirmar los cambios.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      // Fase F: se manda la versión que tenía el acta cuando se abrió este
      // modal -- si alguien más la editó mientras tanto, el backend
      // responde 409 en vez de sobrescribir en silencio.
      await editarActa(token, acta.id, { ...datos, password, version: acta.version })
      onGuardado()
      onClose()
    } catch (err) {
      if (err.status === 409) {
        setError(
          'Este acta fue modificada por otra persona mientras la editabas. Cierra este formulario y ábrelo de nuevo para ver los cambios más recientes.'
        )
      } else {
        setError(err.message || 'No se pudo guardar el acta')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-lg shadow-lg border border-outline-variant max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="font-headline-lg text-headline-lg text-primary">
            {soloLectura ? 'Detalle del Acta' : 'Editar Acta'}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleGuardar} className="px-5 py-4 flex flex-col gap-stack-md">
          {CAMPOS_EDITABLES.map((campo) => (
            <div key={campo.key} className="flex flex-col gap-1">
              <label className="font-label-bold text-label-bold text-on-surface">{campo.label}</label>
              {campo.type === 'textarea' ? (
                <textarea
                  className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface disabled:opacity-60"
                  rows={3}
                  value={datos[campo.key]}
                  disabled={soloLectura}
                  onChange={(e) => setDatos((d) => ({ ...d, [campo.key]: e.target.value }))}
                />
              ) : (
                <input
                  type={campo.type}
                  className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface disabled:opacity-60"
                  value={datos[campo.key]}
                  disabled={soloLectura}
                  onChange={(e) => setDatos((d) => ({ ...d, [campo.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant">
            <p className="font-label-bold text-label-bold text-on-surface">Firmas</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { tipo: 'entrega', label: 'Quien Entrega', url: firmaEntregaUrl },
                { tipo: 'recibe', label: 'Quien Recibe', url: firmaRecibeUrl },
              ].map(({ tipo, label, url }) => (
                <div key={tipo} className="flex flex-col items-center gap-1 border border-outline-variant rounded p-2">
                  {url ? (
                    <img src={url} alt={`Firma ${label}`} className="h-16 object-contain" />
                  ) : (
                    <p className="font-label-sm text-label-sm text-on-surface-variant py-4">Sin firma</p>
                  )}
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
                  {url && (
                    <button
                      type="button"
                      onClick={() => setModalReiniciarFirma(tipo)}
                      className="text-error font-label-sm text-label-sm underline"
                    >
                      Reiniciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!soloLectura && (
            <div className="flex flex-col gap-1 pt-2 border-t border-outline-variant">
              <label className="font-label-bold text-label-bold text-on-surface">
                Tu contraseña (para confirmar el cambio)
              </label>
              <input
                type="password"
                className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-outline text-on-surface-variant rounded font-label-bold text-label-bold hover:bg-surface-container-low"
            >
              Cerrar
            </button>
            {!soloLectura && (
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-bold text-label-bold hover:opacity-90 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </form>
      </div>

      <ConfirmModal
        abierto={modalReiniciarFirma !== null}
        titulo="Reiniciar firma"
        mensaje={`Ingresa tu contraseña para reiniciar la firma de ${
          modalReiniciarFirma === 'entrega' ? 'quien entrega' : 'quien recibe'
        }.`}
        requierePassword
        procesando={reiniciandoFirma}
        error={errorReiniciarFirma}
        variante="peligro"
        textoConfirmar="Reiniciar firma"
        onConfirmar={handleReiniciarFirma}
        onCancelar={() => {
          setModalReiniciarFirma(null)
          setErrorReiniciarFirma('')
        }}
      />
    </div>
  )
}

function Historial() {
  const { token } = useAuth()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // { acta, modo: 'ver' | 'editar' }
  const [descargandoId, setDescargandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalEliminar, setModalEliminar] = useState(null) // id del acta a eliminar | null
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const registrosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    if (!termino) return registros
    return registros.filter((r) => actaCoincide(r, termino))
  }, [registros, busqueda])

  function cargar() {
    setLoading(true)
    listarActas(token)
      .then((res) => setRegistros(res.data || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el historial'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function abrirModal(id, modo) {
    setError('')
    try {
      const acta = await obtenerActa(token, id)
      setModal({ acta, modo })
    } catch (err) {
      setError(err.message || 'No se pudo cargar el acta')
    }
  }

  async function handleEliminar(password) {
    setEliminando(true)
    setErrorEliminar('')
    try {
      await eliminarActa(token, modalEliminar, password)
      setModalEliminar(null)
      cargar()
    } catch (err) {
      setErrorEliminar(err.message || 'No se pudo eliminar el acta')
    } finally {
      setEliminando(false)
    }
  }

  async function handleDescargarPdf(id) {
    setDescargandoId(id)
    setError('')
    try {
      const blob = await descargarPdfActa(token, id)
      const url = URL.createObjectURL(blob)
      // Fase 2.1: antes se hacía window.open(url) -- eso abre el visor del
      // navegador (pestaña), no dispara una descarga real. Se usa un <a>
      // temporal con "download" para forzar la descarga del archivo.
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `acta-devolucion-${id}.pdf`
      document.body.appendChild(enlace)
      enlace.click()
      document.body.removeChild(enlace)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError(err.message || 'No se pudo generar el PDF')
    } finally {
      setDescargandoId(null)
    }
  }

  return (
    <div className="pt-4 md:pt-8 px-4 md:px-8 pb-8 w-full max-w-[1200px] mx-auto">
      {/* Header Section */}
      <div className="mb-stack-lg flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Historial de Actas</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Equipos y accesorios devueltos, por responsable y fecha.
          </p>
        </div>
        <BotonExcel
          onExportar={(password) => exportarActasExcel(token, password)}
          nombreArchivo="Historial_Actas.xlsx"
        />
      </div>

      {error && (
        <p className="mb-stack-md text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Search Toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-stack-md mb-stack-lg shadow-sm">
        <Buscador
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por responsable, departamento, puesto, planta, marca, serie, nombre del equipo..."
        />
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest border-t-4 border-t-primary border-l border-r border-b border-outline-variant rounded-b-DEFAULT shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-header-fill border-b border-outline-variant">
                <th className="py-3 px-4 font-label-bold text-label-bold text-on-surface uppercase tracking-wider border-r border-outline-variant">
                  Producto
                </th>
                <th className="py-3 px-4 font-label-bold text-label-bold text-on-surface uppercase tracking-wider border-r border-outline-variant">
                  Nombre
                </th>
                <th className="py-3 px-4 font-label-bold text-label-bold text-on-surface uppercase tracking-wider border-r border-outline-variant">
                  Fecha
                </th>
                <th className="py-3 px-4 font-label-bold text-label-bold text-on-surface uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {loading && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-on-surface-variant">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && registros.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-on-surface-variant">
                    Aún no hay actas registradas.
                  </td>
                </tr>
              )}
              {!loading && registros.length > 0 && registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-on-surface-variant">
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
              {!loading &&
                registrosFiltrados.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-outline-variant hover:bg-surface-blue transition-colors group"
                  >
                    <td className="py-4 px-4 border-r border-outline-variant">
                      <div className="flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-secondary">
                          assignment_return
                        </span>
                        <span>{r.nombre_equipo || r.marca || 'Sin especificar'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 border-r border-outline-variant font-bold text-on-surface">
                      {r.responsable}
                    </td>
                    <td className="py-4 px-4 border-r border-outline-variant text-on-surface-variant whitespace-nowrap">
                      {r.fecha ? new Date(r.fecha).toLocaleDateString('es-GT') : '-'}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      {/* Fase 5: antes solo aparecían con hover (group-hover),
                          invisibles en móvil por no haber mouse. Ahora quedan
                          siempre visibles en cualquier dispositivo. */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDescargarPdf(r.id)}
                          disabled={descargandoId === r.id}
                          className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
                          title="Descargar PDF"
                        >
                          <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        </button>
                        <button
                          onClick={() => abrirModal(r.id, 'ver')}
                          className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                          title="Ver Detalle"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button
                          onClick={() => abrirModal(r.id, 'editar')}
                          className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => setModalEliminar(r.id)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ActaModal
          acta={modal.acta}
          modo={modal.modo}
          onClose={() => setModal(null)}
          onGuardado={cargar}
        />
      )}

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar acta"
        mensaje="Ingresa tu contraseña para confirmar. Esta acción no se puede deshacer."
        requierePassword
        procesando={eliminando}
        error={errorEliminar}
        variante="peligro"
        textoConfirmar="Eliminar"
        onConfirmar={handleEliminar}
        onCancelar={() => {
          setModalEliminar(null)
          setErrorEliminar('')
        }}
      />
    </div>
  )
}

export default Historial
