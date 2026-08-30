const pool = require('../config/db')

// Helper interno que se inyecta directamente en las transacciones de las
// actas: si se le pasa el client transaccional de la ruta, un fallo aquí
// revierte también el cambio del CRUD (o viceversa). Si no hay client
// (ej. eliminarActa, que no abre transacción explícita), usa el pool directo.
// Helper interno que se inyecta directamente en las transacciones de las
// actas: si se le pasa el client transaccional de la ruta, un fallo aquí
// revierte también el cambio del CRUD (o viceversa). Si no hay client
// (ej. eliminarActa, que no abre transacción explícita), usa el pool directo.
//
// `contexto` guarda una "foto" del identificador del acta (responsable,
// nombre_equipo) en el momento exacto de la acción. Sin esto, la pantalla
// de Auditoría tenía que cruzar en vivo contra la tabla de actas, y un
// registro viejo de creación terminaba mostrando el nombre actualizado
// después de una edición posterior — como si la historia cambiara sola.
async function registrarAuditoria({ client, usuarioId, accion, registroId, detalle, contexto }) {
  const db = client || pool

  const detalleCompleto = contexto ? { ...(detalle || {}), _contexto: contexto } : detalle

  const query = `
    INSERT INTO auditoria (usuario_id, accion, registro_id, detalle)
    VALUES ($1, $2, $3, $4)
  `

  const valores = [
    usuarioId,
    accion,
    registroId,
    detalleCompleto ? JSON.stringify(detalleCompleto) : null,
  ]

  await db.query(query, valores)
}

module.exports = { registrarAuditoria }
