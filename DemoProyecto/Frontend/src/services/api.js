const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const url = `${API_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  let data = null
  try {
    data = await response.json()
  } catch (_) {
    // respuesta sin cuerpo JSON
  }

  if (!response.ok) {
    const message = (data && data.message) || `Error ${response.status}`
    throw new Error(message)
  }

  return data
}

export async function checkApiHealth() {
  return request('/api/health', { method: 'GET' })
}

// Llama con el token guardado en el header Authorization: Bearer <token>
function authRequest(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function crearActa(token, payload) {
  return authRequest('/api/actas', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function guardarFirma(token, actaId, tipo, imagenBase64) {
  return authRequest(`/api/actas/${actaId}/firma`, token, {
    method: 'POST',
    body: JSON.stringify({ tipo, imagen_base64: imagenBase64 }),
  })
}

export async function reiniciarFirma(token, actaId, tipo, password) {
  return authRequest(`/api/actas/${actaId}/firma`, token, {
    method: 'DELETE',
    body: JSON.stringify({ tipo, password }),
  })
}

export async function listarActas(token) {
  return authRequest('/api/actas', token, { method: 'GET' })
}

export async function obtenerActa(token, id) {
  return authRequest(`/api/actas/${id}`, token, { method: 'GET' })
}

export async function editarActa(token, id, payload) {
  return authRequest(`/api/actas/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function eliminarActa(token, id, password) {
  return authRequest(`/api/actas/${id}`, token, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}

// El PDF requiere el header Authorization, así que no se puede abrir con un
// simple <a href>; hay que pedirlo con fetch y convertir la respuesta a blob.
export async function descargarPdfActa(token, id) {
  const response = await fetch(`${API_URL}/api/actas/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    let message = `Error ${response.status}`
    try {
      const data = await response.json()
      message = data.message || message
    } catch (_) {
      // el error no vino en JSON
    }
    throw new Error(message)
  }
  return response.blob()
}

export async function obtenerAuditoria(token) {
  return authRequest('/api/auditoria', token, { method: 'GET' })
}

// Descargas de Excel (Fase 8): igual que el PDF, requieren el header
// Authorization, así que se piden con fetch y se convierten a blob. Además
// van con POST + contraseña en el body (ConfirmModal), nunca en la URL.
async function descargarExcel(path, token, password) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  })
  if (!response.ok) {
    let message = `Error ${response.status}`
    try {
      const data = await response.json()
      message = data.message || message
    } catch (_) {
      // el error no vino en JSON
    }
    throw new Error(message)
  }
  return response.blob()
}

export async function exportarActasExcel(token, password) {
  return descargarExcel('/api/actas/exportar/excel', token, password)
}

export async function exportarAuditoriaExcel(token, password) {
  return descargarExcel('/api/auditoria/exportar/excel', token, password)
}

export default {
  checkApiHealth,
  login,
  crearActa,
  guardarFirma,
  reiniciarFirma,
  listarActas,
  obtenerActa,
  editarActa,
  eliminarActa,
  descargarPdfActa,
  obtenerAuditoria,
  exportarActasExcel,
  exportarAuditoriaExcel,
}
