const { Router } = require('express')
const authController = require('../controllers/authController')
const { requireAuth } = require('../middlewares/auth')

const router = Router()

router.post('/login', authController.login)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.me)

module.exports = router
