import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function NavItem({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-4 px-4 py-3 rounded-lg font-body-md transition-all duration-200 active:translate-x-1 group',
          isActive
            ? 'bg-secondary-container text-on-secondary-container font-bold border-l-4 border-secondary'
            : 'text-on-surface-subtle hover:bg-surface-container-highest',
        ].join(' ')
      }
    >
      <span
        className="material-symbols-outlined group-hover:scale-110 transition-transform"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        {icon}
      </span>
      <span className="font-label-bold text-label-bold">{label}</span>
    </NavLink>
  )
}

function Sidebar({ abierto, onCerrar }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    onCerrar?.()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Overlay: solo en móvil/tablet pequeña, cierra el menú al tocar fuera */}
      {abierto && (
        <div
          onClick={onCerrar}
          aria-hidden="true"
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <nav
        className={[
          'flex flex-col py-stack-lg bg-surface-container fixed left-0 top-0 h-full w-drawer-width max-w-[85vw] border-r border-outline-variant z-50',
          'transition-transform duration-200 ease-out',
          abierto ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* Botón cerrar: solo visible en móvil/tablet pequeña (drawer superpuesto) */}
        <button
          onClick={onCerrar}
          aria-label="Cerrar menú"
          className="md:hidden self-end mr-4 mb-2 text-on-surface-variant hover:text-primary p-1"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="px-stack-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center text-on-primary">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                factory
              </span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-extrabold text-primary">
                Control Operativo
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Administración 
              </p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          <NavItem to="/" icon="assignment_return" label="Hoja de Devolución" end onNavigate={onCerrar} />
          <NavItem to="/historial" icon="history_edu" label="Historial de Actas" onNavigate={onCerrar} />
          {isAdmin && <NavItem to="/auditoria" icon="rule_folder" label="Auditoría" onNavigate={onCerrar} />}
        </div>

        {/* Footer: usuario actual + cerrar sesión */}
        <div className="px-4 mt-auto pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-3 px-4 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-bold text-label-bold shrink-0">
              {user?.name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="font-label-bold text-label-bold text-on-surface truncate">{user?.name}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-subtle font-body-md hover:bg-surface-container-highest hover:text-error transition-all duration-200 active:translate-x-1 group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
              logout
            </span>
            <span className="font-label-bold text-label-bold">Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default Sidebar
