const { Router } = require('express')
const authController = require('../controllers/authController')
const { requireAuth } = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const { loginSchema } = require('../validators/schemas')

const router = Router()

router.post('/login', validate(loginSchema), authController.login)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.me)

module.exports = router
