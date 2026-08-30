function MobileHeader({ onAbrirMenu }) {
  return (
    <header className="md:hidden flex justify-between items-center h-16 px-stack-lg w-full bg-surface-bright border-b border-outline-variant shadow-sm fixed top-0 right-0 left-0 z-30">
      <div className="flex items-center gap-4">
        <button
          aria-label="Abrir menú"
          onClick={onAbrirMenu}
          className="text-primary hover:bg-surface-container-low p-2 rounded-full transition-colors active:scale-95 duration-150"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-headline-lg text-headline-lg font-bold text-primary">LEGUMEX</span>
      </div>
      <div className="flex items-center gap-4 text-primary">
        <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-outline text-lg">person</span>
        </div>
      </div>
    </header>
  )
}

export default MobileHeader
