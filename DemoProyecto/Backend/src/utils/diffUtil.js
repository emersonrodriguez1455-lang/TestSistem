// Compara el estado anterior de un acta (fila de BD) contra el nuevo objeto
// enviado por el frontend, y arma un JSON { campo: { anterior, nuevo } } que
// se guardará directo en el campo "detalle" de Auditoría (Fase 4).
function calcularDiff(objAnterior, objNuevo) {
  const diff = {}

  Object.keys(objNuevo).forEach((key) => {
    // Evitamos comparar campos de control o que no aplican
    if (key === 'password' || key === 'accesorios') return

    if (objAnterior[key] !== objNuevo[key]) {
      diff[key] = {
        anterior: objAnterior[key],
        nuevo: objNuevo[key],
      }
    }
  })

  return diff
}

module.exports = { calcularDiff }
