const pool = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const ApiError = require('../utils/ApiError')
const { verificarPasswordActual } = require('../services/authService')
const { generarExcelAuditoria } = require('../services/excelService')

// Cruza usuario_id con su tabla para no exponer IDs crudos al frontend.
// Para el nombre del acta afectada, se prefiere el snapshot congelado en
// detalle._contexto (guardado en el momento exacto de la acción); solo se
// usa el JOIN en vivo como respaldo para registros creados antes de este fix,
// que no tienen ese snapshot.
async function obtenerLogsAuditoria() {
  const query = `
    SELECT
      a.id,
      a.accion,
      a.fecha,
      a.detalle,
      u.username AS usuario,
      acta.responsable AS acta_responsable_actual,
      acta.nombre_equipo AS acta_nombre_equipo_actual
    FROM auditoria a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    LEFT JOIN actas_devolucion acta ON a.registro_id = acta.id
    ORDER BY a.fecha DESC
  `

  const { rows } = await pool.query(query)

  return rows.map((row) => {
    const detalleCompleto = row.detalle || {}
    const { _contexto, ...detalle } = detalleCompleto

    return {
      id: row.id,
      accion: row.accion,
      fecha: row.fecha,
      usuario: row.usuario,
      detalle,
      acta_responsable: _contexto?.responsable ?? row.acta_responsable_actual,
      nombre_equipo: _contexto?.nombre_equipo ?? row.acta_nombre_equipo_actual,
    }
  })
}

const obtenerAuditoria = asyncHandler(async (req, res) => {
  const resultado = await obtenerLogsAuditoria()
  res.json(resultado)
})

const exportarExcel = asyncHandler(async (req, res) => {
  // Requiere contraseña (Fase 8), igual que en Historial/actasController.
  const { password } = req.body
  const authValid = await verificarPasswordActual(req.user.id, password)
  if (!authValid) throw new ApiError(401, 'Contraseña incorrecta')

  const logs = await obtenerLogsAuditoria()
  const buffer = await generarExcelAuditoria(logs)

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=Auditoria.xlsx')
  res.end(Buffer.from(buffer))
})

module.exports = { obtenerAuditoria, exportarExcel }
