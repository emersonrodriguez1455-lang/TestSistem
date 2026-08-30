const ExcelJS = require('exceljs')

// Encabezados legibles para las columnas del acta. Se define aparte (no se
// puede importar el NOMBRES_CAMPO de Auditoria.jsx: es un archivo del
// frontend, en otro proyecto/runtime) pero mantiene los mismos nombres para
// que ambos lados hablen igual.
const COLUMNAS_ACTA = [
  { header: 'ID', key: 'id', width: 8 },
  { header: 'Fecha', key: 'fecha', width: 14 },
  { header: 'Responsable', key: 'responsable', width: 24 },
  { header: 'Departamento', key: 'departamento', width: 20 },
  { header: 'Puesto', key: 'puesto', width: 18 },
  { header: 'Planta', key: 'planta', width: 12 },
  { header: 'Modalidad', key: 'modalidad', width: 12 },
  { header: 'Tipo de equipo', key: 'tipo_equipo', width: 16 },
  { header: 'Marca', key: 'marca', width: 14 },
  { header: 'Modelo', key: 'modelo', width: 16 },
  { header: 'No. Serie', key: 'serie', width: 18 },
  { header: 'Nombre del equipo', key: 'nombre_equipo', width: 18 },
  { header: 'Procesador', key: 'procesador', width: 22 },
  { header: 'Memoria RAM', key: 'memoria_ram', width: 14 },
  { header: 'Disco duro', key: 'disco_duro', width: 16 },
  { header: 'Estado del equipo', key: 'estado_equipo', width: 16 },
  { header: 'Observaciones', key: 'observaciones', width: 30 },
]

function formatearFecha(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('es-GT')
}

async function generarExcelActas(actas = []) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AGROINDUSTRIA LEGUMEX, S.A.'
  workbook.created = new Date()

  const hoja = workbook.addWorksheet('Historial de Actas')
  hoja.columns = COLUMNAS_ACTA

  hoja.getRow(1).font = { bold: true }
  hoja.getRow(1).alignment = { vertical: 'middle' }

  actas.forEach((acta) => {
    hoja.addRow({ ...acta, fecha: formatearFecha(acta.fecha) })
  })

  return workbook.xlsx.writeBuffer()
}

const COLUMNAS_AUDITORIA = [
  { header: 'Fecha', key: 'fecha', width: 20 },
  { header: 'Usuario', key: 'usuario', width: 20 },
  { header: 'Acción', key: 'accion', width: 14 },
  { header: 'Acta afectada', key: 'acta_afectada', width: 24 },
  { header: 'Campo', key: 'campo', width: 18 },
  { header: 'Valor anterior', key: 'valor_anterior', width: 26 },
  { header: 'Valor nuevo', key: 'valor_nuevo', width: 26 },
]

function formatearFechaHora(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString('es-GT')
}

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === '') return 'vacío'
  return String(valor)
}

// Un log de auditoría puede tener varios campos modificados dentro de
// `detalle` ({ campo: { anterior, nuevo } }); se genera una fila por cada
// campo para que "valor anterior" / "valor nuevo" queden explícitos y no se
// mezclen distintos cambios en una sola celda.
async function generarExcelAuditoria(logs = []) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AGROINDUSTRIA LEGUMEX, S.A.'
  workbook.created = new Date()

  const hoja = workbook.addWorksheet('Auditoría')
  hoja.columns = COLUMNAS_AUDITORIA
  hoja.getRow(1).font = { bold: true }

  logs.forEach((log) => {
    const actaAfectada = log.acta_responsable || log.nombre_equipo
      ? `${log.acta_responsable || ''} ${log.nombre_equipo ? `(${log.nombre_equipo})` : ''}`.trim()
      : 'Acta eliminada'

    const detalle = log.detalle || {}
    const campos = Object.keys(detalle)

    if (campos.length === 0) {
      hoja.addRow({
        fecha: formatearFechaHora(log.fecha),
        usuario: log.usuario || 'Usuario eliminado',
        accion: log.accion,
        acta_afectada: actaAfectada,
        campo: '',
        valor_anterior: '',
        valor_nuevo: '',
      })
      return
    }

    campos.forEach((campo) => {
      const cambio = detalle[campo] || {}
      hoja.addRow({
        fecha: formatearFechaHora(log.fecha),
        usuario: log.usuario || 'Usuario eliminado',
        accion: log.accion,
        acta_afectada: actaAfectada,
        campo,
        valor_anterior: formatearValor(cambio.anterior),
        valor_nuevo: formatearValor(cambio.nuevo),
      })
    })
  })

  return workbook.xlsx.writeBuffer()
}

module.exports = { generarExcelActas, generarExcelAuditoria }
