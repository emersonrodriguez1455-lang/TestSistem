import { useEffect, useState } from 'react'
import { UserPlus, PencilLine, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { listarUsuarios, crearUsuario, editarUsuario, eliminarUsuario } from '../services/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'

function iniciales(nombre) {
  if (!nombre) return '—'
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

const ROL_INFO = {
  admin: { label: 'Administrador', classes: 'bg-on-surface text-surface' },
  registrador: { label: 'Registrador', classes: 'border border-outline bg-surface text-on-surface' },
}

const inputClasses =
  'h-11 w-full rounded-lg border border-outline-variant bg-surface px-3.5 font-body-md text-body-md text-on-surface transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60'

/**
 * Modal de crear/editar usuario. Reutiliza el mismo look de tarjeta que
 * ConfirmModal (fondo, header con X, botones al pie) para no introducir un
 * segundo estilo de modal en el sistema.
 */
function UsuarioFormModal({ abierto, usuario, propioId, procesando, error, onGuardar, onCancelar }) {
  const esEdicion = Boolean(usuario)
  const [form, setForm] = useState({ username: '', password: '', nombre_completo: '', rol: 'registrador' })

  useEffect(() => {
    if (abierto) {
      setForm({
        username: usuario?.username || '',
        password: '',
        nombre_completo: usuario?.nombre_completo || '',
        rol: usuario?.rol || 'registrador',
      })
    }
  }, [abierto, usuario])

  if (!abierto) return null

  const esUnoMismo = esEdicion && String(usuario.id) === String(propioId)

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (esEdicion) {
      const cambios = {
        nombre_completo: form.nombre_completo,
        rol: form.rol,
      }
      if (form.password) cambios.password = form.password
      onGuardar(cambios)
    } else {
      onGuardar({
        username: form.username,
        password: form.password,
        nombre_completo: form.nombre_completo,
        rol: form.rol,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/40 px-4">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-lg border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">
            {esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-stack-md">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-label-bold text-on-surface">Nombre completo</label>
            <input
              className={inputClasses}
              value={form.nombre_completo}
              disabled={procesando}
              onChange={(e) => actualizar('nombre_completo', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-label-bold text-on-surface">Usuario</label>
            <input
              className={inputClasses}
              value={form.username}
              disabled={procesando || esEdicion}
              onChange={(e) => actualizar('username', e.target.value)}
              required
              minLength={3}
              placeholder="ej. jperez"
            />
            {esEdicion && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                El nombre de usuario no se puede cambiar.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-label-bold text-on-surface">
              {esEdicion ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <input
              type="password"
              className={inputClasses}
              value={form.password}
              disabled={procesando}
              onChange={(e) => actualizar('password', e.target.value)}
              required={!esEdicion}
              minLength={8}
              placeholder={esEdicion ? 'Dejar en blanco para no cambiarla' : 'Mínimo 8 caracteres'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-label-bold text-on-surface">Rol</label>
            <select
              className={inputClasses}
              value={form.rol}
              disabled={procesando || esUnoMismo}
              onChange={(e) => actualizar('rol', e.target.value)}
            >
              <option value="registrador">Registrador</option>
              <option value="admin">Administrador</option>
            </select>
            {esUnoMismo && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                No puedes cambiar tu propio rol.
              </p>
            )}
          </div>

          {error && (
            <p className="text-error font-label-sm text-label-sm bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              disabled={procesando}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface px-4 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
            >
              {procesando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Usuarios() {
  const { token, user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  function cargar() {
    setLoading(true)
    setError('')
    listarUsuarios(token)
      .then((res) => setUsuarios(res || []))
      .catch((err) => setError(err.message || 'No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function abrirCrear() {
    setUsuarioEditando(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  function abrirEditar(usuario) {
    setUsuarioEditando(usuario)
    setErrorModal('')
    setModalAbierto(true)
  }

  async function handleGuardar(datos) {
    setGuardando(true)
    setErrorModal('')
    try {
      if (usuarioEditando) {
        await editarUsuario(token, usuarioEditando.id, datos)
      } else {
        await crearUsuario(token, datos)
      }
      setModalAbierto(false)
      cargar()
    } catch (err) {
      setErrorModal(err.message || 'No se pudo guardar el usuario')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar() {
    if (!usuarioAEliminar) return
    setEliminando(true)
    setErrorEliminar('')
    try {
      await eliminarUsuario(token, usuarioAEliminar.id)
      setUsuarioAEliminar(null)
      cargar()
    } catch (err) {
      setErrorEliminar(err.message || 'No se pudo eliminar el usuario')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <>
      <div className="flex-1 p-container-padding md:p-stack-lg bg-background">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-stack-lg">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">Usuarios</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Administra quién puede acceder al sistema y con qué rol.
              </p>
            </div>
            <button
              onClick={abrirCrear}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-label-bold text-label-bold text-on-primary shadow-sm transition-all hover:brightness-110 active:brightness-95"
            >
              <UserPlus className="h-4.5 w-4.5" strokeWidth={2} />
              Nuevo usuario
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Usuario
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Rol
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                    <th className="px-5 py-3.5 font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-on-surface divide-y divide-outline-variant">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-on-surface-variant">
                        Cargando...
                      </td>
                    </tr>
                  )}
                  {!loading && error && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-error">
                        {error}
                      </td>
                    </tr>
                  )}
                  {!loading && !error && usuarios.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-on-surface-variant">
                        Aún no hay usuarios registrados.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    usuarios.map((u) => {
                      const rolInfo = ROL_INFO[u.rol] || { label: u.rol, classes: 'bg-surface-container-high text-on-surface' }
                      const esUnoMismo = String(u.id) === String(user?.id)
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-2.5">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary-container font-label-bold text-[11px] text-on-secondary-container">
                                {iniciales(u.nombre_completo)}
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium text-on-surface truncate">
                                  {u.nombre_completo}
                                  {esUnoMismo && (
                                    <span className="ml-1.5 font-label-sm text-label-sm text-on-surface-variant">(tú)</span>
                                  )}
                                </div>
                                <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                                  {u.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm uppercase tracking-wide ${rolInfo.classes}`}
                            >
                              {rolInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm uppercase tracking-wide ${
                                u.activo
                                  ? 'border border-outline bg-surface text-on-surface'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => abrirEditar(u)}
                                className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                                title="Editar usuario"
                              >
                                <PencilLine className="h-4.5 w-4.5" strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => setUsuarioAEliminar(u)}
                                disabled={esUnoMismo}
                                className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-30 disabled:cursor-not-allowed"
                                title={esUnoMismo ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                              >
                                <Trash2 className="h-4.5 w-4.5" strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <UsuarioFormModal
        abierto={modalAbierto}
        usuario={usuarioEditando}
        propioId={user?.id}
        procesando={guardando}
        error={errorModal}
        onGuardar={handleGuardar}
        onCancelar={() => setModalAbierto(false)}
      />

      <ConfirmModal
        abierto={Boolean(usuarioAEliminar)}
        titulo="Eliminar usuario"
        mensaje={
          usuarioAEliminar
            ? `¿Eliminar a "${usuarioAEliminar.nombre_completo}" (${usuarioAEliminar.username})? Ya no podrá iniciar sesión, pero su historial de actas y auditoría se conserva.`
            : ''
        }
        procesando={eliminando}
        error={errorEliminar}
        textoConfirmar="Eliminar"
        variante="peligro"
        onConfirmar={handleEliminar}
        onCancelar={() => setUsuarioAEliminar(null)}
      />
    </>
  )
}

export default Usuarios
