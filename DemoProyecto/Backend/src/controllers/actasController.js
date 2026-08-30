const pool = require('../config/db')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { verificarPasswordActual } = require('../services/authService')
const { calcularDiff } = require('../utils/diffUtil')
const { registrarAuditoria } = require('../services/auditoriaService')
const { generarPdfActa } = require('../services/pdfService')
const { generarExcelActas } = require('../services/excelService')
const { subirFirma } = require('../services/storageService')

// Un acta no tiene sentido sin sus accesorios: ambas entidades se gestionan
// bajo una misma transacción SQL para garantizar la integridad de los datos.

const crearActa = asyncHandler(async (req, res) => {
  const { accesorios, firma_entrega_base64, firma_recibe_base64, ...datosActa } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Insertar el acta principal
    const insertActaQuery = `
      INSERT INTO actas_devolucion (
        fecha, responsable, departamento, puesto, planta, modalidad,
        tipo_equipo, marca, modelo, serie, nombre_equipo, procesador,
        memoria_ram, disco_duro, observaciones, estado_equipo, usuario_id, borrador
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id;
    `
    const valoresActa = [
      datosActa.fecha, datosActa.responsable, datosActa.departamento, datosActa.puesto,
      datosActa.planta, datosActa.modalidad, datosActa.tipo_equipo, datosActa.marca,
      datosActa.modelo, datosActa.serie, datosActa.nombre_equipo, datosActa.procesador,
      datosActa.memoria_ram, datosActa.disco_duro, datosActa.observaciones,
      datosActa.estado_equipo, req.user.id, datosActa.borrador || false,
    ]

    const resActa = await client.query(insertActaQuery, valoresActa)
    const actaId = resActa.rows[0].id

    // 1.5. Firmas capturadas en el formulario (opcionales). Se suben
    // recién aquí porque la ruta del archivo en Storage usa el actaId,
    // que no existe hasta que se inserta la fila principal.
    if (firma_entrega_base64) {
      const url = await subirFirma(actaId, 'entrega', firma_entrega_base64)
      await client.query(
        'UPDATE actas_devolucion SET firma_entrega_url = $1, firma_entrega_confirmada = true WHERE id = $2',
        [url, actaId]
      )
    }
    if (firma_recibe_base64) {
      const url = await subirFirma(actaId, 'recibe', firma_recibe_base64)
      await client.query(
        'UPDATE actas_devolucion SET firma_recibe_url = $1, firma_recibe_confirmada = true WHERE id = $2',
        [url, actaId]
      )
    }

    // 2. Insertar accesorios (Fase 3)
    if (accesorios && accesorios.length > 0) {
      const insertAccesoriosQuery = `
        INSERT INTO accesorios (acta_id, articulo, marca, modelo, serie, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
      for (const acc of accesorios) {
        await client.query(insertAccesoriosQuery, [
          actaId, acc.articulo, acc.marca, acc.modelo, acc.serie, acc.estado,
        ])
      }
    }

    // 3. Registrar auditoría (Fase 4) dentro de la misma transacción: si
    // falla, se revierte también la creación del acta.
    await registrarAuditoria({
      client,
      usuarioId: req.user.id,
      accion: 'CREAR',
      registroId: actaId,
      detalle: { borrador: datosActa.borrador },
      contexto: { responsable: datosActa.responsable, nombre_equipo: datosActa.nombre_equipo },
    })

    await client.query('COMMIT')

    res.status(201).json({ message: 'Acta creada exitosamente', id: actaId })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

const listarActas = asyncHandler(async (req, res) => {
  const { pagina = 1, limite = 10, fecha, responsable, planta } = req.query
  const offset = (pagina - 1) * limite

  let query = `SELECT * FROM actas_devolucion WHERE eliminado = false`
  const valores = []
  let contador = 1

  if (fecha) { query += ` AND fecha = $${contador++}`; valores.push(fecha) }
  if (responsable) { query += ` AND responsable ILIKE $${contador++}`; valores.push(`%${responsable}%`) }
  if (planta) { query += ` AND planta = $${contador++}`; valores.push(planta) }

  query += ` ORDER BY fecha DESC LIMIT $${contador++} OFFSET $${contador}`
  valores.push(limite, offset)

  const { rows } = await pool.query(query, valores)

  // Query separada para el total de registros (paginación)
  const countRes = await pool.query(`SELECT COUNT(*) FROM actas_devolucion WHERE eliminado = false`)

  res.json({
    data: rows,
    total: parseInt(countRes.rows[0].count, 10),
    pagina: parseInt(pagina, 10),
    totalPaginas: Math.ceil(countRes.rows[0].count / limite),
  })
})

const obtenerActa = asyncHandler(async (req, res) => {
  const actaRes = await pool.query('SELECT * FROM actas_devolucion WHERE id = $1 AND eliminado = false', [req.params.id])
  if (actaRes.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')

  const accRes = await pool.query('SELECT * FROM accesorios WHERE acta_id = $1', [req.params.id])

  const acta = actaRes.rows[0]
  acta.accesorios = accRes.rows

  res.json(acta)
})

const editarActa = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { password, accesorios, ...nuevosDatos } = req.body
  const client = await pool.connect()

  try {
    // 1. Validar contraseña obligatoria
    const authValid = await verificarPasswordActual(req.user.id, password)
    if (!authValid) throw new ApiError(401, 'Contraseña incorrecta')

    await client.query('BEGIN')

    // 2. Obtener datos actuales para el diff
    const actaAnteriorRes = await client.query('SELECT * FROM actas_devolucion WHERE id = $1', [id])
    if (actaAnteriorRes.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')
    const actaAnterior = actaAnteriorRes.rows[0]

    // 3. Actualizar campos dinámicamente
    const campos = Object.keys(nuevosDatos)
    const valores = Object.values(nuevosDatos)

    const setClause = campos.map((campo, index) => `${campo} = $${index + 1}`).join(', ')
    const updateQuery = `UPDATE actas_devolucion SET ${setClause} WHERE id = $${campos.length + 1}`

    await client.query(updateQuery, [...valores, id])

    // 4. Reemplazo destructivo de accesorios (Fase 3)
    await client.query('DELETE FROM accesorios WHERE acta_id = $1', [id])

    if (accesorios && accesorios.length > 0) {
      const insertAccQuery = `INSERT INTO accesorios (acta_id, articulo, marca, modelo, serie, estado) VALUES ($1, $2, $3, $4, $5, $6)`
      for (const acc of accesorios) {
        await client.query(insertAccQuery, [id, acc.articulo, acc.marca, acc.modelo, acc.serie, acc.estado])
      }
    }

    // 5. Calcular diff y registrar auditoría (Fase 4), solo si hubo cambios
    // reales en los campos del acta o se tocaron los accesorios.
    const diferencias = calcularDiff(actaAnterior, nuevosDatos)
    if (Object.keys(diferencias).length > 0 || accesorios) {
      await registrarAuditoria({
        client,
        usuarioId: req.user.id,
        accion: 'EDITAR',
        registroId: id,
        detalle: diferencias,
        contexto: {
          responsable: nuevosDatos.responsable ?? actaAnterior.responsable,
          nombre_equipo: nuevosDatos.nombre_equipo ?? actaAnterior.nombre_equipo,
        },
      })
    }

    await client.query('COMMIT')

    res.json({ message: 'Acta actualizada correctamente' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

const eliminarActa = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { password } = req.body

  const authValid = await verificarPasswordActual(req.user.id, password)
  if (!authValid) throw new ApiError(401, 'Contraseña incorrecta')

  const result = await pool.query('UPDATE actas_devolucion SET eliminado = true WHERE id = $1 RETURNING *', [id])
  if (result.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')
  const actaEliminada = result.rows[0]

  // Aquí no se usa transacción explícita (Fase 2), así que se usa el pool directo.
  await registrarAuditoria({
    client: null,
    usuarioId: req.user.id,
    accion: 'ELIMINAR',
    registroId: id,
    detalle: { motivo: 'Eliminado lógico' },
    contexto: { responsable: actaEliminada.responsable, nombre_equipo: actaEliminada.nombre_equipo },
  })

  res.json({ message: 'Acta eliminada lógicamente' })
})

const generarPdf = asyncHandler(async (req, res) => {
  const { id } = req.params

  // 1. Obtener acta con sus accesorios cruzados
  const actaRes = await pool.query('SELECT * FROM actas_devolucion WHERE id = $1 AND eliminado = false', [id])
  if (actaRes.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')

  const accRes = await pool.query('SELECT * FROM accesorios WHERE acta_id = $1', [id])
  const acta = actaRes.rows[0]
  acta.accesorios = accRes.rows

  // Permite sobreescribir la plantilla vía query string si el usuario la cambia
  // en el front (?plantilla=una_hoja)
  if (req.query.plantilla) {
    acta.modalidad = req.query.plantilla
  }

  // 2. Generar Buffer PDF
  const pdfBytes = await generarPdfActa(acta)

  // 3. Enviar headers HTTP para visualización/descarga
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename=Acta_Devolucion_${id}.pdf`)
  res.setHeader('Content-Length', pdfBytes.length)

  res.end(Buffer.from(pdfBytes))
})

