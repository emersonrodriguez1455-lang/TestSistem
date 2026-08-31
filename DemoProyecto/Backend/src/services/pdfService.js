const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')
const fs = require('fs')
const path = require('path')

// --- FASE 3: paleta corporativa blanco/negro/gris --- //
// Misma paleta "ink" monocromática que ya usa el frontend rediseñado
// (tailwind.config.js: primary #1a1a1a, secondary #5c5f68, outline #a9adb9,
// surface-container-low #fafbfc, surface-container-high #eaebf0). Se
// reemplaza el verde institucional anterior -- no cambia estructura,
// medidas ni contenido del PDF, solo la paleta.
const COLOR_MARCA = rgb(0.102, 0.102, 0.102) // #1a1a1a (primary)
const COLOR_TEXTO_SUAVE = rgb(0.361, 0.373, 0.408) // #5c5f68 (secondary)
const COLOR_LINEA = rgb(0.663, 0.678, 0.725) // #a9adb9 (outline)
const COLOR_FONDO_SECCION = rgb(0.918, 0.922, 0.941) // #eaebf0 (surface-container-high)
const COLOR_FILA_PAR = rgb(0.980, 0.984, 0.988) // #fafbfc (surface-container-low)

// Centra un texto horizontalmente respecto a un punto xCentro (útil para
// títulos de sección, que antes tenían posiciones "a ojo" que no quedaban
// realmente centradas en distintos anchos de texto).
function dibujarTextoCentrado(page, texto, font, size, xCentro, y, color = rgb(0, 0, 0)) {
  const ancho = font.widthOfTextAtSize(texto, size)
  page.drawText(texto, { x: xCentro - ancho / 2, y, size, font, color })
}

// Título de sección con barra de acento a la izquierda + banda de fondo muy
// suave, para que cada bloque ("DATOS DEL USUARIO", "DESCRIPCION DE EQUIPO
// A ENTREGAR", "ACCESORIOS") se lea como un encabezado real y no como una
// línea de texto suelta -- mismo texto y misma posición relativa que antes.
function dibujarTituloSeccion(page, texto, fontBold, y) {
  page.drawRectangle({ x: 40, y: y - 4, width: 510, height: 16, color: COLOR_FONDO_SECCION })
  page.drawRectangle({ x: 40, y: y - 4, width: 3, height: 16, color: COLOR_MARCA })
  dibujarTextoCentrado(page, texto, fontBold, 9, 295, y, COLOR_MARCA)
}

// --- UTILIDADES DE TEXTO E IMÁGENES (Fase 4) --- //

// pdf-lib no envuelve texto automáticamente: partimos el texto en líneas que
// quepan dentro de maxWidth usando el ancho real de cada palabra con la
// fuente/tamaño dados.
function envolverTexto(texto, font, size, maxWidth) {
  const palabras = String(texto || '').split(/\s+/).filter(Boolean)
  const lineas = []
  let lineaActual = ''

  for (const palabra of palabras) {
    const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra
    if (font.widthOfTextAtSize(candidata, size) > maxWidth && lineaActual) {
      lineas.push(lineaActual)
      lineaActual = palabra
    } else {
      lineaActual = candidata
    }
  }
  if (lineaActual) lineas.push(lineaActual)
  return lineas
}

// Descarga la firma desde su URL pública de Storage. Puede ser un bitmap
// (PNG/JPG, ej. "Subir imagen" o el registro histórico) o un SVG vectorial
// (ej. "Dibujar", Fase 1.2). Devuelve un descriptor uniforme:
//   { tipo: 'bitmap', imagen } | { tipo: 'vector', pathD, viewBox } | null
// Logo de la empresa (con nombre "AGROINDUSTRIA LEGUMEX") para el
// encabezado del PDF -- archivo local en vez de una URL remota, para que la
// generación del PDF no dependa de que el frontend esté disponible ni de
// una llamada de red. "Best effort" igual que la firma: si el archivo no
// está, el PDF se sigue generando sin el logo en vez de romperse.
const RUTA_LOGO_EMPRESA = path.join(__dirname, '..', 'assets', 'logo-legumex.png')
let logoEmpresaCache = null

async function obtenerLogoEmpresa(pdfDoc) {
  try {
    if (!logoEmpresaCache) {
      logoEmpresaCache = fs.readFileSync(RUTA_LOGO_EMPRESA)
    }
    return await pdfDoc.embedPng(logoEmpresaCache)
  } catch (err) {
    console.warn('No se pudo incrustar el logo de la empresa:', err.message)
    return null
  }
}

