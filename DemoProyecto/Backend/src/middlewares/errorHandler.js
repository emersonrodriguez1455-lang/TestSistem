const ApiError = require('../utils/ApiError')

// Middleware de error - SIEMPRE al final de la cadena de middlewares en app.js.
// Formato único de respuesta para que el frontend (services/api.js) siempre
// pueda leer `data.message`, y opcionalmente `data.errores` campo por campo.
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errores ? { errores: err.errores } : {}),
    })
  }

  // Error no controlado (bug, fallo de BD, etc.) - no exponer detalles internos
  console.error('Error no controlado:', err)
  return res.status(500).json({ message: 'Error interno del servidor' })
}

module.exports = errorHandler
