// Uso: node src/scripts/seedAdmin.js <username> <password> <"Nombre Completo">
// Crea (o actualiza la contraseña de) un usuario admin. Necesario porque no
// puede existir un endpoint público de "crear admin" - el primer usuario
// siempre se crea por línea de comandos con acceso directo a la BD.
require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('../config/db')

async function main() {
  const [, , username, password, nombreCompleto] = process.argv

  if (!username || !password || !nombreCompleto) {
    console.error('Uso: node src/scripts/seedAdmin.js <username> <password> "<Nombre Completo>"')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await pool.query(
    `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, activo = TRUE`,
    [username, passwordHash, nombreCompleto]
  )

  console.log(`Usuario admin "${username}" creado/actualizado correctamente.`)
  await pool.end()
}

main().catch((err) => {
  console.error('Error creando usuario admin:', err)
  process.exit(1)
})