// Es "best effort": si la URL falta o la descarga/decodificación falla, se
// devuelve null y el PDF sigue generándose (línea de firma vacía) en vez de
// romperse.
async function obtenerImagenFirma(pdfDoc, url) {
  if (!url) return null
  try {
    const esSvg = /\.svg($|\?)/i.test(url)
    if (esSvg) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const svgTexto = await res.text()
      const viewBoxMatch = /viewBox="([^"]+)"/.exec(svgTexto)
      const pathMatches = [...svgTexto.matchAll(/<path[^>]*\sd="([^"]+)"/g)]
      if (!viewBoxMatch || pathMatches.length === 0) throw new Error('SVG de firma sin path/viewBox válido')
      return {
        tipo: 'vector',
        viewBox: viewBoxMatch[1].split(/\s+/).map(Number),
        pathD: pathMatches.map((m) => m[1]).join(' '),
      }
    }

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    const esJpg = /\.jpe?g($|\?)/i.test(url) || res.headers.get('content-type')?.includes('jpeg')
    const imagen = esJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
    return { tipo: 'bitmap', imagen }
  } catch (err) {
    console.warn(`No se pudo incrustar la firma (${url}):`, err.message)
    return null
  }
}

// Lista de accesorios "de chequeo rápido", tomada tal cual del frontend
// (Devolucion.jsx -> ACCESORIOS) para que el PDF muestre exactamente las
// mismas opciones que el formulario y el formato físico (imagen de
// referencia: hoja "ACCESORIOS", 10 casillas: Monitor, Mouse, UPS, Laptop,
// Cargador, Teclado, Impresora, Disco Externo, Otro, Celular).
const ACCESORIOS_CHECK = [
  'Monitor', 'Mouse', 'UPS', 'Laptop', 'Cargador',
  'Teclado', 'Impresora', 'Disco Externo', 'Otro', 'Celular',
]

function construirChecksAccesorios(accesorios = []) {
  const articulos = accesorios.map((a) => (a.articulo || '').toLowerCase())
  return ACCESORIOS_CHECK.map((nombre) => {
    const marcado = articulos.some((a) => a.includes(nombre.toLowerCase()))
    return `[${marcado ? 'X' : '  '}] ${nombre.toUpperCase()}`
  })
}

/**
 * Función principal para seleccionar el formato según el acta ('una_hoja' vs 'dos_hojas')
 */
async function generarPdfActa(acta) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  // Fase 3: la frase de constancia (texto legal) se dibuja con una fuente
  // serif itálica -- lectura más formal, distinta del resto de la hoja
  // (etiquetas/valores en Helvetica), sin cambiar ni una palabra del texto.
  const fontConstancia = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

  const logo = await obtenerLogoEmpresa(pdfDoc)

  // El frontend histórico ha mandado distintos valores para "una hoja"
  // ('una', 'una_hoja', '1_pagina'); se aceptan todos para no depender de
  // una migración de datos y para que nunca vuelva a generar 2 páginas
  // quien pidió 1.
  const esUnaHoja = ['una', 'una_hoja', '1_pagina'].includes(acta.modalidad)

  if (esUnaHoja) {
    await construirPaginaUnaHoja(pdfDoc, acta, font, fontBold, fontConstancia, logo)
  } else {
    await construirPaginasDosHojas(pdfDoc, acta, font, fontBold, fontConstancia, logo)
  }

  return pdfDoc.save()
}

// --- AUXILIARES DE DIBUJO Y ESTRUCTURA --- //

