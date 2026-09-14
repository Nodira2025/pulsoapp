/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react'
export function AppUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-notice" role="status">
      <span>Hay una nueva versión de PULSO.</span>
      <button className="button primary" onClick={() => void updateServiceWorker(true)}>
        Actualizar
      </button>
      <button className="text-button" onClick={() => setNeedRefresh(false)}>
        Después
      </button>
    </div>
  )
}
