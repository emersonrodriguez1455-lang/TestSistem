const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const ApiError = require('../utils/ApiError')

// Fase I: bloqueo de cuenta tras intentos fallidos. Umbral alto (10) a
// propósito -- no busca frenar a alguien que se equivocó de contraseña un
// par de veces, busca frenar un intento sostenido de adivinarla.
const MAX_INTENTOS_FALLIDOS = 10
const MINUTOS_BLOQUEO = 15

async function login(username, password) {
  if (!username || !password) {
    throw new ApiError(400, 'Usuario y contraseña son obligatorios')
  }

  const { rows } = await pool.query(
    `SELECT id, username, password_hash, nombre_completo, rol, activo,
            intentos_fallidos, bloqueado_hasta
     FROM usuarios
     WHERE username = $1`,
    [username.trim()]
  )
  const usuario = rows[0]

  // Mensaje genérico a propósito: no revelar si el usuario existe o no.
  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Usuario o contraseña incorrectos')
  }

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    throw new ApiError(423, 'Cuenta bloqueada temporalmente por varios intentos fallidos. Intenta de nuevo en unos minutos.')
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordOk) {
    const intentos = (usuario.intentos_fallidos || 0) + 1
    const seBloquea = intentos >= MAX_INTENTOS_FALLIDOS
    await pool.query(
      `UPDATE usuarios
       SET intentos_fallidos = $1,
           bloqueado_hasta = $2
       WHERE id = $3`,
      [
        seBloquea ? 0 : intentos,
        seBloquea ? new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000) : null,
        usuario.id,
      ]
    )
    throw new ApiError(401, 'Usuario o contraseña incorrectos')
  }

  // Login correcto: se resetea el contador de intentos fallidos.
  if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta) {
    await pool.query(
      'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
      [usuario.id]
    )
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