function dibujarEncabezado(page, font, fontBold, paginaTexto, fechaVigencia = 'Enero 2026', logo = null) {
  const { width } = page.getSize()
  const topY = 750

  // Logo de la empresa centrado en el margen superior, POR ENCIMA del
  // recuadro de encabezado -- no invade ni desplaza ninguna de las 3
  // columnas existentes (hay ~32pt libres entre el borde de la hoja y el
  // recuadro, suficiente para un logo pequeño).
  if (logo) {
    const alturaLogo = 26
    const anchoLogo = (logo.width / logo.height) * alturaLogo
    page.drawImage(logo, {
      x: width / 2 - anchoLogo / 2,
      y: 762,
      width: anchoLogo,
      height: alturaLogo,
    })
  }

  // Cuadro Exterior del Encabezado (fondo claro + borde más marcado, como en
  // el formato físico impreso -- imagen de referencia)
  page.drawRectangle({
    x: 40, y: topY - 50, width: width - 80, height: 60,
    color: rgb(0.97, 0.97, 0.97), borderColor: rgb(0, 0, 0), borderWidth: 1.2,
  })
  // Franja superior de acento con el verde de marca (Fase 3) -- refuerza la
  // jerarquía visual sin alterar la estructura de 3 columnas del físico.
  page.drawRectangle({ x: 40, y: topY + 10 - 2.5, width: width - 80, height: 2.5, color: COLOR_MARCA })

  // Divisiones internas del encabezado (3 columnas, igual que el físico)
  page.drawLine({ start: { x: 200, y: topY + 10 }, end: { x: 200, y: topY - 50 }, strokeWidth: 1, color: COLOR_LINEA })
  page.drawLine({ start: { x: 380, y: topY + 10 }, end: { x: 380, y: topY - 50 }, strokeWidth: 1, color: COLOR_LINEA })
  // Línea que separa "PROCEDIMIENTO / CODIGO" (fila 1) de "HOJA DE
  // DEVOLUCION / Edición-Página" (fila 2), igual que en el físico.
  page.drawLine({ start: { x: 200, y: topY - 18 }, end: { x: width - 40, y: topY - 18 }, strokeWidth: 0.75, color: COLOR_LINEA })

  // Columna 1: Título Departamento
  page.drawText('DEPARTAMENTO DE TECNOLOGIA DE', { x: 45, y: topY - 6, size: 7, font: fontBold, color: COLOR_MARCA })
  page.drawText('INFORMACION Y COMUNICACION (TIC)', { x: 45, y: topY - 16, size: 7, font: fontBold, color: COLOR_MARCA })
  page.drawText('Fecha de Emisión: Enero 2025', { x: 45, y: topY - 33, size: 6.5, font, color: COLOR_TEXTO_SUAVE })
  page.drawText(`Fecha de Vigencia: ${fechaVigencia}`, { x: 45, y: topY - 43, size: 6.5, font, color: COLOR_TEXTO_SUAVE })

  // Columna 2: Procedimiento
  dibujarTextoCentrado(page, 'PROCEDIMIENTO', fontBold, 8.5, 290, topY - 8)
  dibujarTextoCentrado(page, 'HOJA DE DEVOLUCION', fontBold, 7.5, 290, topY - 30)
  dibujarTextoCentrado(page, 'DE EQUIPO', fontBold, 7.5, 290, topY - 40)

  // Columna 3: Código y Páginas
  page.drawText('CODIGO: DEVOLUCION', { x: 390, y: topY - 6, size: 7, font: fontBold })
  page.drawText('DE EQUIPO', { x: 415, y: topY - 15, size: 7, font: fontBold })
  page.drawText('Edición: No.01', { x: 430, y: topY - 28, size: 7, font, color: COLOR_TEXTO_SUAVE })
  const textoPagina = paginaTexto === 'Continuación' ? 'Continuación' : `Página ${paginaTexto}`
  page.drawText(textoPagina, { x: 435, y: topY - 40, size: 7, font, color: COLOR_TEXTO_SUAVE })
}

