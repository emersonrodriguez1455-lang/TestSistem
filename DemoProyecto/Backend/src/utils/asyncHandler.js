// Evita repetir try/catch en cada controlador async: cualquier rechazo de la
// promesa se envía a next(), donde lo recoge el errorHandler centralizado.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = asyncHandler
