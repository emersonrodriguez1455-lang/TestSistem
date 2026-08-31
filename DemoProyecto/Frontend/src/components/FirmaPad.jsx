import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

// --- Firma vectorial (Fase 1.2) ---
// react-signature-canvas expone toData(): los puntos crudos de cada trazo
// (sin rasterizar). En vez de exportar un PNG, se construye un <path> SVG
// real a partir de esos puntos -- así el trazo queda como vector (nítido a
// cualquier zoom) tanto en la vista previa como, ya en el backend, dentro
// del PDF (pdf-lib -> page.drawSvgPath). No se agrega ninguna dependencia
// nueva: se usa lo que signature_pad ya entrega.
function gruposDePuntosASvg(grupos) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  grupos
    .filter((g) => g.points && g.points.length > 0)
    .forEach((g) => {
      g.points.forEach((p) => {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      })
    })

  if (!Number.isFinite(minX)) return null

  const padding = 6
  // Se normalizan todas las coordenadas al origen (0,0) -- así el viewBox
  // siempre arranca en "0 0 w h" y el path se puede anclar exactamente en el
  // PDF (page.drawSvgPath ancla el (0,0) del path al punto x,y indicado; si
  // el viewBox no arrancara en 0,0 el trazo quedaría desplazado).
  const paths = grupos
    .filter((g) => g.points && g.points.length > 0)
    .map((g) => {
      const comandos = g.points.map((p, i) => {
        const x = p.x - minX + padding
        const y = p.y - minY + padding
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      return comandos.join(' ')
    })

  const w = maxX - minX + padding * 2
  const h = maxY - minY + padding * 2

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}">` +
    paths
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
      )
      .join('') +
    `</svg>`

  return svg
}

function svgATextoDataUrl(svgMarkup) {
  const base64 = btoa(unescape(encodeURIComponent(svgMarkup)))
  return `data:image/svg+xml;base64,${base64}`
}

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
      const svg = gruposDePuntosASvg(sigCanvasRef.current.toData())
      if (!svg) return
      dataUrl = svgATextoDataUrl(svg)
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
      <div className="flex flex-col items-center gap-2 border border-outline-variant rounded-lg p-4 bg-surface-container-low">
        <img src={firmaUrl} alt={`Firma de ${titulo}`} className="h-20 object-contain" />
        <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Firma confirmada
        </div>
        <button
          type="button"
          onClick={handleReiniciar}
          className="text-error font-label-sm text-label-sm underline"
        >
          Reiniciar firma
        </button>
        <div className="text-center">
          <p className="font-label-bold text-label-bold text-primary uppercase">{titulo}</p>
          {subtitulo && (
            <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitulo}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border border-outline-variant rounded-lg p-3 bg-surface-container-lowest">
      <div className="flex justify-center gap-2 mb-1 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setModo('dibujar')
            setPreviewSubida(null)
          }}
          className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${
            modo === 'dibujar' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
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
            modo === 'subir' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
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
            modo === 'historico' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
          }`}
        >
          Registro histórico
        </button>
      </div>

      {modo === 'dibujar' && (
        // touch-action: none evita que un trazo con el dedo se interprete
        // como scroll de la página en móvil (Fase 1.1).
        <div
          className="border border-dashed border-outline rounded bg-white"
          style={{ touchAction: 'none' }}
        >
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{ className: 'w-full h-32', style: { touchAction: 'none' } }}
            onEnd={() => setVacio(sigCanvasRef.current?.isEmpty() ?? true)}
          />
        </div>
      )}

      {modo === 'subir' && (
        <div className="flex flex-col items-center gap-2 py-2">
          {previewSubida ? (
            <img
              src={previewSubida}
              alt="Firma subida"
              className="h-24 object-contain border border-outline-variant rounded"
            />
          ) : (
            <label className="cursor-pointer text-secondary font-label-sm text-label-sm flex flex-col items-center gap-1 py-4">
              <span className="material-symbols-outlined">upload</span>
              Seleccionar imagen de firma
              <input type="file" accept="image/*" className="hidden" onChange={handleArchivo} />
            </label>
          )}
        </div>
      )}

      {modo === 'historico' && (
        <div className="flex flex-col gap-2 py-4 px-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
            Usa esta opción cuando el documento ya fue firmado en papel y solo se está migrando el
            registro al sistema (no hay trazo digital que capturar).
          </p>
        </div>
      )}

      <div className="flex justify-center items-center gap-3 mt-1">
        {modo === 'dibujar' && (
          <button
            type="button"
            onClick={limpiarLienzo}
            className="text-on-surface-variant font-label-sm text-label-sm underline"
          >
            Borrar trazo
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={modo !== 'historico' && vacio}
          className="px-3 py-1.5 bg-secondary text-on-secondary rounded font-label-bold text-label-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirmar firma
        </button>
      </div>
      <div className="text-center">
        <p className="font-label-bold text-label-bold text-primary uppercase">{titulo}</p>
        {subtitulo && <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitulo}</p>}
      </div>
    </div>
  )
}

export default FirmaPad