function dibujarDatosUsuario(page, acta, font, fontBold, startY) {
  let y = startY

  dibujarTituloSeccion(page, 'DATOS DEL USUARIO', fontBold, y)
  y -= 26

  const datos = [
    { label: 'FECHA:', val: acta.fecha ? new Date(acta.fecha).toLocaleDateString('es-GT') : '' },
    { label: 'RESPONSABLE:', val: acta.responsable || '' },
    { label: 'DEPARTAMENTO:', val: acta.departamento || '' },
    { label: 'PUESTO:', val: acta.puesto || '' },
    // El DPI NO va como fila aparte aquí en ninguna modalidad -- en el
    // formato físico de "1 hoja" vive dentro de la frase de constancia
    // ("...que me identifico con número de documento personal ___...");
    // en "2 hojas" no se pide DPI en absoluto. Ver dibujarConstanciaYFirmas.
    { label: 'RECIBI DE:', val: 'AGROINDUSTRIA LEGUMEX, S.A.' },
  ]

  datos.forEach((d, i) => {
    // Fase 3: fila con banda alterna muy sutil, mejor jerarquía entre la
    // etiqueta (gris, mayúsculas, negrita pequeña) y el valor (negro).
    if (i % 2 === 0) {
      page.drawRectangle({ x: 40, y: y - 4, width: 510, height: 15, color: COLOR_FILA_PAR })
    }
    page.drawText(d.label, { x: 45, y, size: 7.5, font: fontBold, color: COLOR_TEXTO_SUAVE })
    page.drawText(d.val, { x: 145, y, size: 8.5, font })
    page.drawLine({ start: { x: 140, y: y - 3 }, end: { x: 545, y: y - 3 }, strokeWidth: 0.5, color: COLOR_LINEA })
    y -= 18
  })

  // Planta Checkboxes
  y -= 4
  page.drawText('PLANTA:', { x: 45, y, size: 7.5, font: fontBold, color: COLOR_TEXTO_SUAVE })
  const tejarChecked = (acta.planta || '').toLowerCase().includes('tejar') ? '[X]' : '[  ]'
  const parramosChecked = (acta.planta || '').toLowerCase().includes('parramos') ? '[X]' : '[  ]'

  page.drawText(`${tejarChecked} Tejar`, { x: 145, y, size: 8.5, font })
  page.drawText(`${parramosChecked} Parramos`, { x: 245, y, size: 8.5, font })

  return y - 26
}

const COL_X = [40, 70, 180, 280, 380, 470]
const HEADERS_TABLA = ['NO.', 'ARTICULO', 'MARCA', 'MODELO', 'SERIE', 'NUEVO/USADO']
const ALTURA_FILA = 16
// Debajo de este límite ya no cabe una fila más sin invadir la zona de
// constancia + firmas + pie de página -- se abre una página de continuación
// en vez de recortar artículos (Fase 2.2).
const LIMITE_INFERIOR_TABLA = 175

/**
 * Dibuja la tabla de artículos/accesorios, paginando automáticamente si no
 * caben todos antes de la zona reservada para la constancia y las firmas.
 * A diferencia de la versión anterior (8 filas fijas, siempre en la misma
 * página), ahora:
 *  - Si hay pocos artículos, se completa con filas en blanco hasta un
 *    mínimo de 8 (mismo aspecto visual que el formato físico).
 *  - Si hay más artículos de los que caben, se agregan páginas de
 *    continuación (mismo encabezado del documento) hasta dibujarlos todos.
 * Devuelve { page, y }: la página y la posición donde terminó la tabla, que
 * el llamador debe usar para seguir dibujando (puede ser una página nueva).
 */
async function dibujarTablaAccesorios(pdfDoc, paginaInicial, accesorios = [], font, fontBold, startY, fechaVigencia, logo = null) {
  let page = paginaInicial
  let y = startY
  const totalFilas = Math.max(accesorios.length, 8)

  function dibujarEncabezadoTablaEnPagina(pagina, yEnc) {
    pagina.drawRectangle({ x: 40, y: yEnc - 15, width: 510, height: 18, color: COLOR_MARCA })
    HEADERS_TABLA.forEach((h, idx) => {
      pagina.drawText(h, { x: COL_X[idx] + 2, y: yEnc - 11, size: 7, font: fontBold, color: rgb(1, 1, 1) })
    })
  }

  dibujarEncabezadoTablaEnPagina(page, y)
  y -= 15

  for (let i = 0; i < totalFilas; i++) {
    if (y - ALTURA_FILA < LIMITE_INFERIOR_TABLA) {
      // No cabe otra fila sin invadir la constancia/firmas: se abre página
      // de continuación con el mismo encabezado del documento.
      page = pdfDoc.addPage([612, 792])
      dibujarEncabezado(page, font, fontBold, 'Continuación', fechaVigencia, logo)
      y = 690
      dibujarTextoCentrado(page, 'CONTINUACIÓN — DESCRIPCIÓN DE EQUIPO A ENTREGAR', fontBold, 9, 295, y, COLOR_MARCA)
      y -= 20
      dibujarEncabezadoTablaEnPagina(page, y)
      y -= 15
    }

    const item = accesorios[i] || {}
    y -= ALTURA_FILA
    // Zebra striping (Fase 3): filas alternas con fondo muy sutil, para
    // que una tabla larga (paginada) se siga leyendo fácil fila por fila.
    if (i % 2 === 1) {
      page.drawRectangle({ x: 40, y, width: 510, height: ALTURA_FILA, color: COLOR_FILA_PAR })
    }
    page.drawRectangle({ x: 40, y, width: 510, height: ALTURA_FILA, borderWidth: 0.5, borderColor: COLOR_LINEA })
    COL_X.forEach((xPos) => {
      page.drawLine({ start: { x: xPos, y }, end: { x: xPos, y: y + ALTURA_FILA }, strokeWidth: 0.5, color: COLOR_LINEA })
    })

    page.drawText(`${i + 1}`, { x: COL_X[0] + 5, y: y + 4, size: 7, font })
    page.drawText(item.articulo || '', { x: COL_X[1] + 3, y: y + 4, size: 7, font })
    page.drawText(item.marca || '', { x: COL_X[2] + 3, y: y + 4, size: 7, font })
    page.drawText(item.modelo || '', { x: COL_X[3] + 3, y: y + 4, size: 7, font })
    page.drawText(item.serie || '', { x: COL_X[4] + 3, y: y + 4, size: 7, font })
    page.drawText(item.estado || '', { x: COL_X[5] + 3, y: y + 4, size: 7, font })
  }

  return { page, y: y - 20 }
}

