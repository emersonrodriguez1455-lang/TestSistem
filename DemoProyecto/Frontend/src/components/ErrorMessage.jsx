function ErrorMessage({ message }) {
  if (!message) return null

  return (
    <div className="error-message" role="alert">
      <strong>Error:</strong> {message}
    </div>
  )
}

export default ErrorMessage
