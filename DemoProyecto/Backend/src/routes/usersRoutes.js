const { Router } = require('express')
const usersController = require('../controllers/usersController')
const { requireAuth, requireAdmin } = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const { crearUsuarioSchema, editarUsuarioSchema } = require('../validators/schemas')

const router = Router()

// Gestión de usuarios: exclusiva de administradores, igual que Auditoría.
router.use(requireAuth)
router.use(requireAdmin)

router.get('/', usersController.listar)
router.post('/', validate(crearUsuarioSchema), usersController.crear)
router.put('/:id', validate(editarUsuarioSchema), usersController.editar)
router.delete('/:id', usersController.eliminar)

module.exports = router