async function dibujarConstanciaYFirmas(pdfDoc, page, acta, font, fontBold, fontConstancia, startY) {
  let y = startY
  const fechaObj = acta.fecha ? new Date(acta.fecha) : new Date()
  const dia = String(fechaObj.getDate()).padStart(2, '0')
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0')
  const anio = fechaObj.getFullYear()

  // Texto reconstruido para coincidir EXACTAMENTE con cada formato físico
  // (confirmado con las fotos de referencia de ambas hojas):
  //  - "1 hoja": incluye la mención de DPI antes de "hago constar...".
  //  - "2 hojas": no menciona DPI en absoluto.
  const esUnaHojaConstancia = ['una', 'una_hoja', '1_pagina'].includes(acta.modalidad)
  const textoConstancia = esUnaHojaConstancia
    ? `Por este medio se hace constar que el día ${dia} del mes ${mes} del año ${anio}, ` +
      `que me identifico con número de documento personal ${acta.dpi || '_____________________'}, ` +
      `hago constar que entrego todo el equipo descrito arriba. Yo ${acta.responsable || '_____________________'}.`
    : `Por este medio se hace constar que el día ${dia} del mes ${mes} del año ${anio}, ` +
      `hago constar que entrego todo el equipo descrito arriba. Yo ${acta.responsable || '_____________________'}.`

  // Fase 3: fuente serif itálica + interlineado más generoso (14 en vez de
  // 12) para que se lea como una constancia formal, no como una nota suelta.
  const lineas = envolverTexto(textoConstancia, fontConstancia, 9, 505)
  lineas.forEach((l) => {
    page.drawText(l, { x: 42, y, size: 9, font: fontConstancia })
    y -= 14
  })

  y -= 12
  page.drawText('Observaciones:', { x: 40, y, size: 8, font: fontBold, color: COLOR_TEXTO_SUAVE })
  y -= 14

  // Líneas para observaciones completadas con texto si existe
  const obsText = acta.observaciones || ''
  page.drawText(obsText.substring(0, 90), { x: 40, y, size: 7.5, font })
  page.drawLine({ start: { x: 40, y: y - 2 }, end: { x: 550, y: y - 2 }, strokeWidth: 0.5, color: COLOR_LINEA })
  y -= 14
  page.drawText(obsText.substring(90, 180), { x: 40, y, size: 7.5, font })
  page.drawLine({ start: { x: 40, y: y - 2 }, end: { x: 550, y: y - 2 }, strokeWidth: 0.5, color: COLOR_LINEA })

  // Bloque de Firmas: si la firma fue capturada y confirmada, se incrusta la
  // imagen justo encima de la línea; si no, la línea queda en blanco para
  // firmar a mano (comportamiento original, ahora con la imagen real).
  y -= 55
  const lineaY = y

  const [firmaEntrega, firmaRecibe] = await Promise.all([
    obtenerImagenFirma(pdfDoc, acta.firma_entrega_url),
    obtenerImagenFirma(pdfDoc, acta.firma_recibe_url),
  ])

  function dibujarFirma(descriptor, xIzq, xDer) {
    if (!descriptor) return
    const anchoMax = xDer - xIzq - 10
    const altoMax = 36

    if (descriptor.tipo === 'bitmap') {
      const img = descriptor.imagen
      const escala = Math.min(anchoMax / img.width, altoMax / img.height)
      const w = img.width * escala
      const h = img.height * escala
      page.drawImage(img, {
        x: xIzq + (xDer - xIzq - w) / 2,
        y: lineaY + 4,
        width: w,
        height: h,
      })
      return
    }

    // Vector (firma dibujada a mano, Fase 1.2): se dibuja el trazo con
    // page.drawSvgPath, escalando el viewBox del SVG al recuadro disponible
    // en vez de rasterizar -- el trazo queda nítido en el PDF.
    const [, , vbW, vbH] = descriptor.viewBox
    const escala = Math.min(anchoMax / vbW, altoMax / vbH)
    const w = vbW * escala
    const h = vbH * escala
    const x = xIzq + (xDer - xIzq - w) / 2
    const y = lineaY + 4 + h
    page.drawSvgPath(descriptor.pathD, {
      x,
      y,
      scale: escala,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.2 / escala,
    })
  }

  dibujarFirma(firmaEntrega, 80, 250)
  dibujarFirma(firmaRecibe, 340, 510)

  page.drawLine({ start: { x: 80, y }, end: { x: 250, y }, strokeWidth: 1.2, color: COLOR_MARCA })
  page.drawLine({ start: { x: 340, y }, end: { x: 510, y }, strokeWidth: 1.2, color: COLOR_MARCA })

  y -= 12
  dibujarTextoCentrado(page, 'FIRMA RESPONSABLE', fontBold, 8, 165, y, COLOR_TEXTO_SUAVE)
  dibujarTextoCentrado(page, 'ENCARGADO IT', fontBold, 8, 425, y, COLOR_TEXTO_SUAVE)

  // Leyenda pie de página
  page.drawText('Original: IT     Copia: RRHH     Copia: Finanzas', { x: 430, y: 30, size: 6.5, font, color: COLOR_TEXTO_SUAVE })
}

