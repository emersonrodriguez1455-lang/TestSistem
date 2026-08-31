import { useEffect, useMemo, useState } from 'react'
import { X, FileText, Eye, Pencil, Trash2, PackageOpen } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 px-4">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-lg border border-outline-variant max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">
            {soloLectura ? 'Detalle del Acta' : 'Editar Acta'}
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleGuardar} className="px-5 py-4 flex flex-col gap-stack-md">
          {CAMPOS_EDITABLES.map((campo) => (
            <div key={campo.key} className="flex flex-col gap-1.5">
              <label className="font-label-bold text-label-bold text-on-surface">{campo.label}</label>
              {campo.type === 'textarea' ? (
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3.5 py-2.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
                  rows={3}
                  value={datos[campo.key]}
                  disabled={soloLectura}
                  onChange={(e) => setDatos((d) => ({ ...d, [campo.key]: e.target.value }))}
                />
              ) : (
                <input
                  type={campo.type}
                  className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div
                  key={tipo}
                  className="flex flex-col items-center gap-1.5 border border-outline-variant rounded-lg p-2.5 bg-surface-container-low"
                >
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
                      className="rounded-md px-2 py-1 font-label-sm text-label-sm text-on-surface-variant underline-offset-2 transition-colors hover:text-error hover:underline"
                    >
                      Reiniciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!soloLectura && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant">
              <label className="font-label-bold text-label-bold text-on-surface">
                Tu contraseña (para confirmar el cambio)
              </label>
              <input
                type="password"
                className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface px-4 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Cerrar
            </button>
            {!soloLectura && (
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
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
    <div className="pt-4 md:pt-8 px-4 md:px-8 pb-8 w-full max-w-[1200px] mx-auto flex flex-col gap-stack-lg">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Historial de Actas</h2>
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
        <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Search Toolbar */}
      <Buscador
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por responsable, departamento, puesto, planta, marca, serie, nombre del equipo..."
      />

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider text-right">
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
                    className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 font-medium text-on-surface">
                        <PackageOpen className="h-4 w-4 text-on-surface-variant" strokeWidth={2} aria-hidden="true" />
                        {r.nombre_equipo || r.marca || 'Sin especificar'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-on-surface">
                      {r.responsable}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">
                      {r.fecha ? new Date(r.fecha).toLocaleDateString('es-GT') : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {/* Fase 5: antes solo aparecían con hover (group-hover),
                          invisibles en móvil por no haber mouse. Ahora quedan
                          siempre visibles en cualquier dispositivo. */}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDescargarPdf(r.id)}
                          disabled={descargandoId === r.id}
                          aria-label="Descargar PDF"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title="Descargar PDF"
                        >
                          <FileText className="h-4.5 w-4.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => abrirModal(r.id, 'ver')}
                          aria-label="Ver detalle"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title="Ver Detalle"
                        >
                          <Eye className="h-4.5 w-4.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => abrirModal(r.id, 'editar')}
                          aria-label="Editar"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title="Editar"
                        >
                          <Pencil className="h-4.5 w-4.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setModalEliminar(r.id)}
                          aria-label="Eliminar"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4.5 w-4.5" strokeWidth={2} />
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
