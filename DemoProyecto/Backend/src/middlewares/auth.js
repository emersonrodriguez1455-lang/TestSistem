const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiError')

// Verifica el JWT del header Authorization: Bearer <token>.
// Registrador y admin comparten acceso a todo excepto Auditoría, por eso la
// mayoría de rutas solo usan requireAuth; requireAdmin se reserva para
// Auditoría (Fase 4).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'No autenticado'))
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: payload.sub, role: payload.rol }
    next()
  } catch {
    next(new ApiError(401, 'Token inválido o expirado'))
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Requiere permisos de administrador'))
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
