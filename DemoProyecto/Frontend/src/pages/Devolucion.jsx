import { useState } from 'react'
import {
  Truck,
  UserRound,
  MonitorSmartphone,
  Mouse,
  PlusCircle,
  ListX,
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

let contadorFilas = 0
function generarIdFila() {
  contadorFilas += 1
  return `fila-${Date.now()}-${contadorFilas}`
}

function Devolucion() {
  const { token } = useAuth()
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [errorGuardado, setErrorGuardado] = useState('')
  // Nuevo: estos campos ya no usan useState -- usan useLocalStorageState
  // (el mismo hook que ya usaban fechaEmision/fechaVigencia) para que, si el
  // usuario ya llenó datos (incluida una firma ya confirmada) y sale de la
  // página por accidente, los datos sigan ahí al volver a entrar en vez de
  // perderse. El prefijo "devolucion:" agrupa todas las claves para poder
  // limpiarlas juntas al finalizar o cancelar (ver limpiarFormulario).
  const [estadoActa, setEstadoActa] = useLocalStorageState('devolucion:estadoActa', 'borrador') // borrador | finalizado
  const [errores, setErrores] = useState({})
  const [firmaEntrega, setFirmaEntrega] = useLocalStorageState('devolucion:firmaEntrega', null) // base64 o null
  const [firmaRecibe, setFirmaRecibe] = useLocalStorageState('devolucion:firmaRecibe', null)

  // Datos del Usuario (necesarios para validar al Finalizar)
  const [fecha, setFecha] = useLocalStorageState('devolucion:fecha', '2024-10-24')
  const [responsable, setResponsable] = useLocalStorageState('devolucion:responsable', '')
  const [departamento, setDepartamento] = useLocalStorageState('devolucion:departamento', '')
  const [puesto, setPuesto] = useLocalStorageState('devolucion:puesto', '')
  // DPI: solo se usa dentro de la frase de constancia cuando el acta es de
  // "1 página" (ver formato físico) -- ya no es un input aparte en "Datos
  // del Usuario".
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
  // Memoria RAM: antes era un <select> con solo 8/16/32 GB fijos (le
  // faltaba, por ejemplo, 4 GB). Pasa a ser texto libre (ver el <input> más
  // abajo) porque el valor "fluctúa" -- distintas laptops traen distintas
  // cantidades y una lista fija siempre se va a quedar corta.
  const [memoriaRam, setMemoriaRam] = useLocalStorageState('devolucion:memoriaRam', '16 GB')
  const [discoTipo, setDiscoTipo] = useLocalStorageState('devolucion:discoTipo', 'ssd')
  const [discoCapacidad, setDiscoCapacidad] = useLocalStorageState('devolucion:discoCapacidad', '')

  // Constancia: campos inline (Paso 2)
  const [diaEntrega, setDiaEntrega] = useLocalStorageState('devolucion:diaEntrega', '__')
  const [mesEntrega, setMesEntrega] = useLocalStorageState('devolucion:mesEntrega', '__')
  const [anioEntrega, setAnioEntrega] = useLocalStorageState('devolucion:anioEntrega', '____')
  const [nombreEntrega, setNombreEntrega] = useLocalStorageState('devolucion:nombreEntrega', '(clic para escribir su nombre)')

  // Accesorios: checkboxes + tabla sincronizada (Paso 3)
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useLocalStorageState('devolucion:accesoriosSeleccionados', [])
  const [filasAccesorios, setFilasAccesorios] = useLocalStorageState('devolucion:filasAccesorios', [])

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

  // Cada clic sobre un accesorio agrega una fila nueva de ese tipo -- incluso
  // si ya está marcado -- para permitir varias unidades iguales (ej. 2
  // laptops) sin agregar un campo de "cantidad" ni tocar la base de datos.
  // El checkbox se queda marcado mientras exista al menos una fila de ese
  // tipo; para quitar una unidad se usa el botón de eliminar de esa fila en
  // la tabla (no el checkbox).
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
      // Con varias filas del mismo accesorio (Fase A), el checkbox solo se
      // desmarca cuando ya no queda NINGUNA fila de ese tipo -- antes se
      // desmarcaba con solo borrar una, aunque quedaran otras.
      const quedanOtras = nuevasFilas.some((f) => f.accesorioId === fila.accesorioId)
      if (!quedanOtras) {
        setAccesoriosSeleccionados((prev) => prev.filter((a) => a !== fila.accesorioId))
      }
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
        memoria_ram: memoriaRam || '',
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
      setTimeout(() => {
        setSaveStatus('idle')
        // El acta ya quedó guardada en el servidor -- se limpia el borrador
        // local para que la próxima vez que se abra "Hoja de Devolución"
        // empiece en blanco, en vez de mostrar los datos de la que ya se
        // finalizó.
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
    setMemoriaRam('16 GB')
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
      <div className="hidden md:flex justify-between items-center px-stack-lg py-4 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-30">
        <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Formulario de Retorno
        </div>
      </div>

      {/* Scrollable Content Canvas */}
      <div className="flex-1 p-4 md:p-8 custom-scrollbar relative bg-background">
        <div className="max-w-[896px] mx-auto space-y-stack-lg pb-8">
          {/* 1. Header: Official letterhead */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="h-1.5 w-full bg-primary" aria-hidden="true" />
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                  <Truck className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold leading-tight">
                    HOJA DE DEVOLUCIÓN DE EQUIPO
                  </h2>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    Departamento de Tecnologías de la Información
                  </p>
                </div>
              </div>
              <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-4 gap-y-1.5 text-sm sm:text-right">
                <dt className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Código:
                </dt>
                <dd className="font-label-bold text-label-bold text-on-surface">DEV-EQ-01</dd>
                <dt className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  Fecha Emisión:
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
                  Vigencia:
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
          </div>

          {/* Datos del Usuario */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-outline-variant bg-surface-container-low px-5 py-3.5">
              <UserRound className="h-4.5 w-4.5 text-primary" strokeWidth={2.25} aria-hidden="true" />
              <h3 className="font-label-bold text-label-bold text-on-surface uppercase tracking-wider">
                Datos del Usuario
              </h3>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Fecha de Devolución
                  </label>
                  <input
                    className={`h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                      errores.fecha ? 'border-error' : 'border-outline-variant'
                    }`}
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Responsable que Entrega
                  </label>
                  <input
                    className={`h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                      errores.responsable ? 'border-error' : 'border-outline-variant'
                    }`}
                    placeholder="Nombre completo"
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">Departamento</label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="Área o departamento"
                    className={`h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                      errores.departamento ? 'border-error' : 'border-outline-variant'
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">Puesto</label>
                  <input
                    className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    placeholder="Cargo actual"
                    type="text"
                    value={puesto}
                    onChange={(e) => setPuesto(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Recibí de
                  </label>
                  <input
                    className="h-11 w-full bg-surface-container-low text-on-surface-variant border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md cursor-not-allowed"
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
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer group py-1">
                        <input
                          checked={planta === opt}
                          onChange={() => setPlanta(opt)}
                          className="h-4.5 w-4.5 accent-[#1a1a1a]"
                          name="planta"
                          type="radio"
                        />
                        <span className="font-body-md text-body-md text-on-surface group-hover:text-on-surface transition-colors">
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
            <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container p-1">
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

          {/* Descripción de Equipo */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              modalidadPaginas === 'dos' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-outline-variant bg-surface-container-low px-5 py-3.5">
              <MonitorSmartphone className="h-4.5 w-4.5 text-primary" strokeWidth={2.25} aria-hidden="true" />
              <h3 className="font-label-bold text-label-bold text-on-surface uppercase tracking-wider">
                Descripción de Equipo
              </h3>
            </header>
            <div className="p-5 border-b border-outline-variant">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-label-bold text-on-surface">Tipo de Equipo</label>
                  <div className="flex flex-col gap-1">
                    {['Laptop', 'Escritorio'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer group py-1">
                        <input
                          checked={tipoEquipo === opt}
                          onChange={() => setTipoEquipo(opt)}
                          className="h-4.5 w-4.5 accent-[#1a1a1a]"
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
                  <div className="flex flex-col gap-1">
                    {['Nuevo', 'Usado'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer group py-1">
                        <input
                          checked={estadoEquipo === opt}
                          onChange={() => setEstadoEquipo(opt)}
                          className="h-4.5 w-4.5 accent-[#1a1a1a]"
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
                  <div className="flex flex-col gap-1">
                    {['Original', 'CLON'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer group py-1">
                        <input
                          checked={marcaEquipo === opt}
                          onChange={() => setMarcaEquipo(opt)}
                          className="h-4.5 w-4.5 accent-[#1a1a1a]"
                          name="marca"
                          type="radio"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{opt}</span>
                      </label>
                    ))}
                    {marcaEquipo === 'CLON' && (
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary mt-1"
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
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-column-gap gap-y-stack-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">Modelo</label>
                  <input
                    className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    placeholder="Ej. Latitude 5420"
                    type="text"
                    value={modeloEquipo}
                    onChange={(e) => setModeloEquipo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Número de Serie (S/N)
                  </label>
                  <input
                    className={`h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface font-mono uppercase transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                      errores.equipo ? 'border-error' : 'border-outline-variant'
                    }`}
                    placeholder="ALFANUMERICO"
                    type="text"
                    value={noSerie}
                    onChange={(e) => setNoSerie(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Nombre del Equipo
                  </label>
                  <input
                    className={`h-11 w-full bg-surface border rounded-lg px-3.5 font-body-md text-body-md text-on-surface font-mono transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                      errores.equipo ? 'border-error' : 'border-outline-variant'
                    }`}
                    placeholder="LGMX-NB-001"
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">Procesador</label>
                  <input
                    className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    placeholder="Ej. Intel Core i5 11th Gen"
                    type="text"
                    value={procesador}
                    onChange={(e) => setProcesador(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">Memoria RAM</label>
                  <input
                    className="h-11 w-full bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    placeholder="Ej. 4 GB, 8 GB, 16 GB..."
                    type="text"
                    value={memoriaRam}
                    onChange={(e) => setMemoriaRam(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-label-bold text-on-surface">
                    Almacenamiento (Disco)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={discoTipo}
                      onChange={(e) => setDiscoTipo(e.target.value)}
                      className="h-11 w-1/3 bg-surface border border-outline-variant rounded-lg px-2.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    >
                      <option value="ssd">SSD</option>
                      <option value="hdd">HDD</option>
                    </select>
                    <input
                      className="h-11 w-2/3 bg-surface border border-outline-variant rounded-lg px-3.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
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
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                {modalidadPaginas === 'una' ? (
                  <MonitorSmartphone className="h-4.5 w-4.5 text-primary" strokeWidth={2.25} aria-hidden="true" />
                ) : (
                  <Mouse className="h-4.5 w-4.5 text-primary" strokeWidth={2.25} aria-hidden="true" />
                )}
                <h3 className="font-label-bold text-label-bold text-on-surface uppercase tracking-wider">
                  {modalidadPaginas === 'una' ? 'Descripción de Equipo' : 'Accesorios Devueltos'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={agregarFilaManual}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high active:brightness-95"
                >
                  <PlusCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Agregar Fila
                </button>
                {filasAccesorios.length > 0 && (
                  <button
                    onClick={vaciarTablaAccesorios}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 font-label-bold text-label-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container active:brightness-95"
                  >
                    <ListX className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Vaciar tabla
                  </button>
                )}
              </div>
            </header>
            <div className="p-5 border-b border-outline-variant">
              <p className="mb-3 font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                Verificación Rápida
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {ACCESORIOS.map((label) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer group text-sm">
                    <input
                      checked={accesoriosSeleccionados.includes(label)}
                      onChange={() => toggleAccesorio(label)}
                      className="h-4.5 w-4.5 rounded accent-[#1a1a1a]"
                      type="checkbox"
                    />
                    <span className="font-body-md text-body-md text-on-surface transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-2.5 pl-5 pr-3 font-bold w-12">
                      No.
                    </th>
                    <th className="py-2.5 pr-3 font-bold">
                      Artículo
                    </th>
                    <th className="py-2.5 pr-3 font-bold">
                      Marca
                    </th>
                    <th className="py-2.5 pr-3 font-bold">
                      Modelo
                    </th>
                    <th className="py-2.5 pr-3 font-bold">
                      No. Serie
                    </th>
                    <th className="py-2.5 pr-3 font-bold w-32">
                      Estado
                    </th>
                    <th className="py-2.5 pr-5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filasAccesorios.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-on-surface-variant font-body-md text-body-md">
                        Marca un accesorio arriba o usa "Agregar Fila" para empezar.
                      </td>
                    </tr>
                  )}
                  {filasAccesorios.map((fila, index) => (
                    <tr
                      key={fila.id}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors group"
                    >
                      <td className="py-2 pl-5 pr-3 font-body-md text-body-md text-on-surface-variant">
                        {index + 1}
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder={fila.accesorioId === 'Otro' ? 'Especifique el artículo...' : 'Especificar...'}
                          type="text"
                          value={fila.articulo}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'articulo', e.target.value)}
                          readOnly={fila.origen === 'checkbox' && fila.accesorioId !== 'Otro'}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.marca}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'marca', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.modelo}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'modelo', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 px-1 py-1 font-body-md text-body-md font-mono transition-colors"
                          placeholder="..."
                          type="text"
                          value={fila.serie}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'serie', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={fila.estado}
                          onChange={(e) => actualizarFilaAccesorio(fila.id, 'estado', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 px-1 py-1 font-body-md text-body-md transition-colors"
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
                          className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                        >
                          <X className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Constancia de Entrega & Observaciones */}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="p-5 border-b border-outline-variant">
              <label className="font-label-bold text-label-bold text-on-surface block mb-2">
                Observaciones Generales
              </label>
              <textarea
                className="w-full bg-surface border border-outline-variant rounded-lg px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary min-h-[100px] resize-y"
                placeholder="Anote cualquier daño estético, fallas reportadas no resueltas, o información relevante sobre el equipo devuelto..."
              ></textarea>
            </div>
            <div className="p-5 md:p-6">
              <p className="font-body-md text-body-md text-on-surface leading-relaxed mb-6 md:mb-8">
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
              {/* En móvil, el grid pasa a 1 columna sin padding lateral extra
                  para que cada firma aproveche todo el ancho disponible en
                  vez de dejar un recuadro angosto con espacio muerto a los
                  costados. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                <p className="text-error font-label-sm text-label-sm mt-3 text-center">
                  Ambas firmas deben quedar confirmadas para finalizar la devolución.
                </p>
              )}
            </div>
          </section>

          {estadoActa === 'finalizado' && (
            <div className="flex items-center justify-between bg-secondary-container text-on-secondary-container rounded-lg px-4 py-3 font-label-bold text-label-bold">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" strokeWidth={2.25} />
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

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant">
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
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
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
