import { useEffect, useRef, useState } from 'react'

/**
 * Texto que se ve como texto normal, pero al hacer clic se convierte
 * en un campo editable del mismo tamaño/estilo (sin recuadro de input).
 * Guarda con Enter o al perder el foco; Escape cancela.
 */
function InlineEditableText({ value, onChange, className = '', inputClassName = '', title }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onChange(trimmed)
    } else {
      setDraft(value)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-0 border-b border-secondary focus:outline-none focus:ring-0 p-0 ${inputClassName}`}
        style={{ width: `${Math.max(draft.length, 4)}ch` }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={title || 'Clic para editar'}
      className={`group inline-flex items-center gap-1 text-left hover:text-secondary transition-colors cursor-text ${className}`}
    >
      <span>{value}</span>
      <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-60 transition-opacity">
        edit
      </span>
    </button>
  )
}

export default InlineEditableText
