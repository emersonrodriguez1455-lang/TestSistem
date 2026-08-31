import { Loader2 } from 'lucide-react'

function Loading({ text = 'Cargando...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-on-surface-variant font-body-md text-body-md">
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

export default Loading
