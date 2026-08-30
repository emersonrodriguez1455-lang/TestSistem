const { Router } = require('express')
const auditoriaController = require('../controllers/auditoriaController')
const { requireAuth, requireAdmin } = require('../middlewares/auth')

const router = Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/', auditoriaController.obtenerAuditoria)
router.post('/exportar/excel', auditoriaController.exportarExcel)

module.exports = router
