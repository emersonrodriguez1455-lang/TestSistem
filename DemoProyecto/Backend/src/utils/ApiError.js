// Error controlado: se lanza desde controladores/servicios con un status
// HTTP explícito. `errores` es opcional y sigue el mismo formato campo->mensaje
// que ya usa el objeto `errores` del formulario en el frontend, para poder
// reutilizar el resaltado en rojo existente.
class ApiError extends Error {
  constructor(statusCode, message, errores = null) {
    super(message)
    this.statusCode = statusCode
    this.errores = errores
  }
}

module.exports = ApiError
