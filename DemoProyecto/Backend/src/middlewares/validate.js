const ApiError = require('../utils/ApiError')

// Fase D.5: validación de esquema de entrada. Rechaza el request ANTES de
// tocar la base de datos si algún campo tiene el tipo equivocado o falta
// uno obligatorio, con un mensaje claro por campo para el frontend -- en
// vez de que el error salga recién al fallar la query SQL (o peor, no
// fallar y guardar un dato con forma inesperada).
function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body)
    if (!resultado.success) {
      const errores = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      }))
      const error = new ApiError(400, 'Datos inválidos')
      error.errores = errores
      return next(error)
    }
    // Se reemplaza req.body por la versión ya parseada/tipada por zod
    // (ej. strings recortadas, números convertidos), para que el resto del
    // controller trabaje siempre con datos consistentes.
    req.body = resultado.data
    next()
  }
}

module.exports = validate