const exportarExcel = asyncHandler(async (req, res) => {
  // Requiere contraseña (Fase 8), igual que eliminarActa/editarActa.
  const { password } = req.body
  const authValid = await verificarPasswordActual(req.user.id, password)
  if (!authValid) throw new ApiError(401, 'Contraseña incorrecta')

  const { rows } = await pool.query(
    'SELECT * FROM actas_devolucion WHERE eliminado = false ORDER BY fecha DESC'
  )

  const buffer = await generarExcelActas(rows)

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=Historial_Actas.xlsx')
  res.end(Buffer.from(buffer))
})

const TIPOS_FIRMA_VALIDOS = ['entrega', 'recibe']

const guardarFirma = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { tipo, imagen_base64 } = req.body

  if (!TIPOS_FIRMA_VALIDOS.includes(tipo)) {
    throw new ApiError(400, 'Tipo de firma inválido')
  }
  if (!imagen_base64) {
    throw new ApiError(400, 'Falta la imagen de la firma')
  }

  const actaRes = await pool.query('SELECT * FROM actas_devolucion WHERE id = $1 AND eliminado = false', [id])
  if (actaRes.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')
  const acta = actaRes.rows[0]

  const columnaConfirmada = tipo === 'entrega' ? 'firma_entrega_confirmada' : 'firma_recibe_confirmada'
  if (acta[columnaConfirmada]) {
    throw new ApiError(409, 'Esta firma ya está confirmada. Usa "Reiniciar firma" antes de volver a firmar.')
  }

  const url = await subirFirma(id, tipo, imagen_base64)
  const columnaUrl = tipo === 'entrega' ? 'firma_entrega_url' : 'firma_recibe_url'

  await pool.query(
    `UPDATE actas_devolucion SET ${columnaUrl} = $1, ${columnaConfirmada} = true WHERE id = $2`,
    [url, id]
  )

  await registrarAuditoria({
    client: null,
    usuarioId: req.user.id,
    accion: 'FIRMAR',
    registroId: id,
    detalle: { tipo },
    contexto: { responsable: acta.responsable, nombre_equipo: acta.nombre_equipo },
  })

  res.json({ message: 'Firma guardada y confirmada', url })
})