// --- CONSTRUCCIÓN DE PLANTILLAS --- //

async function construirPaginaUnaHoja(pdfDoc, acta, font, fontBold, fontConstancia, logo = null) {
  const page = pdfDoc.addPage([612, 792]) // Tamaño Carta Standard
  dibujarEncabezado(page, font, fontBold, '1 - 1', 'Enero 2025', logo)

  let y = dibujarDatosUsuario(page, acta, font, fontBold, 680)

  // Sección Descripción de Equipo (Versión 1 Hoja)
  dibujarTituloSeccion(page, 'DESCRIPCION DE EQUIPO A ENTREGAR', fontBold, y)
  y -= 26

  // Checkboxes de Artículos Frecuentes.
  // FIX (Fase 4): antes se comparaban contra acta.tipo_equipo ("Laptop" /
  // "Escritorio"), que nunca podía contener palabras como "monitor" o
  // "mouse" -- por lo que estos checks nunca se marcaban. La descripción de
  // equipo a entregar vive en la tabla de accesorios (acta.accesorios), así
  // que ahora se marca un artículo si aparece entre los accesorios de la
  // acta -- y la lista de artículos es la misma (y en el mismo orden) que la
  // del formulario y la del formato físico (imagen de referencia).
  const checks = construirChecksAccesorios(acta.accesorios)

  let cX = 40
  let cY = y
  checks.forEach((chk, i) => {
    page.drawText(chk, { x: cX, y: cY, size: 7.5, font })
    cX += 100
    if ((i + 1) % 5 === 0) {
      cX = 40
      cY -= 14
    }
  })

  y = cY - 15

  // Tabla compacta de accesorios/equipos entregados (pagina automáticamente
  // si hay más artículos de los que caben -- Fase 2.2)
  const resultadoTabla = await dibujarTablaAccesorios(
    pdfDoc, page, acta.accesorios || [], font, fontBold, y, 'Enero 2025', logo
  )

  // Bloque final de Constancia y Firmas -- se dibuja en la página donde
  // haya terminado la tabla (puede ser una página de continuación).
  await dibujarConstanciaYFirmas(pdfDoc, resultadoTabla.page, acta, font, fontBold, fontConstancia, resultadoTabla.y)
}

