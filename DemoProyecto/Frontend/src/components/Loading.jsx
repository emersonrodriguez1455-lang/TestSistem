function Loading({ text = 'Cargando...' }) {
  return (
    <div className="loading">
      <span className="loading-spinner" aria-hidden="true"></span>
      <span>{text}</span>
    </div>
  )
}

export default Loading
