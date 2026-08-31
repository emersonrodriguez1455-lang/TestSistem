import { Search } from 'lucide-react'

function Buscador({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="w-full relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-on-surface-variant"
        strokeWidth={2}
        aria-hidden="true"
      />
      <input
        className="h-12 w-full rounded-xl border border-outline-variant bg-surface pl-11 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/80 transition-colors hover:border-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default Buscador
