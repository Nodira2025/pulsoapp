import React from 'react'
import ReactDOM from 'react-dom/client'
import { initializeSupabase } from './lib/supabase'
import { initDisplayScale } from './components/DisplayScale'
import './styles.css'
import './dark.css'
import './brand.css'
import './agenda.css'
import './display.css'
import './refinements.css'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
initDisplayScale()
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
const root = ReactDOM.createRoot(document.getElementById('root')!)
async function start() {
  try {
    initializeSupabase()
    const { default: App } = await import('./App')
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    root.render(
      <div className="auth-page">
        <div className="auth-card" role="alert">
          <h1>No pudimos iniciar PULSO.</h1>
          <p>
            {error instanceof Error
              ? error.message
              : 'Revisá la configuración e intentá nuevamente.'}
          </p>
          <button className="button primary" onClick={() => location.reload()}>
            Reintentar
          </button>
        </div>
      </div>,
    )
  }
}
void start()
