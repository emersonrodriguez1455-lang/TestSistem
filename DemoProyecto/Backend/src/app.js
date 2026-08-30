const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ============================================
// 1️⃣ Declarar app ANTES de usarla
// ============================================
const app = express();

// ============================================
// 2️⃣ Middlewares globales
// ============================================
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

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