import { useState } from 'react'
import {
  UserRound,
  MonitorSmartphone,
  Mouse,
  MessageSquareText,
  FileSignature,
  PlusCircle,
  ListX,
  PackageOpen,
  X,
  Lock,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
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

// Clases compartidas: un solo lugar donde vive la receta de input/label, para
// que las tres secciones del formulario no se desincronicen con el tiempo.
const INPUT_BASE =
  'h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary'
const LABEL = 'font-label-bold text-label-bold text-on-surface'

// Encabezado de sección. TODAS las secciones lo usan -- antes "Observaciones
// Generales" era la única que no lo tenía y quedaba como un campo huérfano
// dentro de la tarjeta de firmas.
function EncabezadoSeccion({ icon: Icon, titulo, children }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="font-label-bold text-label-bold text-on-surface uppercase tracking-wider">
          {titulo}
        </h3>
      </div>
      {children}
    </header>
  )
}

let contadorFilas = 0
function generarIdFila() {
  contadorFilas += 1
  return `fila-${Date.now()}-${contadorFilas}`
}

function Devolucion() {
  const { token } = useAuth()
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [errorGuardado, setErrorGuardado] = useState('')
  const [estadoActa, setEstadoActa] = useLocalStorageState('devolucion:estadoActa', 'borrador') // borrador | finalizado
  const [errores, setErrores] = useState({})
  const [firmaEntrega, setFirmaEntrega] = useLocalStorageState('devolucion:firmaEntrega', null)
  const [firmaRecibe, setFirmaRecibe] = useLocalStorageState('devolucion:firmaRecibe', null)

  // Datos del Usuario
  const [fecha, setFecha] = useLocalStorageState('devolucion:fecha', '2024-10-24')
  const [responsable, setResponsable] = useLocalStorageState('devolucion:responsable', '')
  const [departamento, setDepartamento] = useLocalStorageState('devolucion:departamento', '')
  const [puesto, setPuesto] = useLocalStorageState('devolucion:puesto', '')
  const [dpi, setDpi] = useLocalStorageState('devolucion:dpi', '(clic para escribir su DPI)')
  const [planta, setPlanta] = useLocalStorageState('devolucion:planta', 'Tejar')

  const [modalidadPaginas, setModalidadPaginas] = useLocalStorageState('devolucion:modalidadPaginas', 'dos') // 'una' | 'dos'
  const [tipoEquipo, setTipoEquipo] = useLocalStorageState('devolucion:tipoEquipo', 'Laptop')
  const [estadoEquipo, setEstadoEquipo] = useLocalStorageState('devolucion:estadoEquipo', 'Nuevo')
  const [marcaEquipo, setMarcaEquipo] = useLocalStorageState('devolucion:marcaEquipo', 'Original')
  const [marcaEquipoDetalle, setMarcaEquipoDetalle] = useLocalStorageState('devolucion:marcaEquipoDetalle', '')
  const [modeloEquipo, setModeloEquipo] = useLocalStorageState('devolucion:modeloEquipo', '')
  const [noSerie, setNoSerie] = useLocalStorageState('devolucion:noSerie', '')
  const [nombreEquipo, setNombreEquipo] = useLocalStorageState('devolucion:nombreEquipo', '')
  const [procesador, setProcesador] = useLocalStorageState('devolucion:procesador', '')
  const [memoriaRam, setMemoriaRam] = useLocalStorageState('devolucion:memoriaRam', '16 GB')
  const [discoTipo, setDiscoTipo] = useLocalStorageState('devolucion:discoTipo', 'ssd')
  const [discoCapacidad, setDiscoCapacidad] = useLocalStorageState('devolucion:discoCapacidad', '')

  // Observaciones: antes el <textarea> no estaba conectado a ningún estado --
  // lo que se escribía se perdía al recargar y nunca llegaba al acta.
  const [observaciones, setObservaciones] = useLocalStorageState('devolucion:observaciones', '')

  // Constancia: campos inline
  const [diaEntrega, setDiaEntrega] = useLocalStorageState('devolucion:diaEntrega', '__')
  const [mesEntrega, setMesEntrega] = useLocalStorageState('devolucion:mesEntrega', '__')
  const [anioEntrega, setAnioEntrega] = useLocalStorageState('devolucion:anioEntrega', '____')
  const [nombreEntrega, setNombreEntrega] = useLocalStorageState('devolucion:nombreEntrega', '(clic para escribir su nombre)')

  // Accesorios: checkboxes + tabla sincronizada
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useLocalStorageState('devolucion:accesoriosSeleccionados', [])
  const [filasAccesorios, setFilasAccesorios] = useLocalStorageState('devolucion:filasAccesorios', [])

  const [modalCancelar, setModalCancelar] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const [fechaEmision, setFechaEmision] = useLocalStorageState('legumex_fecha_emision', 'Enero 2025')
  const [fechaVigencia, setFechaVigencia] = useLocalStorageState('legumex_fecha_vigencia', 'Enero 2026')

  // Resumen de lo que falta -- alimenta la barra de acciones fija, para que el
  // usuario no descubra los requisitos hasta que pulsa "Finalizar".
  const pendientes = []
  if (!responsable.trim()) pendientes.push('responsable')
  if (!departamento.trim()) pendientes.push('departamento')
  if (!firmaEntrega || !firmaRecibe) {
    pendientes.push(!firmaEntrega && !firmaRecibe ? '2 firmas' : '1 firma')
  }

  function toggleAccesorio(label) {
    if (!accesoriosSeleccionados.includes(label)) {
      setAccesoriosSeleccionados((prev) => [...prev, label])
    }
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
    const nuevasFilas = filasAccesorios.filter((f) => f.id !== id)
    setFilasAccesorios(nuevasFilas)
    if (fila?.accesorioId) {
      const quedanOtras = nuevasFilas.some((f) => f.accesorioId === fila.accesorioId)
      if (!quedanOtras) {
        setAccesoriosSeleccionados((prev) => prev.filter((a) => a !== fila.accesorioId))
      }
    }
  }

  function vaciarTablaAccesorios() {
    setFilasAccesorios([])
    setAccesoriosSeleccionados([])
  }

  async function handleFinalizarDevolucion() {
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
        memoria_ram: memoriaRam || '',
        disco_duro: discoCapacidad ? `${discoTipo.toUpperCase()} ${discoCapacidad}` : '',
        observaciones,
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
      setTimeout(() => {
        setSaveStatus('idle')
        limpiarFormulario()
      }, 1200)
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
      observaciones.trim() ||
      filasAccesorios.length > 0

    if (hayDatos) {
      setModalCancelar(true)
      return
    }

    limpiarFormulario()
  }

  async function handleConfirmarCancelar() {
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
    setMemoriaRam('16 GB')
    setDiscoTipo('ssd')
    setDiscoCapacidad('')
    setObservaciones('')
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
      <div className="flex-1 p-4 md:p-8 custom-scrollbar relative bg-background">
        <div className="max-w-[896px] mx-auto space-y-stack-lg pb-4">
          {/* 1. Membrete del acta.
              Sin la barra negra decorativa de 6px (no comunicaba nada) y con
              el logo de la empresa en lugar del ícono genérico de monitor. */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-outline-variant bg-surface p-1.5">
                  <img
                    src="/logo-legumex-icon.png"
                    alt="Agroindustria Legumex"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="font-label-sm text-label-sm uppercase tracking-[0.12em] text-on-surface-variant">
                    Agroindustria Legumex, S.A.
                  </p>
                  <h2 className="mt-1 font-headline-lg text-headline-lg text-on-surface font-extrabold leading-tight">
                    Hoja de Devolución de Equipo
                  </h2>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    Departamento de Tecnologías de la Información
                  </p>
                </div>
              </div>
              <dl className="grid shrink-0 grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1.5 sm:text-right">
                <dt className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Código
                </dt>
                <dd className="font-mono text-label-bold text-on-surface">DEV-EQ-01</dd>
                <dt className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Emisión
                </dt>
                <dd>
                  <InlineEditableText
                    value={fechaEmision}
                    onChange={setFechaEmision}
                    className="font-label-bold text-label-bold text-on-surface justify-end"
                    title="Clic para editar la fecha de emisión"
                  />
                </dd>
                <dt className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Vigencia
                </dt>
                <dd>
                  <InlineEditableText
                    value={fechaVigencia}
                    onChange={setFechaVigencia}
                    className="font-label-bold text-label-bold text-on-surface justify-end"
                    title="Clic para editar la fecha de vigencia"
                  />
                </dd>
              </dl>
            </div>

            {/* Formato del acta: es una propiedad del documento, así que vive
                dentro del membrete. Antes flotaba suelto entre dos tarjetas,
                sin contenedor ni encabezado que lo explicara. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-3 md:px-6">
              <div>
                <p className="font-label-bold text-label-bold text-on-surface">Formato del acta</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {modalidadPaginas === 'dos'
                    ? 'Incluye la ficha técnica completa del equipo.'
                    : 'Versión corta: solo accesorios y constancia con DPI.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-outline-variant bg-surface p-1">
                {[
                  { valor: 'una', etiqueta: '1 página' },
                  { valor: 'dos', etiqueta: '2 páginas' },
                ].map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setModalidadPaginas(opcion.valor)}
                    aria-pressed={modalidadPaginas === opcion.valor}
                    className={`rounded-md px-3.5 py-1.5 font-label-bold text-label-bold transition-colors ${
                      modalidadPaginas === opcion.valor
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Datos del Usuario -- rejilla de 12 columnas.
              Fila 1: 4 + 8. Fila 2: 4 + 4 + 4. Ahora los bordes de columna
              coinciden entre filas (antes eran 1/3+2/3 contra tres tercios
              con gaps distintos, y nada alineaba). */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <EncabezadoSeccion icon={UserRound} titulo="Datos del Usuario" />
            <div className="grid grid-cols-12 gap-column-gap gap-y-stack-md p-5">
              <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                <label className={LABEL}>Fecha de Devolución</label>
                <input
                  className={`${INPUT_BASE} ${errores.fecha ? 'border-error' : 'border-outline-variant'}`}
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="col-span-12 flex flex-col gap-1.5 md:col-span-8">
                <label className={LABEL}>Responsable que Entrega</label>
                <input
                  className={`${INPUT_BASE} ${errores.responsable ? 'border-error' : 'border-outline-variant'}`}
                  placeholder="Nombre completo"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                <label className={LABEL}>Departamento</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="Área o departamento"
                  className={`${INPUT_BASE} ${errores.departamento ? 'border-error' : 'border-outline-variant'}`}
                />
              </div>
              <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                <label className={LABEL}>Puesto</label>
                <input
                  className={`${INPUT_BASE} border-outline-variant`}
                  placeholder="Cargo actual"
                  type="text"
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                />
              </div>
              {/* "Recibí de" es un valor fijo del sistema: se presenta como
                  dato, no como campo. Antes era un <input readOnly> que
                  parecía editable e invitaba a hacer clic. */}
              <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                <label className={LABEL}>Recibí de</label>
                <div className="flex h-11 items-center gap-2 border-b border-outline-variant">
                  <Lock className="h-4 w-4 shrink-0 text-on-surface-variant" strokeWidth={1.5} aria-hidden="true" />
                  <span className="truncate font-body-md text-body-md text-on-surface">
                    AGROINDUSTRIA LEGUMEX, S.A.
                  </span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Valor fijo del sistema</p>
              </div>

              <div className="col-span-12 flex flex-col gap-2 pt-1">
                <label className={LABEL}>Planta / Ubicación</label>
                <div className="flex flex-wrap gap-2">
                  {['Tejar', 'Parramos'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPlanta(opt)}
                      aria-pressed={planta === opt}
                      className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 font-label-bold text-label-bold transition-colors ${
                        planta === opt
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface text-on-surface hover:border-outline'
                      }`}
                    >
                      {planta === opt && <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Descripción de Equipo */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              modalidadPaginas === 'dos' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <EncabezadoSeccion icon={MonitorSmartphone} titulo="Descripción de Equipo" />

              {/* Selectores de marca: botones negros en lugar de radios azules
                  del navegador. Misma altura que los inputs. */}
              <div className="grid grid-cols-12 gap-column-gap gap-y-stack-md border-b border-outline-variant p-5">
                {[
                  { label: 'Tipo de Equipo', opts: ['Laptop', 'Escritorio'], valor: tipoEquipo, set: setTipoEquipo },
                  { label: 'Estado', opts: ['Nuevo', 'Usado'], valor: estadoEquipo, set: setEstadoEquipo },
                  { label: 'Marca', opts: ['Original', 'CLON'], valor: marcaEquipo, set: setMarcaEquipo },
                ].map((grupo) => (
                  <div key={grupo.label} className="col-span-12 flex flex-col gap-2 md:col-span-4">
                    <label className={LABEL}>{grupo.label}</label>
                    <div className="flex gap-2">
                      {grupo.opts.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => grupo.set(opt)}
                          aria-pressed={grupo.valor === opt}
                          className={`h-11 flex-1 rounded-lg border font-label-bold text-label-bold transition-colors ${
                            grupo.valor === opt
                              ? 'border-primary bg-primary text-on-primary'
                              : 'border-outline-variant bg-surface text-on-surface hover:border-outline'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {grupo.label === 'Marca' && marcaEquipo === 'CLON' && (
                      <input
                        className={`${INPUT_BASE} border-outline-variant`}
                        placeholder="Especifique la marca"
                        value={marcaEquipoDetalle}
                        onChange={(e) => setMarcaEquipoDetalle(e.target.value)}
                        type="text"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-column-gap gap-y-stack-md p-5">
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Modelo</label>
                  <input
                    className={`${INPUT_BASE} border-outline-variant`}
                    placeholder="Ej. Latitude 5420"
                    type="text"
                    value={modeloEquipo}
                    onChange={(e) => setModeloEquipo(e.target.value)}
                  />
                </div>
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Número de Serie (S/N)</label>
                  <input
                    className={`${INPUT_BASE} font-mono uppercase ${errores.equipo ? 'border-error' : 'border-outline-variant'}`}
                    placeholder="ALFANUMERICO"
                    type="text"
                    value={noSerie}
                    onChange={(e) => setNoSerie(e.target.value)}
                  />
                </div>
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Nombre del Equipo</label>
                  <input
                    className={`${INPUT_BASE} font-mono ${errores.equipo ? 'border-error' : 'border-outline-variant'}`}
                    placeholder="LGMX-NB-001"
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                  />
                </div>
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Procesador</label>
                  <input
                    className={`${INPUT_BASE} border-outline-variant`}
                    placeholder="Ej. Intel Core i5 11th Gen"
                    type="text"
                    value={procesador}
                    onChange={(e) => setProcesador(e.target.value)}
                  />
                </div>
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Memoria RAM</label>
                  <input
                    className={`${INPUT_BASE} border-outline-variant`}
                    placeholder="Ej. 4 GB, 8 GB, 16 GB..."
                    type="text"
                    value={memoriaRam}
                    onChange={(e) => setMemoriaRam(e.target.value)}
                  />
                </div>
                <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                  <label className={LABEL}>Almacenamiento (Disco)</label>
                  <div className="flex gap-2">
                    <select
                      value={discoTipo}
                      onChange={(e) => setDiscoTipo(e.target.value)}
                      className="h-11 w-24 shrink-0 rounded-lg border border-outline-variant bg-surface px-2.5 font-label-bold text-label-bold text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      <option value="ssd">SSD</option>
                      <option value="hdd">HDD</option>
                    </select>
                    <input
                      className={`${INPUT_BASE} border-outline-variant`}
                      placeholder="Capacidad (Ej. 512GB)"
                      type="text"
                      value={discoCapacidad}
                      onChange={(e) => setDiscoCapacidad(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 4. Accesorios */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <EncabezadoSeccion
              icon={modalidadPaginas === 'una' ? MonitorSmartphone : Mouse}
              titulo={modalidadPaginas === 'una' ? 'Descripción de Equipo' : 'Accesorios Devueltos'}
            >
              <div className="flex items-center gap-2">
                {filasAccesorios.length > 0 && (
                  <>
                    <span className="rounded-full border border-outline-variant px-2 py-0.5 font-mono text-label-sm text-on-surface-variant tabular-nums">
                      {filasAccesorios.length}
                    </span>
                    <button
                      onClick={vaciarTablaAccesorios}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 font-label-bold text-label-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container active:brightness-95"
                    >
                      <ListX className="h-4 w-4" strokeWidth={1.5} />
                      Vaciar tabla
                    </button>
                  </>
                )}
                <button
                  onClick={agregarFilaManual}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-label-bold text-label-bold text-on-primary transition-all hover:brightness-110 active:brightness-95"
                >
                  <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                  Agregar fila
                </button>
              </div>
            </EncabezadoSeccion>

            <div className="border-b border-outline-variant p-5">
              <p className="mb-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Verificación Rápida
              </p>
              {/* Chips negros en lugar de checkboxes azules del navegador. */}
              <div className="flex flex-wrap gap-2">
                {ACCESORIOS.map((label) => {
                  const activo = accesoriosSeleccionados.includes(label)
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleAccesorio(label)}
                      aria-pressed={activo}
                      title={activo ? `Agregar otra unidad de ${label}` : `Agregar ${label}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-label-bold text-label-bold transition-colors ${
                        activo
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface text-on-surface hover:border-outline'
                      }`}
                    >
                      {activo && <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {filasAccesorios.length === 0 ? (
              /* Estado vacío con ícono, explicación y acción -- antes era solo
                 una frase centrada sin salida. */
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <PackageOpen className="h-6 w-6 text-outline" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className="font-label-bold text-label-bold text-on-surface">
                    Todavía no hay accesorios en el acta
                  </p>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    Marca uno arriba para agregarlo con su tipo, o crea una fila en blanco.
                  </p>
                </div>
                <button
                  onClick={agregarFilaManual}
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                  Agregar fila en blanco
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-left font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="w-14 py-2.5 pl-5 pr-3 text-right font-bold">No.</th>
                      <th className="py-2.5 pr-3 font-bold">Artículo</th>
                      <th className="py-2.5 pr-3 font-bold">Marca</th>
                      <th className="py-2.5 pr-3 font-bold">Modelo</th>
                      <th className="py-2.5 pr-3 font-bold">No. Serie</th>
                      <th className="w-32 py-2.5 pr-3 font-bold">Estado</th>
                      <th className="w-12 py-2.5 pr-5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filasAccesorios.map((fila, index) => (
                      <tr
                        key={fila.id}
                        className="group border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low"
                      >
                        {/* Numeración tabular 01, 02... para que la columna no
                            baile al pasar de 9 a 10 filas. */}
                        <td className="py-2 pl-5 pr-3 text-right font-mono text-body-md tabular-nums text-on-surface-variant">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full border-0 border-b border-transparent bg-transparent px-1 py-1 font-body-md text-body-md transition-colors focus:border-primary focus:ring-0"
                            placeholder={fila.accesorioId === 'Otro' ? 'Especifique el artículo...' : 'Especificar...'}
                            type="text"
                            value={fila.articulo}
                            onChange={(e) => actualizarFilaAccesorio(fila.id, 'articulo', e.target.value)}
                            readOnly={fila.origen === 'checkbox' && fila.accesorioId !== 'Otro'}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full border-0 border-b border-transparent bg-transparent px-1 py-1 font-body-md text-body-md transition-colors focus:border-primary focus:ring-0"
                            placeholder="Ej. Dell"
                            type="text"
                            value={fila.marca}
                            onChange={(e) => actualizarFilaAccesorio(fila.id, 'marca', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full border-0 border-b border-transparent bg-transparent px-1 py-1 font-body-md text-body-md transition-colors focus:border-primary focus:ring-0"
                            placeholder="Ej. P2422H"
                            type="text"
                            value={fila.modelo}
                            onChange={(e) => actualizarFilaAccesorio(fila.id, 'modelo', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full border-0 border-b border-transparent bg-transparent px-1 py-1 font-mono text-body-md uppercase transition-colors focus:border-primary focus:ring-0"
                            placeholder="CN0F9K2H74"
                            type="text"
                            value={fila.serie}
                            onChange={(e) => actualizarFilaAccesorio(fila.id, 'serie', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={fila.estado}
                            onChange={(e) => actualizarFilaAccesorio(fila.id, 'estado', e.target.value)}
                            className="w-full border-0 border-b border-transparent bg-transparent px-1 py-1 font-body-md text-body-md transition-colors focus:border-primary focus:ring-0"
                          >
                            <option>Nuevo</option>
                            <option>Usado</option>
                          </select>
                        </td>
                        <td className="py-2 pr-5">
                          <button
                            type="button"
                            onClick={() => eliminarFilaAccesorio(fila.id)}
                            aria-label={`Quitar fila ${index + 1}`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 5. Observaciones Generales -- ahora con su propio encabezado de
              sección, como el resto. Antes era un campo suelto encima de las
              firmas, sin título de sección. */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <EncabezadoSeccion icon={MessageSquareText} titulo="Observaciones Generales">
              <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                Opcional · {observaciones.length}/500
              </span>
            </EncabezadoSeccion>
            <div className="p-5">
              <textarea
                value={observaciones}
                maxLength={500}
                onChange={(e) => setObservaciones(e.target.value)}
                className="min-h-[96px] w-full resize-y rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                placeholder="Anote cualquier daño estético, fallas reportadas no resueltas, o información relevante sobre el equipo devuelto..."
              ></textarea>
            </div>
          </section>

          {/* 6. Constancia y firmas */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <EncabezadoSeccion icon={FileSignature} titulo="Constancia y Firmas" />
            <div className="p-5 md:p-6">
              <p className="mb-6 border-l-2 border-outline-variant pl-4 font-body-md text-body-md leading-relaxed text-on-surface md:mb-8">
                Por este medio se hace constar que el día{' '}
                <InlineEditableText
                  value={diaEntrega}
                  onChange={setDiaEntrega}
                  className="text-on-surface font-bold"
                  title="Clic para editar el día"
                />{' '}
                del mes{' '}
                <InlineEditableText
                  value={mesEntrega}
                  onChange={setMesEntrega}
                  className="text-on-surface font-bold"
                  title="Clic para editar el mes"
                />{' '}
                del año{' '}
                <InlineEditableText
                  value={anioEntrega}
                  onChange={setAnioEntrega}
                  className="text-on-surface font-bold"
                  title="Clic para editar el año"
                />
                {modalidadPaginas === 'una' && (
                  <>
                    , que me identifico con número de documento personal{' '}
                    <InlineEditableText
                      value={dpi}
                      onChange={setDpi}
                      className="text-on-surface font-bold"
                      title="Clic para editar el DPI"
                    />
                  </>
                )}
                , hago constar que entrego todo el equipo descrito arriba. Yo{' '}
                <InlineEditableText
                  value={nombreEntrega}
                  onChange={setNombreEntrega}
                  className="text-on-surface font-bold"
                  title="Clic para escribir su nombre"
                />
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <FirmaPad
                  titulo="Nombre y Firma de quien Entrega"
                  subtitulo="Usuario final"
                  firmaUrl={firmaEntrega}
                  onConfirmar={setFirmaEntrega}
                  onReiniciar={() => setFirmaEntrega(null)}
                />
                <FirmaPad
                  titulo="Nombre y Firma de quien Recibe"
                  subtitulo="Soporte TI"
                  firmaUrl={firmaRecibe}
                  onConfirmar={setFirmaRecibe}
                  onReiniciar={() => setFirmaRecibe(null)}
                />
              </div>
              {(errores.firmaEntrega || errores.firmaRecibe) && (
                <p className="mt-3 text-center font-label-sm text-label-sm text-error">
                  Ambas firmas deben quedar confirmadas para finalizar la devolución.
                </p>
              )}
            </div>
          </section>

          {errores.equipo && (
            <p className="px-1 font-label-sm text-label-sm text-error">
              Indica el No. de Serie o el Nombre del Equipo para finalizar.
            </p>
          )}
          {saveStatus === 'error' && errorGuardado && (
            <p className="px-1 font-label-sm text-label-sm text-error">{errorGuardado}</p>
          )}
        </div>
      </div>

      {/* 7. Barra de acciones fija. Siempre visible y siempre dice en qué
          estado está el acta y qué le falta -- antes los botones vivían al
          final del scroll y los requisitos solo aparecían al fallar. */}
      <div className="sticky bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-[0_-1px_2px_rgba(26,26,26,0.05)] md:px-8">
        <div className="mx-auto flex max-w-[896px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-2.5 py-1 font-label-bold text-label-bold text-on-surface">
              {estadoActa === 'finalizado' ? (
                <>
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Acta finalizada
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-outline" aria-hidden="true" />
                  Borrador
                </>
              )}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {estadoActa === 'finalizado'
                ? 'Guardada en el servidor'
                : pendientes.length > 0
                ? `Faltan: ${pendientes.join(' · ')}`
                : 'Lista para finalizar'}
            </span>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCancelar}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant bg-surface px-6 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizarDevolucion}
              disabled={saveStatus === 'saving'}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
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