async function construirPaginasDosHojas(pdfDoc, acta, font, fontBold, fontConstancia, logo = null) {
  // --- PÁGINA 1 ---
  const page1 = pdfDoc.addPage([612, 792])
  dibujarEncabezado(page1, font, fontBold, '1 - 2', 'Enero 2026', logo)

  let y1 = dibujarDatosUsuario(page1, acta, font, fontBold, 680)

  dibujarTituloSeccion(page1, 'DESCRIPCION DE EQUIPO A ENTREGAR', fontBold, y1)
  y1 -= 30

  const esLaptop = (acta.tipo_equipo || '').toLowerCase().includes('laptop') ? '[X]' : '[  ]'
  const esEscritorio = (acta.tipo_equipo || '').toLowerCase().includes('escritorio') ? '[X]' : '[  ]'
  const esNuevo = (acta.estado_equipo || '').toLowerCase().includes('nuevo') ? '[X]' : '[  ]'
  const esUsado = (acta.estado_equipo || '').toLowerCase().includes('usado') ? '[X]' : '[  ]'

  page1.drawText('TIPO:', { x: 45, y: y1, size: 7.5, font: fontBold, color: COLOR_TEXTO_SUAVE })
  page1.drawText(`${esLaptop} Laptop`, { x: 145, y: y1, size: 8.5, font })
  page1.drawText(`${esEscritorio} Escritorio`, { x: 235, y: y1, size: 8.5, font })
  y1 -= 20

  page1.drawText('ESTADO:', { x: 45, y: y1, size: 7.5, font: fontBold, color: COLOR_TEXTO_SUAVE })
  page1.drawText(`${esNuevo} Nuevo`, { x: 145, y: y1, size: 8.5, font })
  page1.drawText(`${esUsado} Usado`, { x: 235, y: y1, size: 8.5, font })
  y1 -= 22

  const specs = [
    { label: 'MARCA:', val: acta.marca || '' },
    { label: 'MODELO:', val: acta.modelo || '' },
    { label: 'No. SERIE:', val: acta.serie || '' },
    { label: 'PROCESADOR:', val: acta.procesador || '' },
    { label: 'MEMORIA RAM:', val: acta.memoria_ram || '' },
    { label: 'DISCO DURO:', val: acta.disco_duro || '' },
    { label: 'NOMBRE EQUIPO:', val: acta.nombre_equipo || '' },
  ]

  specs.forEach((s, i) => {
    if (i % 2 === 0) {
      page1.drawRectangle({ x: 40, y: y1 - 4, width: 510, height: 17, color: COLOR_FILA_PAR })
    }
    page1.drawText(s.label, { x: 45, y: y1, size: 7.5, font: fontBold, color: COLOR_TEXTO_SUAVE })
    page1.drawText(s.val, { x: 145, y: y1, size: 8.5, font })
    page1.drawLine({ start: { x: 140, y: y1 - 3 }, end: { x: 550, y: y1 - 3 }, strokeWidth: 0.5, color: COLOR_LINEA })
    y1 -= 22
  })

  page1.drawText('Original: IT     Copia: RRHH', { x: 450, y: 30, size: 6.5, font, color: COLOR_TEXTO_SUAVE })

  // --- PÁGINA 2 ---
  const page2 = pdfDoc.addPage([612, 792])
  dibujarEncabezado(page2, font, fontBold, '2 - 2', 'Enero 2026', logo)

  let y2 = 680
  dibujarTituloSeccion(page2, 'ACCESORIOS', fontBold, y2)
  y2 -= 30

  // Checkboxes rápidos de accesorios, igual que en la hoja física de
  // ACCESORIOS (imagen de referencia) -- antes esta página solo tenía la
  // tabla, sin este bloque de chequeo rápido.
  const checks2 = construirChecksAccesorios(acta.accesorios)
  let cX2 = 40
  let cY2 = y2
  checks2.forEach((chk, i) => {
    page2.drawText(chk, { x: cX2, y: cY2, size: 7.5, font })
    cX2 += 100
    if ((i + 1) % 5 === 0) {
      cX2 = 40
      cY2 -= 14
    }
  })
  y2 = cY2 - 15

  const resultadoTabla2 = await dibujarTablaAccesorios(
    pdfDoc, page2, acta.accesorios || [], font, fontBold, y2, 'Enero 2026'
  )
  await dibujarConstanciaYFirmas(
    pdfDoc, resultadoTabla2.page, acta, font, fontBold, fontConstancia, resultadoTabla2.y
  )
}

module.exports = { generarPdfActa }
