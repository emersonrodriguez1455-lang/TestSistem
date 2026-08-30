const { Router } = require('express')
const actasController = require('../controllers/actasController')
const { requireAuth } = require('../middlewares/auth')

const router = Router()

// Todas las rutas de actas requieren autenticación
router.use(requireAuth)

router.post('/', actasController.crearActa)
router.get('/', actasController.listarActas)
router.post('/exportar/excel', actasController.exportarExcel)
router.get('/:id', actasController.obtenerActa)
router.get('/:id/pdf', actasController.generarPdf)
router.put('/:id', actasController.editarActa)
router.delete('/:id', actasController.eliminarActa)
router.post('/:id/firma', actasController.guardarFirma)
router.delete('/:id/firma', actasController.reiniciarFirma)

module.exports = router
