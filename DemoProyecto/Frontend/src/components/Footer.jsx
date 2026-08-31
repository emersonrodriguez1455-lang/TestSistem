function Footer() {
  return (
    <footer className="w-full mt-auto border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-on-surface-variant sm:flex-row md:px-8">
        <p className="font-label-sm text-label-sm">© LEGUMEX · Todos los derechos reservados.</p>
        <div className="flex items-center gap-4 font-label-sm text-label-sm">
          <a href="#" className="transition-colors hover:text-on-surface">
            Soporte Técnico
          </a>
          <a href="#" className="transition-colors hover:text-on-surface">
            Manual de Usuario
          </a>
          <a href="#" className="transition-colors hover:text-on-surface">
            Privacidad
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
