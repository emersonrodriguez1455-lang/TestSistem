// Compara el estado anterior de un acta (fila de BD) contra el nuevo objeto
// enviado por el frontend, y arma un JSON { campo: { antes, despues } } que
// se guardará directo en el campo "detalle" de Auditoría.
function calcularDiff(objAnterior, objNuevo) {
  const diff = {}

  Object.keys(objNuevo).forEach((key) => {
    // Evitamos comparar campos de control o que no aplican
    if (key === 'password' || key === 'accesorios' || key === 'version') return

    if (objAnterior[key] !== objNuevo[key]) {
      diff[key] = {
        antes: objAnterior[key],
        despues: objNuevo[key],
      }
    }
  })

  return diff
}

module.exports = { calcularDiff }