const reiniciarFirma = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { tipo, password } = req.body

  if (!TIPOS_FIRMA_VALIDOS.includes(tipo)) {
    throw new ApiError(400, 'Tipo de firma inválido')
  }

  const actaRes = await pool.query('SELECT * FROM actas_devolucion WHERE id = $1 AND eliminado = false', [id])
  if (actaRes.rowCount === 0) throw new ApiError(404, 'Acta no encontrada')
  const acta = actaRes.rows[0]

  const columnaConfirmada = tipo === 'entrega' ? 'firma_entrega_confirmada' : 'firma_recibe_confirmada'
  const columnaUrl = tipo === 'entrega' ? 'firma_entrega_url' : 'firma_recibe_url'

  // Una firma ya confirmada es un dato "sensible" del acta (evidencia de
  // entrega/recepción): borrarla exige la misma confirmación de contraseña
  // que editar o eliminar un acta completa, para que no cualquiera con
  // sesión abierta pueda hacerlo con un solo clic.
  if (acta[columnaConfirmada]) {
    const authValid = await verificarPasswordActual(req.user.id, password)
    if (!authValid) throw new ApiError(401, 'Contraseña incorrecta')
  }

  await pool.query(
    `UPDATE actas_devolucion SET ${columnaUrl} = NULL, ${columnaConfirmada} = false WHERE id = $1`,
    [id]
  )

  await registrarAuditoria({
    client: null,
    usuarioId: req.user.id,
    accion: 'REINICIAR_FIRMA',
    registroId: id,
    detalle: { tipo },
    contexto: { responsable: acta.responsable, nombre_equipo: acta.nombre_equipo },
  })

  res.json({ message: 'Firma reiniciada' })
})

module.exports = {
  crearActa,
  listarActas,
  obtenerActa,
  editarActa,
  eliminarActa,
  generarPdf,
  exportarExcel,
  guardarFirma,
  reiniciarFirma,
}
