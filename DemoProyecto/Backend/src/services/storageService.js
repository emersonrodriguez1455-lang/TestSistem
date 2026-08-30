const { createClient } = require('@supabase/supabase-js')

// Cliente con la clave de servicio (SUPABASE_SECRET_KEY) que ya existe en el
// .env: permite subir archivos al bucket sin pasar por reglas de usuario.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const BUCKET = 'firmas'

// Recibe un data URL tipo "data:image/png;base64,AAAA..." y sube solo la
// parte binaria. Se guarda como <actaId>/<tipo>-<timestamp>.png para que
// cada re-firma quede como un archivo nuevo (no se sobreescribe el anterior,
// útil si algún día se quiere ver el historial de firmas).
async function subirFirma(actaId, tipo, dataUrlBase64) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrlBase64 || '')
  if (!match) {
    throw new Error('La imagen de firma no tiene un formato válido (se espera un data URL base64)')
  }
  const [, mimeType, base64] = match
  const buffer = Buffer.from(base64, 'base64')
  const extension = mimeType.split('/')[1] || 'png'
  const ruta = `${actaId}/${tipo}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, buffer, {
    contentType: mimeType,
    upsert: false,
  })
  if (error) throw new Error(`No se pudo subir la firma: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
  return data.publicUrl
}

module.exports = { subirFirma }
