function ErrorMessage({ message }) {
  if (!message) return null

  return (import { AlertTriangle } from 'lucide-react'

function ErrorMessage({ message }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/40 px-3.5 py-2.5 font-label-sm text-label-sm text-error"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2.25} aria-hidden="true" />
      <span>
        <strong className="font-bold">Error:</strong> {message}
      </span>
    </div>
  )
}

export default ErrorMessage

    <div className="error-message" role="alert">
      <strong>Error:</strong> {message}
    </div>
  )
}

export default ErrorMessage
