function Footer() {
  return (
    <footer className="w-full mt-auto flex flex-col sm:flex-row justify-between items-center gap-2 px-stack-lg py-stack-md bg-surface-container-lowest border-t border-outline-variant">
      <div className="font-label-bold text-label-bold text-primary">
        © . Todos los derechos reservados.
      </div>
      <div className="flex gap-4 font-label-sm text-label-sm text-on-surface-variant">
        <a className="hover:text-secondary underline transition-all opacity-80 hover:opacity-100" href="#">
          Soporte Técnico
        </a>
        <a className="hover:text-secondary underline transition-all opacity-80 hover:opacity-100" href="#">
          Manual de Usuario
        </a>
        <a className="hover:text-secondary underline transition-all opacity-80 hover:opacity-100" href="#">
          Privacidad
        </a>
      </div>
    </footer>
  )
}

export default Footer
