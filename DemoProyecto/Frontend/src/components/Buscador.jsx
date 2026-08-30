function Buscador({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="w-full relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
        search
      </span>
      <input
        className="w-full pl-10 pr-4 py-2.5 bg-background border border-outline rounded-DEFAULT text-body-md focus:ring-1 focus:ring-secondary focus:border-secondary transition-all outline-none"
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default Buscador
