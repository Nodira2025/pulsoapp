import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './dark.css'
import './brand.css'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (this.state.error)
      return (
        <div className="auth-page">
          <div className="auth-card">
            <h1>Algo no salió como esperábamos.</h1>
            <p>Recargá la página para volver a tu espacio.</p>
            <button className="button primary" onClick={() => location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      )
    return this.props.children
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
