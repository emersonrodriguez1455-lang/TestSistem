import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

// Captura una firma de dos formas (dibujada en pantalla o subida como
// imagen), muestra una vista previa, y solo la entrega al padre cuando el
// usuario pulsa "Confirmar firma" — antes de eso nada queda guardado.
// Una vez confirmada, se bloquea (solo lectura) hasta que se pulse
// "Reiniciar firma", que el padre decide si requiere contraseña o no.
function FirmaPad({ titulo, subtitulo, firmaUrl, onConfirmar, onReiniciar }) {
  const sigCanvasRef = useRef(null)
  const [modo, setModo] = useState('dibujar') // 'dibujar' | 'subir'
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
    let base64 = null
    if (modo === 'dibujar') {
      if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return
      base64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png')
    } else {
      if (!previewSubida) return
      base64 = previewSubida
    }
    onConfirmar(base64)
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
      <div className="flex justify-center gap-2 mb-1">
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
      </div>

      {modo === 'dibujar' ? (
        <div className="border border-dashed border-outline rounded bg-white">
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{ className: 'w-full h-32' }}
            onEnd={() => setVacio(sigCanvasRef.current?.isEmpty() ?? true)}
          />
        </div>
      ) : (
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
          disabled={vacio}
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
