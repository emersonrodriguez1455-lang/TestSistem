const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const ApiError = require('../utils/ApiError')

async function login(username, password) {
  if (!username || !password) {
    throw new ApiError(400, 'Usuario y contraseña son obligatorios')
  }

  const { rows } = await pool.query(
    `SELECT id, username, password_hash, nombre_completo, rol, activo
     FROM usuarios
     WHERE username = $1`,
    [username.trim()]
  )
  const usuario = rows[0]

  // Mensaje genérico a propósito: no revelar si el usuario existe o no.
  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Usuario o contraseña incorrectos')
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordOk) {
    throw new ApiError(401, 'Usuario o contraseña incorrectos')
  }

  const token = jwt.sign(
    { sub: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

  return {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      name: usuario.nombre_completo,
      role: usuario.rol, // 'admin' | 'registrador'
    },
  }
}

// Reutilizable en Fase 2 para exigir contraseña actual antes de editar/eliminar
// una acta. Incluye límite de intentos simple vía la tabla de usuarios se deja
// para cuando se implemente ese endpoint (evita construir algo que no se usa aún).
async function verificarPasswordActual(usuarioId, password) {
  const { rows } = await pool.query(
    'SELECT password_hash FROM usuarios WHERE id = $1',
    [usuarioId]
  )
  const usuario = rows[0]
  if (!usuario) return false
  return bcrypt.compare(password, usuario.password_hash)
}

module.exports = { login, verificarPasswordActual }
