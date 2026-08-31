const { z } = require('zod')

// Fase D.5 -- por qué importa validar esto antes de tocar la BD:
// - loginSchema: sin esto, un body malformado (ej. username como número o
//   un objeto) llegaba hasta la query SQL y fallaba con un error crudo de
//   Postgres en vez de un 400 claro.
// - crearActaSchema / editarActaSchema: son la puerta de entrada de TODO lo
//   que termina en `actas_devolucion` -- si un campo llega con el tipo
//   equivocado (ej. `fecha` como número), hoy se guarda tal cual y rompe
//   silenciosamente el PDF o el Excel más adelante. Validar aquí lo corta
//   en el origen.
const loginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

// Campos compartidos entre crear y editar -- todos opcionales/nullable
// porque el formulario permite guardar como borrador con campos vacíos.
const camposActaBase = {
  fecha: z.string().min(1).optional(),
  responsable: z.string().max(200).optional().nullable(),
  departamento: z.string().max(200).optional().nullable(),
  puesto: z.string().max(200).optional().nullable(),
  dpi: z.string().max(20).optional().nullable(),
  planta: z.string().max(100).optional().nullable(),
  modalidad: z.enum(['una', 'dos', 'una_hoja', '1_pagina']).optional().nullable(),
  tipo_equipo: z.string().max(100).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  modelo: z.string().max(100).optional().nullable(),
  serie: z.string().max(100).optional().nullable(),
  nombre_equipo: z.string().max(200).optional().nullable(),
  procesador: z.string().max(200).optional().nullable(),
  memoria_ram: z.string().max(50).optional().nullable(),
  disco_duro: z.string().max(100).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
  estado_equipo: z.string().max(100).optional().nullable(),
  borrador: z.boolean().optional(),
  accesorios: z
    .array(
      z.object({
        articulo: z.string().max(200).optional().nullable(),
        marca: z.string().max(200).optional().nullable(),
        modelo: z.string().max(200).optional().nullable(),
        serie: z.string().max(200).optional().nullable(),
        estado: z.string().max(50).optional().nullable(),
      })
    )
    .optional(),
  firma_entrega_base64: z.string().optional().nullable(),
  firma_recibe_base64: z.string().optional().nullable(),
}

const crearActaSchema = z.object(camposActaBase)

// editarActa además exige password (confirmación) y version (Fase F,
// bloqueo optimista) -- sin esto no se puede saber contra qué versión del
// acta se está comparando el cambio.
const editarActaSchema = z.object({
  ...camposActaBase,
  password: z.string().min(1, 'La contraseña es obligatoria'),
  version: z.number({ invalid_type_error: 'Falta la versión del acta que se está editando' }),
})

module.exports = { loginSchema, crearActaSchema, editarActaSchema }
