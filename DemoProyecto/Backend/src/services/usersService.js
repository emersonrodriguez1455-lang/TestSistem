const bcrypt = require('bcrypt')
const pool = require('../config/db')
const ApiError = require('../utils/ApiError')

const SALT_ROUNDS = 12

// Nunca se devuelve password_hash, intentos_fallidos ni bloqueado_hasta al
// frontend -- son detalles internos de auth, no algo que la pantalla de
// Usuarios necesite mostrar ni pueda editar directamente.
const COLUMNAS_PUBLICAS = `id, username, nombre_completo, rol, activo, created_at`

async function contarAdminsActivos(excluirId = null) {
  const params = excluirId ? [excluirId] : []
  const condicionExtra = excluirId ? 'AND id <> $1' : ''
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'admin' AND activo = TRUE ${condicionExtra}`,
    params
  )
  return rows[0].total
}

async function listarUsuarios() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY created_at DESC`
  )
  return rows
}

async function obtenerUsuarioPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

async function crearUsuario({ username, password, nombre_completo, rol }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING ${COLUMNAS_PUBLICAS}`,
      [username.trim(), passwordHash, nombre_completo.trim(), rol]
    )
    return rows[0]
  } catch (err) {
    // 23505 = unique_violation (username duplicado)
    if (err.code === '23505') {
      throw new ApiError(409, 'Ya existe un usuario con ese nombre de usuario')
    }
    throw err
  }
}

async function editarUsuario(id, cambios, solicitanteId) {
  const usuario = await obtenerUsuarioPorId(id)
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado')

  const esUnoMismo = String(id) === String(solicitanteId)

  // Un admin no puede quitarse a sí mismo el rol de admin ni desactivarse:
  // evita que el sistema se quede sin ningún admin activo por accidente.
  if (esUnoMismo) {
    if (cambios.rol && cambios.rol !== 'admin') {
      throw new ApiError(400, 'No puedes cambiar tu propio rol de administrador')
    }
    if (cambios.activo === false) {
      throw new ApiError(400, 'No puedes desactivar tu propia cuenta')
    }
  }

  // Si se le va a quitar el rol admin o desactivar a un admin, verificar que
  // quede al menos otro admin activo en el sistema.
  const perderiaAdmin =
    usuario.rol === 'admin' &&
    ((cambios.rol && cambios.rol !== 'admin') || cambios.activo === false)

  if (perderiaAdmin) {
    const otrosAdmins = await contarAdminsActivos(id)
    if (otrosAdmins < 1) {
      throw new ApiError(400, 'Debe quedar al menos un administrador activo en el sistema')
    }
  }

  const campos = []
  const valores = []
  let i = 1

  if (cambios.nombre_completo !== undefined) {
    campos.push(`nombre_completo = $${i++}`)
    valores.push(cambios.nombre_completo.trim())
  }
  if (cambios.rol !== undefined) {
    campos.push(`rol = $${i++}`)
    valores.push(cambios.rol)
  }
  if (cambios.activo !== undefined) {
    campos.push(`activo = $${i++}`)
    valores.push(cambios.activo)
  }
  if (cambios.password) {
    const passwordHash = await bcrypt.hash(cambios.password, SALT_ROUNDS)
    campos.push(`password_hash = $${i++}`)
    valores.push(passwordHash)
    // Cambiar la contraseña resetea cualquier bloqueo por intentos fallidos.
    campos.push(`intentos_fallidos = 0`)
    campos.push(`bloqueado_hasta = NULL`)
  }

  if (campos.length === 0) {
    return usuario
  }

  valores.push(id)
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${i} RETURNING ${COLUMNAS_PUBLICAS}`,
    valores
  )
  return rows[0]
}

// Soft delete: se desactiva en vez de borrar la fila, porque `usuarios.id`
// está referenciado desde `auditoria.usuario_id` y `actas_devolucion` (quién
// creó/editó) -- borrar físicamente rompería ese historial.
async function eliminarUsuario(id, solicitanteId) {
  const usuario = await obtenerUsuarioPorId(id)
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado')

  if (String(id) === String(solicitanteId)) {
    throw new ApiError(400, 'No puedes eliminar tu propia cuenta')
  }

  if (usuario.rol === 'admin') {
    const otrosAdmins = await contarAdminsActivos(id)
    if (otrosAdmins < 1) {
      throw new ApiError(400, 'Debe quedar al menos un administrador activo en el sistema')
    }
  }

  const { rows } = await pool.query(
    `UPDATE usuarios SET activo = FALSE WHERE id = $1 RETURNING ${COLUMNAS_PUBLICAS}`,
    [id]
  )
  return rows[0]
}

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
}
