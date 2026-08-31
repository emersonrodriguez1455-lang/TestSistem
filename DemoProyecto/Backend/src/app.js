const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ============================================
// 1️⃣ Declarar app ANTES de usarla
// ============================================
const app = express();

// Render (y la mayoría de hostings) ponen la app detrás de un proxy que
// agrega la cabecera X-Forwarded-For con la IP real del cliente. Sin esto,
// express-rate-limit no puede confiar en esa cabecera (por seguridad, para
// que nadie la falsifique) y tira ERR_ERL_UNEXPECTED_X_FORWARDED_FOR. "1"
// significa "confía en un salto de proxy" (el de Render), no en cualquiera.
app.set('trust proxy', 1);

// ============================================
// 2️⃣ Middlewares globales
// ============================================
// Fase D.4: cabeceras de seguridad estándar (X-Frame-Options, HSTS, etc).
// Se desactiva CSP por defecto -- el frontend es una app aparte (otro
// origen), no HTML servido por este backend, así que la CSP por defecto de
// helmet no aplica aquí y solo generaría ruido.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
// Fase D.7: límite de tamaño de payload. Las firmas van en base64 dentro
// del JSON (una imagen chica en PNG/SVG), así que el límite se deja con
// margen holgado en vez de un límite genérico bajo que las rompería.
app.use(express.json({ limit: '2mb' }));

// Fase D.3: límite de intentos de login por IP (además del bloqueo por
// cuenta en authService.js). Umbral alto a propósito -- no es para frenar
// un uso normal, es para frenar un script de fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 intentos por IP en la ventana, entre varias cuentas
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión. Espera unos minutos e intenta de nuevo.' },
});

// ============================================
// 3️⃣ Importar dependencias (después de app)
// ============================================
const pool = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const actasRoutes = require('./routes/actasRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const errorHandler = require('./middlewares/errorHandler');

// ============================================
// 4️⃣ Ruta de prueba de BD (AHORA SÍ, app existe)
// ============================================
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as hora_actual');
    res.json({
      success: true,
      mensaje: 'Conexión a Supabase exitosa',
      hora: result.rows[0].hora_actual
    });
  } catch (error) {
    console.error('Error en /api/test-db:', error.message);
    res.status(500).json({
      success: false,
      mensaje: 'Error de conexión a la base de datos',
      error: error.message
    });
  }
});

// ============================================
// 5️⃣ Rutas de la API
// ============================================
app.use('/api/health', healthRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/actas', actasRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// ============================================
// 6️⃣ 404 para rutas no encontradas
// ============================================
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// ============================================
// 7️⃣ Middleware de errores (SIEMPRE al final)
// ============================================
app.use(errorHandler);

// ============================================
// 8️⃣ Exportar app
// ============================================
module.exports = app;
