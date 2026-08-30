import { useState } from 'react'
import InlineEditableText from '../components/InlineEditableText.jsx'
import FirmaPad from '../components/FirmaPad.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import useLocalStorageState from '../hooks/useLocalStorageState.js'
import { useAuth } from '../context/AuthContext.jsx'
import { crearActa } from '../services/api.js'

const ACCESORIOS = [
  'Monitor',
  'Mouse',
  'UPS',
  'Laptop',
  'Cargador',
  'Teclado',
  'Impresora',
  'Disco Externo',
  'Otro',
  'Celular',
]

let contadorFilas = 0
function generarIdFila() {
  contadorFilas += 1
  return `fila-${Date.now()}-${contadorFilas}`
}

function Devolucion() {
  const { token } = useAuth()
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [errorGuardado, setErrorGuardado] = useState('')
  const [estadoActa, setEstadoActa] = useState('borrador') // borrador | finalizado
  const [errores, setErrores] = useState({})
  const [firmaEntrega, setFirmaEntrega] = useState(null) // base64 o null
  const [firmaRecibe, setFirmaRecibe] = useState(null)

  // Datos del Usuario (necesarios para validar al Finalizar)
  const [fecha, setFecha] = useState('2024-10-24')
  const [responsable, setResponsable] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [puesto, setPuesto] = useState('')
  // DPI: solo se usa dentro de la frase de constancia cuando el acta es de
  // "1 página" (ver formato físico) -- ya no es un input aparte en "Datos
  // del Usuario".
  const [dpi, setDpi] = useState('(clic para escribir su DPI)')
  const [planta, setPlanta] = useState('Tejar')

  const [modalidadPaginas, setModalidadPaginas] = useState('dos') // 'una' | 'dos'
  const [tipoEquipo, setTipoEquipo] = useState('Laptop')
  const [estadoEquipo, setEstadoEquipo] = useState('Nuevo')
  const [marcaEquipo, setMarcaEquipo] = useState('Original')
  const [marcaEquipoDetalle, setMarcaEquipoDetalle] = useState('')
  const [modeloEquipo, setModeloEquipo] = useState('')
  const [noSerie, setNoSerie] = useState('')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [procesador, setProcesador] = useState('')
  const [memoriaRam, setMemoriaRam] = useState('16')
  const [discoTipo, setDiscoTipo] = useState('ssd')
  const [discoCapacidad, setDiscoCapacidad] = useState('')

  // Constancia: campos inline (Paso 2)
  const [diaEntrega, setDiaEntrega] = useState('__')
  const [mesEntrega, setMesEntrega] = useState('__')
  const [anioEntrega, setAnioEntrega] = useState('____')
  const [nombreEntrega, setNombreEntrega] = useState('(clic para escribir su nombre)')

  // Accesorios: checkboxes + tabla sincronizada (Paso 3)
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState([])
  const [filasAccesorios, setFilasAccesorios] = useState([])
  const [modalQuitarAccesorio, setModalQuitarAccesorio] = useState(null) // { label, filaId } | null

  // Modal de confirmación para descartar el formulario (botón "Cancelar")
  const [modalCancelar, setModalCancelar] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const [fechaEmision, setFechaEmision] = useLocalStorageState(
    'legumex_fecha_emision',
    'Enero 2025'
  )
  const [fechaVigencia, setFechaVigencia] = useLocalStorageState(
    'legumex_fecha_vigencia',
    'Enero 2026'
  )

  function toggleAccesorio(label) {
    const yaSeleccionado = accesoriosSeleccionados.includes(label)

    if (yaSeleccionado) {
      setAccesoriosSeleccionados((prev) => prev.filter((a) => a !== label))
      const fila = filasAccesorios.find((f) => f.accesorioId === label)
      if (fila) {
        const tieneDatos = fila.marca || fila.modelo || fila.serie
        if (tieneDatos) {
          // Se pide confirmación antes de borrar los datos ya capturados en
          // la fila (en vez de window.confirm nativo).
          setModalQuitarAccesorio({ label, filaId: fila.id })
          return
        }
        setFilasAccesorios((prev) => prev.filter((f) => f.id !== fila.id))
      }
    } else {
      setAccesoriosSeleccionados((prev) => [...prev, label])
      const yaExisteFila = filasAccesorios.some((f) => f.accesorioId === label)
      if (!yaExisteFila) {
        setFilasAccesorios((prev) => [
          ...prev,
          {
            id: generarIdFila(),
            articulo: label === 'Otro' ? '' : label,
            marca: '',
            modelo: '',
            serie: '',
            estado: 'Usado',
            origen: 'checkbox',
            accesorioId: label,
          },
        ])
      }
    }
  }

  function handleConfirmarQuitarAccesorio() {
    if (!modalQuitarAccesorio) return
    setFilasAccesorios((prev) => prev.filter((f) => f.id !== modalQuitarAccesorio.filaId))
    setModalQuitarAccesorio(null)
  }

  function handleCancelarQuitarAccesorio() {
    if (!modalQuitarAccesorio) return
    // Se conserva la fila con sus datos, pero deja de estar vinculada al checkbox
    setFilasAccesorios((prev) =>
      prev.map((f) =>
        f.id === modalQuitarAccesorio.filaId ? { ...f, accesorioId: null, origen: 'manual' } : f
      )
    )
    setModalQuitarAccesorio(null)
  }

  function agregarFilaManual() {
    setFilasAccesorios((prev) => [
      ...prev,
      {
        id: generarIdFila(),
        articulo: '',
        marca: '',
        modelo: '',
        serie: '',
        estado: 'Usado',
        origen: 'manual',
        accesorioId: null,
      },
    ])
  }

  function actualizarFilaAccesorio(id, campo, valor) {
    setFilasAccesorios((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  }

  function eliminarFilaAccesorio(id) {
    const fila = filasAccesorios.find((f) => f.id === id)
    setFilasAccesorios((prev) => prev.filter((f) => f.id !== id))
    if (fila?.accesorioId) {
      setAccesoriosSeleccionados((prev) => prev.filter((a) => a !== fila.accesorioId))
    }
  }

  // Vacía toda la tabla de un solo clic (sin modal de confirmación, según lo
  // acordado). Limpia tanto las filas como los checkboxes de verificación
  // rápida, para que ambos queden sincronizados.
  function vaciarTablaAccesorios() {
    setFilasAccesorios([])
    setAccesoriosSeleccionados([])
  }

  async function handleFinalizarDevolucion() {
    // Bloqueo de doble submit a nivel de función (además del botón
    // deshabilitado): si ya hay un guardado en curso, se ignora el clic.
    if (saveStatus === 'saving') return

    const nuevosErrores = {}
    if (!fecha) nuevosErrores.fecha = true
    if (!responsable.trim()) nuevosErrores.responsable = true
    if (!departamento) nuevosErrores.departamento = true
    if (!planta) nuevosErrores.planta = true
    if (modalidadPaginas === 'dos' && !noSerie.trim() && !nombreEquipo.trim()) {
      nuevosErrores.equipo = true
    }
    if (!firmaEntrega) nuevosErrores.firmaEntrega = true
    if (!firmaRecibe) nuevosErrores.firmaRecibe = true
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setErrorGuardado('')
    setSaveStatus('saving')
    try {
      await crearActa(token, {
        fecha,
        responsable,
        departamento,
        puesto,
        // NOTA (Fase 3): el backend (actasController.js) todavía no guarda
        // este campo -- ver reporte de la fase para el detalle.
        dpi,
        planta,
        modalidad: modalidadPaginas,
        tipo_equipo: tipoEquipo,
        estado_equipo: estadoEquipo,
        marca: marcaEquipo === 'Otro' ? marcaEquipoDetalle : marcaEquipo,
        modelo: modeloEquipo,
        serie: noSerie,
        nombre_equipo: nombreEquipo,
        procesador,
        memoria_ram: memoriaRam ? `${memoriaRam} GB` : '',
        disco_duro: discoCapacidad ? `${discoTipo.toUpperCase()} ${discoCapacidad}` : '',
        borrador: false,
        firma_entrega_base64: firmaEntrega,
        firma_recibe_base64: firmaRecibe,
        accesorios: filasAccesorios.map((f) => ({
          articulo: f.articulo,
          marca: f.marca,
          modelo: f.modelo,
          serie: f.serie,
          estado: f.estado,
        })),
      })
      setEstadoActa('finalizado')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1200)
    } catch (err) {
      setSaveStatus('error')
      setErrorGuardado(err.message || 'No se pudo guardar el acta')
    }
  }

  function handleCancelar() {
    const hayDatos =
      responsable.trim() ||
      departamento ||
      noSerie.trim() ||
      nombreEquipo.trim() ||
      filasAccesorios.length > 0

    if (hayDatos) {
      setModalCancelar(true)
      return
    }

    limpiarFormulario()
  }

  async function handleConfirmarCancelar() {
    // Breve estado de carga antes de limpiar, para dar feedback visual de
    // que la acción se está procesando.
    setCancelando(true)
    await new Promise((resolve) => setTimeout(resolve, 400))
    limpiarFormulario()
    setCancelando(false)
    setModalCancelar(false)
  }

  function limpiarFormulario() {
    setFecha('2024-10-24')
    setResponsable('')
    setDepartamento('')
    setPuesto('')
    setDpi('(clic para escribir su DPI)')
    setPlanta('Tejar')
    setModalidadPaginas('dos')
    setTipoEquipo('Laptop')
    setEstadoEquipo('Nuevo')
    setMarcaEquipo('Original')
    setMarcaEquipoDetalle('')
    setModeloEquipo('')
    setNoSerie('')
    setNombreEquipo('')
    setProcesador('')
    setMemoriaRam('16')
    setDiscoTipo('ssd')
    setDiscoCapacidad('')
    setDiaEntrega('__')
    setMesEntrega('__')
    setAnioEntrega('____')
    setNombreEntrega('(clic para escribir su nombre)')
    setAccesoriosSeleccionados([])
    setFilasAccesorios([])
    setFirmaEntrega(null)
    setFirmaRecibe(null)
    setErrores({})
    setErrorGuardado('')
    setSaveStatus('idle')
    setEstadoActa('borrador')
  }

  return (
    <>
      {/* Header Actions */}
      <div className="hidden md:flex justify-between items-center px-stack-lg py-4 border-b border-outline-variant bg-surface-bright sticky top-0 z-30">
        <div className="font-headline-lg text-headline-lg font-bold text-primary">
          Formulario de Retorno
        </div>
      </div>

      {/* Scrollable Content Canvas */}
      <div className="flex-1 p-4 md:p-8 custom-scrollbar relative">
        <div className="max-w-[896px] mx-auto space-y-stack-lg pb-8">
          {/* 1. Header: Official letterhead */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="border-b-3 border-primary w-full h-[3px]"></div>
            <div className="p-stack-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container rounded flex items-center justify-center text-on-primary">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_shipping
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-primary font-bold">
                    HOJA DE DEVOLUCIÓN DE EQUIPO
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Departamento de Tecnologías de la Información
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right border-l-0 md:border-l border-outline-variant md:pl-6">
                <div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Código:
                </div>
                <div className="font-label-bold text-label-bold text-primary">DEV-EQ-01</div>
                <div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Fecha Emisión:
                </div>
                <InlineEditableText
                  value={fechaEmision}
                  onChange={setFechaEmision}
                  className="font-label-bold text-label-bold text-primary justify-end"
                  title="Clic para editar la fecha de emisión"
                />
                <div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Vigencia:
                </div>
                <InlineEditableText
                  value={fechaVigencia}
                  onChange={setFechaVigencia}
                  className="font-label-bold text-label-bold text-primary justify-end"
                  title="Clic para editar la fecha de vigencia"
                />
              </div>
            </div>
          </div>

          {/* Datos del Usuario */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="border-t-[3px] border-primary"></div>
            <div className="px-stack-md py-3 bg-header-fill border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">person</span>
              <h3 className="font-label-bold text-label-bold text-primary uppercase tracking-wider">
                Datos del Usuario
              </h3>
            </div>
            <div className="p-stack-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Fecha de Devolución
                  </label>
                  <input
                    className={`w-full bg-surface-bright border rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors ${
                      errores.fecha ? 'border-error' : 'border-outline'
                    }`}
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Responsable que Entrega
                  </label>
                  <input
                    className={`w-full bg-surface-bright border rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors ${
                      errores.responsable ? 'border-error' : 'border-outline'
                    }`}
                    placeholder="Nombre completo"
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">Departamento</label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="Área o departamento"
                    className={`w-full bg-surface-bright border rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors ${
                      errores.departamento ? 'border-error' : 'border-outline'
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">Puesto</label>
                  <input
                    className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                    placeholder="Cargo actual"
                    type="text"
                    value={puesto}
                    onChange={(e) => setPuesto(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Recibí de
                  </label>
                  <input
                    className="w-full bg-surface-container-low text-on-surface-variant border border-outline rounded px-3 py-2 font-body-md text-body-md cursor-not-allowed"
                    value="AGROINDUSTRIA LEGUMEX, S.A."
                    readOnly
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:col-span-3 pt-2">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Planta / Ubicación
                  </label>
                  <div className="flex flex-wrap gap-6">
                    {['Tejar', 'Parramos'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative w-4 h-4 flex items-center justify-center">
                          <input
                            checked={planta === opt}
                            onChange={() => setPlanta(opt)}
                            className="peer appearance-none w-4 h-4 border border-outline rounded-full checked:border-primary checked:border-[4px] transition-all"
                            name="planta"
                            type="radio"
                          />
                        </div>
                        <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Control de modalidad */}
          <div className="flex items-center gap-3 px-1">
            <span className="font-label-bold text-label-bold text-on-surface">Formato del acta:</span>
            <div className="flex rounded overflow-hidden border border-outline">
              {[
                { valor: 'una', etiqueta: '1 página' },
                { valor: 'dos', etiqueta: '2 páginas' },
              ].map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setModalidadPaginas(opcion.valor)}
                  className={`px-3 py-1.5 font-label-bold text-label-bold transition-colors ${
                    modalidadPaginas === opcion.valor
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-bright text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción de Equipo */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              modalidadPaginas === 'dos' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="border-t-[3px] border-primary"></div>
            <div className="px-stack-md py-3 bg-header-fill border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">devices</span>
              <h3 className="font-label-bold text-label-bold text-primary uppercase tracking-wider">
                Descripción de Equipo
              </h3>
            </div>
            <div className="p-stack-md border-b border-outline-variant bg-surface-blue/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-label-bold text-on-surface">Tipo de Equipo</label>
                  <div className="flex flex-col gap-2">
                    {['Laptop', 'Escritorio'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          checked={tipoEquipo === opt}
                          onChange={() => setTipoEquipo(opt)}
                          className="appearance-none w-4 h-4 border border-outline rounded-full checked:border-primary checked:border-[4px] transition-all"
                          name="tipo_equipo"
                          type="radio"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-label-bold text-on-surface">Estado</label>
                  <div className="flex flex-col gap-2">
                    {['Nuevo', 'Usado'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          checked={estadoEquipo === opt}
                          onChange={() => setEstadoEquipo(opt)}
                          className="appearance-none w-4 h-4 border border-outline rounded-full checked:border-primary checked:border-[4px] transition-all"
                          name="estado"
                          type="radio"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-label-bold text-on-surface">Marca</label>
                  <div className="flex flex-col gap-2">
                    {['Original', 'CLON'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          checked={marcaEquipo === opt}
                          onChange={() => setMarcaEquipo(opt)}
                          className="appearance-none w-4 h-4 border border-outline rounded-full checked:border-primary checked:border-[4px] transition-all"
                          name="marca"
                          type="radio"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{opt}</span>
                      </label>
                    ))}
                    {marcaEquipo === 'CLON' && (
                      <input
                        className="w-full bg-surface-bright border border-outline rounded px-3 py-1.5 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors mt-1"
                        placeholder="Especifique la marca"
                        value={marcaEquipoDetalle}
                        onChange={(e) => setMarcaEquipoDetalle(e.target.value)}
                        type="text"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-stack-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">Modelo</label>
                  <input
                    className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                    placeholder="Ej. Latitude 5420"
                    type="text"
                    value={modeloEquipo}
                    onChange={(e) => setModeloEquipo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Número de Serie (S/N)
                  </label>
                  <input
                    className={`w-full bg-surface-bright border rounded px-3 py-2 font-body-md text-body-md text-on-surface font-mono uppercase focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors ${
                      errores.equipo ? 'border-error' : 'border-outline'
                    }`}
                    placeholder="ALFANUMERICO"
                    type="text"
                    value={noSerie}
                    onChange={(e) => setNoSerie(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Nombre del Equipo
                  </label>
                  <input
                    className={`w-full bg-surface-bright border rounded px-3 py-2 font-body-md text-body-md text-on-surface font-mono focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors ${
                      errores.equipo ? 'border-error' : 'border-outline'
                    }`}
                    placeholder="LGMX-NB-001"
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">Procesador</label>
                  <input
                    className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                    placeholder="Ej. Intel Core i5 11th Gen"
                    type="text"
                    value={procesador}
                    onChange={(e) => setProcesador(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">Memoria RAM</label>
                  <select
                    value={memoriaRam}
                    onChange={(e) => setMemoriaRam(e.target.value)}
                    className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                  >
                    <option value="8">8 GB</option>
                    <option value="16">16 GB</option>
                    <option value="32">32 GB</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Almacenamiento (Disco)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={discoTipo}
                      onChange={(e) => setDiscoTipo(e.target.value)}
                      className="w-1/3 bg-surface-bright border border-outline rounded px-2 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                    >
                      <option value="ssd">SSD</option>
                      <option value="hdd">HDD</option>
                    </select>
                    <input
                      className="w-2/3 bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                      placeholder="Capacidad (Ej. 512GB)"
                      type="text"
                      value={discoCapacidad}
                      onChange={(e) => setDiscoCapacidad(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>

          {/* Accesorios */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="border-t-[3px] border-primary"></div>
            <div className="px-stack-md py-3 bg-header-fill border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">
                  {modalidadPaginas === 'una' ? 'devices' : 'mouse'}
                </span>
                <h3 className="font-label-bold text-label-bold text-primary uppercase tracking-wider">
                  {modalidadPaginas === 'una' ? 'Descripción de Equipo' : 'Accesorios Devueltos'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={agregarFilaManual}
                  type="button"
                  className="text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-bold text-label-bold"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span> Agregar Fila
                </button>
                {filasAccesorios.length > 0 && (
                  <button
                    onClick={vaciarTablaAccesorios}
                    type="button"
                    className="text-outline hover:text-error transition-colors flex items-center gap-1 font-label-bold text-label-bold"
                  >
                    <span className="material-symbols-outlined text-sm">playlist_remove</span> Vaciar tabla
                  </button>
                )}
              </div>
            </div>
            <div className="p-stack-md border-b border-outline-variant bg-surface-blue/30">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-3">
                Verificación Rápida
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {ACCESORIOS.map((label) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      checked={accesoriosSeleccionados.includes(label)}
                      onChange={() => toggleAccesorio(label)}
                      className="appearance-none w-4 h-4 border border-outline rounded-sm checked:bg-primary checked:border-primary flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden checked:after:block transition-colors"
                      type="checkbox"
                    />
                    <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase w-12">
                      No.
                    </th>
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase">
                      Artículo
                    </th>
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase">
                      Marca
                    </th>
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase">
                      Modelo
                    </th>
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase">
                      No. Serie
                    </th>
                    <th className="py-2 px-4 font-label-bold text-label-bold text-on-surface-variant uppercase w-32">
                      Estado
                    </th>
                    <th className="py-2 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filasAccesorios.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 px-4 text-center text-on-surface-variant font-body-md text-body-md">
                        Marca un accesorio arriba o usa "Agregar Fila" para empezar.
                      </td>
                    </tr>
                  )}
                  {filasAccesorios.map((fila, index) => (
                    <tr
                      key={fila.id}
                      className="border-b border-outline-variant hover:bg-surface-blue/20 transition-colors group"
                    >
                      <td className="py-2 px-4 font-body-md text-body-md text-on-surface-variant">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-secondary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder={fila.accesorioId === 'Otro' ? 'Especifique el artículo...' : 'Especificar...'}
                          type="text"
                          value={fila.articulo}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'articulo', e.target.value)}
                          readOnly={fila.origen === 'checkbox' && fila.accesorioId !== 'Otro'}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-secondary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.marca}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'marca', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-secondary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.modelo}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'modelo', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-secondary focus:ring-0 px-1 py-1 font-body-md text-body-md font-mono transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.serie}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'serie', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={fila.estado}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'estado', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-secondary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                        >
                          <option>Nuevo</option>
                          <option>Usado</option>
                        </select>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarFilaAccesorio(fila.id)}
                          className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Constancia de Entrega & Observaciones */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="border-t-[3px] border-primary"></div>
            <div className="p-stack-md border-b border-outline-variant">
              <label className="font-label-bold text-label-bold text-on-surface block mb-2">
                Observaciones Generales
              </label>
              <textarea
                className="w-full bg-surface-bright border border-outline rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors min-h-[100px] resize-y"
                placeholder="Anote cualquier daño estético, fallas reportadas no resueltas, o información relevante sobre el equipo devuelto..."
              ></textarea>
            </div>
            <div className="p-stack-lg bg-surface-blue/20">
              <p className="font-body-md text-body-md text-on-surface leading-relaxed mb-8">
                Por este medio se hace constar que el día{' '}
                <InlineEditableText
                  value={diaEntrega}
                  onChange={setDiaEntrega}
                  className="text-primary font-bold"
                  title="Clic para editar el día"
                />{' '}
                del mes{' '}
                <InlineEditableText
                  value={mesEntrega}
                  onChange={setMesEntrega}
                  className="text-primary font-bold"
                  title="Clic para editar el mes"
                />{' '}
                del año{' '}
                <InlineEditableText
                  value={anioEntrega}
                  onChange={setAnioEntrega}
                  className="text-primary font-bold"
                  title="Clic para editar el año"
                />
                {modalidadPaginas === 'una' && (
                  <>
                    , que me identifico con número de documento personal{' '}
                    <InlineEditableText
                      value={dpi}
                      onChange={setDpi}
                      className="text-primary font-bold"
                      title="Clic para editar el DPI"
                    />
                  </>
                )}
                , hago constar que entrego todo el equipo descrito arriba. Yo{' '}
                <InlineEditableText
                  value={nombreEntrega}
                  onChange={setNombreEntrega}
                  className="text-primary font-bold"
                  title="Clic para escribir su nombre"
                />
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 px-8">
                <FirmaPad
                  titulo="Nombre y Firma de quien Entrega"
                  subtitulo="(Usuario Final)"
                  firmaUrl={firmaEntrega}
                  onConfirmar={setFirmaEntrega}
                  onReiniciar={() => setFirmaEntrega(null)}
                />
                <FirmaPad
                  titulo="Nombre y Firma de quien Recibe"
                  subtitulo="(Soporte TI)"
                  firmaUrl={firmaRecibe}
                  onConfirmar={setFirmaRecibe}
                  onReiniciar={() => setFirmaRecibe(null)}
                />
              </div>
              {(errores.firmaEntrega || errores.firmaRecibe) && (
                <p className="text-error font-label-sm text-label-sm px-8 mt-2 text-center">
                  Ambas firmas deben quedar confirmadas para finalizar la devolución.
                </p>
              )}
            </div>
          </section>

          {estadoActa === 'finalizado' && (
            <div className="flex items-center justify-between bg-secondary-container text-on-secondary-container rounded-lg px-4 py-3 font-label-bold text-label-bold">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">lock</span>
                Acta finalizada
              </span>
            </div>
          )}
          {errores.equipo && (
            <p className="text-error font-label-sm text-label-sm px-1">
              Indica el No. de Serie o el Nombre del Equipo para finalizar.
            </p>
          )}
          {saveStatus === 'error' && errorGuardado && (
            <p className="text-error font-label-sm text-label-sm px-1">
              {errorGuardado}
            </p>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-6 py-2 border border-outline text-on-surface-variant rounded hover:bg-surface-container-low transition-colors font-label-bold text-label-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizarDevolucion}
              disabled={saveStatus === 'saving'}
              className="px-6 py-2 bg-primary-container text-on-primary rounded hover:opacity-90 transition-opacity shadow-sm font-label-bold text-label-bold flex items-center gap-2 disabled:opacity-60"
            >
              {saveStatus === 'saving' ? (
                <span
                  className="material-symbols-outlined text-sm animate-spin"
                  aria-hidden="true"
                >
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-sm">check_circle</span>
              )}
              {saveStatus === 'saving'
                ? 'Guardando...'
                : saveStatus === 'saved'
                ? 'Guardado'
                : 'Finalizar Devolución'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        abierto={modalQuitarAccesorio !== null}
        titulo="Quitar accesorio"
        mensaje={
          modalQuitarAccesorio
            ? `La fila "${modalQuitarAccesorio.label}" ya tiene datos capturados. ¿Deseas eliminarla también?`
            : ''
        }
        textoConfirmar="Eliminar fila"
        textoCancelar="Conservar fila"
        variante="peligro"
        onConfirmar={handleConfirmarQuitarAccesorio}
        onCancelar={handleCancelarQuitarAccesorio}
      />

      <ConfirmModal
        abierto={modalCancelar}
        titulo="Descartar formulario"
        mensaje="¿Descartar los datos capturados en este formulario? Esta acción no se puede deshacer."
        procesando={cancelando}
        textoConfirmar="Descartar"
        textoCancelar="Seguir editando"
        variante="peligro"
        onConfirmar={handleConfirmarCancelar}
        onCancelar={() => setModalCancelar(false)}
      />
    </>
  )
}

export default Devolucion
