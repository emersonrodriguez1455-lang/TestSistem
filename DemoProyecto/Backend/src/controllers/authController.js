const asyncHandler = require('../utils/asyncHandler')
const authService = require('../services/authService')

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const result = await authService.login(username, password)
  res.json(result)
})

// El logout real ocurre en el cliente (borrar el token); este endpoint existe
// solo por si luego se quiere llevar lista negra de tokens o registrar el evento.
const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
})

module.exports = { login, logout, me }
