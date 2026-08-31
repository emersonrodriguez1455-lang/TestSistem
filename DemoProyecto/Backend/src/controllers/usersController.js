const asyncHandler = require('../utils/asyncHandler')
const usersService = require('../services/usersService')
const { registrarAuditoria } = require('../services/auditoriaService')

const listar = asyncHandler(async (req, res) => {
  const usuarios = await usersService.listarUsuarios()
  res.json(usuarios)
})

const crear = asyncHandler(async (req, res) => {
  const usuario = await usersService.crearUsuario(req.body)

  await registrarAuditoria({
    usuarioId: req.user.id,
    accion: 'CREAR_USUARIO',
    registroId: usuario.id,
    detalle: { username: usuario.username, rol: usuario.rol },
    contexto: { responsable: usuario.nombre_completo },
  })

  res.status(201).json(usuario)
})

const editar = asyncHandler(async (req, res) => {
  const usuario = await usersService.editarUsuario(req.params.id, req.body, req.user.id)

  await registrarAuditoria({
    usuarioId: req.user.id,
    accion: 'EDITAR_USUARIO',
    registroId: usuario.id,
    detalle: { campos_modificados: Object.keys(req.body) },
    contexto: { responsable: usuario.nombre_completo },
  })

  res.json(usuario)
})

const eliminar = asyncHandler(async (req, res) => {
  const usuario = await usersService.eliminarUsuario(req.params.id, req.user.id)

  await registrarAuditoria({
    usuarioId: req.user.id,
    accion: 'DESACTIVAR_USUARIO',
    registroId: usuario.id,
    detalle: { username: usuario.username },
    contexto: { responsable: usuario.nombre_completo },
  })

  res.json(usuario)
})

module.exports = { listar, crear, editar, eliminar }
