import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle2, Upload } from 'lucide-react'

// --- Firma "Registro histórico / firmado en papel" (Fase 1.3) ---
// Sin campo de nota (se quitó a pedido -- solo se confirma, sin texto
// personalizado): genera siempre la misma leyenda fija como imagen (PNG),
// para reutilizar el mismo pipeline de subida/embebido que las otras dos
// opciones, sin tocar backend ni base de datos.
function notaHistoricaAPng() {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 120
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#9e9e9e'
  ctx.setLineDash([6, 4])
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)
  ctx.fillStyle = '#333333'
  ctx.font = 'italic 20px serif'
  ctx.textAlign = 'center'
  ctx.fillText('Firmado en documento físico', canvas.width / 2, 55)
  ctx.font = '14px sans-serif'
  ctx.fillStyle = '#666666'
  ctx.fillText('Registro migrado / archivado en papel', canvas.width / 2, 85)
  return canvas.toDataURL('image/png')
}

// Encabezado del bloque de firma.
// CAMBIO DE DISEÑO: el título va ARRIBA del recuadro (antes iba debajo).
// Un rótulo que aparece después del control obliga a leer hacia atrás para
// saber qué se está firmando; arriba funciona como etiqueta del campo, igual
// que el resto del formulario.
function EncabezadoFirma({ titulo, subtitulo }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <p className="font-label-bold text-label-bold text-on-surface">{titulo}</p>
      {subtitulo && (
        <p className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">{subtitulo}</p>
      )}
    </div>
  )
}

// Captura una firma de tres formas (dibujada como vector, subida como
// imagen, o marcada como registro histórico/firmado en papel), muestra una
// vista previa, y solo la entrega al padre cuando el usuario pulsa
// "Confirmar firma" — antes de eso nada queda guardado. Una vez confirmada,
// se bloquea (solo lectura) hasta que se pulse "Reiniciar firma", que el
// padre decide si requiere contraseña o no.
function FirmaPad({ titulo, subtitulo, firmaUrl, onConfirmar, onReiniciar }) {
  const sigCanvasRef = useRef(null)
  const [modo, setModo] = useState('dibujar') // 'dibujar' | 'subir' | 'historico'
  const [previewSubida, setPreviewSubida] = useState(null)
  const [vacio, setVacio] = useState(true)

  function limpiarLienzo() {
    sigCanvasRef.current?.clear()
    setVacio(true)
  }

  function handleArchivo(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewSubida(reader.result)
      setVacio(false)
    }
    reader.readAsDataURL(archivo)
  }

  function handleConfirmar() {
    let dataUrl = null
    if (modo === 'dibujar') {
      if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return
      // Se rasteriza el trazo directamente como PNG (antes se exportaba
      // como SVG vectorial, pero Supabase Storage no lo está sirviendo bien).
      const canvas = sigCanvasRef.current.getTrimmedCanvas
        ? sigCanvasRef.current.getTrimmedCanvas()
        : sigCanvasRef.current.getCanvas()
      dataUrl = canvas.toDataURL('image/png')
    } else if (modo === 'subir') {
      if (!previewSubida) return
      dataUrl = previewSubida
    } else {
      dataUrl = notaHistoricaAPng()
    }
    onConfirmar(dataUrl)
  }

  function handleReiniciar() {
    limpiarLienzo()
    setPreviewSubida(null)
    setVacio(true)
    onReiniciar()
  }

  if (firmaUrl) {
    return (
      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
        <EncabezadoFirma titulo={titulo} subtitulo={subtitulo} />
        <div className="grid aspect-[5/2] w-full place-items-center rounded-lg border border-outline-variant bg-surface-container-low p-2">
          <img src={firmaUrl} alt={`Firma de ${titulo}`} className="max-h-full max-w-full object-contain" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-on-surface" strokeWidth={2.25} />
            Firma confirmada
          </div>
          <button
            type="button"
            onClick={handleReiniciar}
            className="rounded-md px-2 py-1 font-label-sm text-label-sm text-on-surface-variant underline-offset-2 transition-colors hover:text-error hover:underline"
          >
            Reiniciar firma
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
      <EncabezadoFirma titulo={titulo} subtitulo={subtitulo} />

      <div className="flex justify-center gap-1 mb-3 flex-wrap rounded-lg bg-surface-container p-1">
        <button
          type="button"
          onClick={() => {
            setModo('dibujar')
            setPreviewSubida(null)
          }}
          className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${
            modo === 'dibujar' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Dibujar
        </button>
        <button
          type="button"
          onClick={() => {
            setModo('subir')
            limpiarLienzo()
          }}
          className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${
            modo === 'subir' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Subir imagen
        </button>
        <button
          type="button"
          onClick={() => {
            setModo('historico')
            limpiarLienzo()
            setPreviewSubida(null)
          }}
          className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${
            modo === 'historico' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Registro histórico
        </button>
      </div>

      {modo === 'dibujar' && (
        // touch-action: none evita que un trazo con el dedo se interprete
        // como scroll de la página en móvil (Fase 1.1).
        <div
          className="grid aspect-[5/2] w-full place-items-center overflow-hidden rounded-lg border border-dashed border-outline bg-surface"
          style={{ touchAction: 'none' }}
        >
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{ className: 'w-full h-full', style: { touchAction: 'none' } }}
            onEnd={() => setVacio(sigCanvasRef.current?.isEmpty() ?? true)}
          />
        </div>
      )}

      {modo === 'subir' && (
        <div className="grid aspect-[5/2] w-full place-items-center rounded-lg border border-dashed border-outline bg-surface">
          {previewSubida ? (
            <img
              src={previewSubida}
              alt="Firma subida"
              className="max-h-full max-w-full object-contain p-2"
            />
          ) : (
            <label className="cursor-pointer text-on-surface-variant font-label-sm text-label-sm flex flex-col items-center gap-1.5 transition-colors hover:text-on-surface">
              <Upload className="h-5 w-5" strokeWidth={2} />
              Seleccionar imagen de firma
              <input type="file" accept="image/*" className="hidden" onChange={handleArchivo} />
            </label>
          )}
        </div>
      )}

      {modo === 'historico' && (
        <div className="grid aspect-[5/2] w-full place-items-center rounded-lg border border-dashed border-outline bg-surface px-4">
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
            Usa esta opción cuando el documento ya fue firmado en papel y solo se está migrando el
            registro al sistema (no hay trazo digital que capturar).
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {modo === 'dibujar' ? (
          <button
            type="button"
            onClick={limpiarLienzo}
            className="rounded-md px-2 py-1 font-label-sm text-label-sm text-on-surface-variant underline-offset-2 transition-colors hover:text-error hover:underline"
          >
            Borrar trazo
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={modo !== 'historico' && vacio}
          className="rounded-lg bg-surface-container-high px-3 py-1.5 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-highest active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirmar firma
        </button>
      </div>
    </div>
  )
}

export default FirmaPad
