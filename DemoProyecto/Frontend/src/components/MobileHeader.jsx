import { Menu } from 'lucide-react'

function MobileHeader({ onAbrirMenu }) {
  return (
    <header className="md:hidden flex justify-between items-center h-16 px-4 w-full bg-surface-container-lowest border-b border-outline-variant fixed top-0 right-0 left-0 z-30">
      <div className="flex items-center gap-3">
        <button
          aria-label="Abrir menú"
          onClick={onAbrirMenu}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container-high active:bg-surface-container-highest transition-colors"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center">
            <img src="/logo-legumex-icon.png" alt="Legumex" className="h-full w-full object-contain" />
          </div>
          <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            LEGUMEX
          </span>
        </div>
      </div>
    </header>
  )
}

export default MobileHeader
