import { useEffect, useState } from 'react'

// TODO(backend): cuando exista API, reemplazar este hook por una llamada a
// GET/PUT /api/config para leer y guardar estos valores en la base de datos.
function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // almacenamiento no disponible, se ignora silenciosamente
    }
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
