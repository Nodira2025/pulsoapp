import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Bell, Download, Check, Smartphone, Monitor } from 'lucide-react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { enablePush, disablePush, supportsPush } from '../lib/push'
import { messageOf } from '../lib/utils'
import { Modal } from './UI'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  !!(navigator as Navigator & { standalone?: boolean }).standalone
type DeviceState = {
  installed: boolean
  canInstall: boolean
  pushOn: boolean
  busy: string
  permission: NotificationPermission
  install: () => Promise<void>
  togglePush: () => Promise<void>
  show: () => void
}
const DeviceContext = createContext<DeviceState | null>(null)
export function useDevice() {
  return useContext(DeviceContext)!
}
export function DeviceProvider({ children }: { children: ReactNode }) {
  const { user, toast } = useStore()
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(standalone)
  const [pushOn, setPushOn] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [busy, setBusy] = useState('')
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const offer = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallEvent)
      setInstalled(false)
    }
    const done = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', offer)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', offer)
      window.removeEventListener('appinstalled', done)
    }
  }, [])
  useEffect(() => {
    let active = true
    setReady(false)
    setVisible(false)
    setPushOn(false)
    const refresh = async () => {
      if (supportsPush()) {
        if (active) setPermission(Notification.permission)
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          const subscription = await registration?.pushManager.getSubscription()
          const result =
            user && subscription
              ? await supabase
                  .from('push_subscriptions')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('endpoint', subscription.endpoint)
                  .maybeSingle()
              : null
          if (active) setPushOn(!!result?.data && Notification.permission === 'granted')
        } catch {
          if (active) setPushOn(false)
        }
      }
      if (active) setReady(true)
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [user?.id])
  useEffect(() => {
    if (!user || user.must_change_password || !ready || (installed && pushOn)) return
    let dismissed = 0
    try {
      dismissed = Number(localStorage.getItem(`pulso-device-dismissed:${user.id}`))
    } catch {
      /* Optional preference. */
    }
    if (Date.now() - dismissed < 7 * 86400000) return
    const timer = setTimeout(() => {
      if (!document.querySelector('dialog[open]')) setVisible(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [user?.id, user?.must_change_password, ready, installed, pushOn])
  function dismiss() {
    setVisible(false)
    if (user)
      try {
        localStorage.setItem(`pulso-device-dismissed:${user.id}`, String(Date.now()))
      } catch {
        /* Optional preference. */
      }
  }
  async function install() {
    if (!prompt) {
      setVisible(true)
      return
    }
    setBusy('install')
    try {
      await prompt.prompt()
      await prompt.userChoice
      // appinstalled is the completion signal; accepting a prompt alone is not installation.
      setPrompt(null)
    } catch (e) {
      toast(messageOf(e))
    } finally {
      setBusy('')
    }
  }
  async function togglePush() {
    if (!user) return
    setBusy('push')
    try {
      if (pushOn) {
        await disablePush()
        setPushOn(false)
      } else {
        await enablePush(user.id)
        setPushOn(true)
      }
      toast(
        pushOn
          ? 'Notificaciones desactivadas en este dispositivo.'
          : 'Notificaciones activadas en este dispositivo.',
      )
    } catch (e) {
      toast(messageOf(e))
    } finally {
      if (supportsPush()) setPermission(Notification.permission)
      setBusy('')
    }
  }
  return (
    <DeviceContext.Provider
      value={{
        installed,
        canInstall: !!prompt,
        pushOn,
        permission,
        busy,
        install,
        togglePush,
        show: () => setVisible(true),
      }}
    >
      {children}
      {visible && user && !user.must_change_password && (
        <Modal title="PULSO, siempre a mano" onClose={dismiss}>
          <div className="device-setup padded">
            <div className="device-hero">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
              <span className="eyebrow">TU EQUIPO, MÁS CERCA</span>
              <h2>
                Tu espacio de trabajo.
                <br />
                <em>También como app.</em>
              </h2>
              <p>
                Abrí PULSO desde tu pantalla de inicio y enterate de lo que necesita tu atención.
              </p>
            </div>
            <DeviceActions />
            <button className="text-button full" onClick={dismiss}>
              {installed && pushOn ? 'Listo, seguir trabajando' : 'Ahora no, seguir trabajando'}
            </button>
            <p className="field-hint">Podés configurar esto cuando quieras desde Mi perfil.</p>
          </div>
        </Modal>
      )}
    </DeviceContext.Provider>
  )
}
export function DeviceActions() {
  const device = useDevice()
  const android = /Android/i.test(navigator.userAgent)
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const blocked = device.permission === 'denied'
  return (
    <div className="device-actions">
      <section className="device-step">
        <div className="device-step-icon">
          {device.installed ? <Check /> : android || ios ? <Smartphone /> : <Monitor />}
        </div>
        <div>
          <h3>{device.installed ? 'PULSO está instalada' : 'Instalá PULSO'}</h3>
          <p>
            {device.installed
              ? 'Ya podés abrirla desde su propio icono.'
              : 'Un acceso directo, una ventana propia y todo tu equipo cerca.'}
          </p>
          {!device.installed &&
            (device.canInstall ? (
              <button
                className="button primary"
                disabled={!!device.busy}
                onClick={() => void device.install()}
              >
                <Download size={17} />
                {device.busy === 'install' ? 'Abriendo instalador…' : 'Instalar PULSO'}
              </button>
            ) : (
              <details className="install-guide">
                <summary>
                  Cómo instalar en {android ? 'Android' : ios ? 'iPhone o iPad' : 'Windows'}
                </summary>
                <p>
                  {android
                    ? 'En Chrome: abrí el menú ⋮ y elegí «Agregar a la pantalla principal» o «Instalar app».'
                    : ios
                      ? 'En Safari: tocá Compartir → Agregar a pantalla de inicio.'
                      : 'En Windows, abrí esta página en Chrome o Edge y buscá «Instalar PULSO» en el menú del navegador o el icono de instalación de la barra de direcciones.'}
                </p>
              </details>
            ))}
        </div>
      </section>
      <section className="device-step">
        <div className="device-step-icon">{device.pushOn ? <Check /> : <Bell />}</div>
        <div>
          <h3>{device.pushOn ? 'Notificaciones activadas' : 'Recibí las novedades'}</h3>
          <p>Recordatorios de reuniones, tareas y menciones en este dispositivo.</p>
          <button
            className="button secondary"
            disabled={!!device.busy || !supportsPush() || (blocked && !device.pushOn)}
            onClick={() => void device.togglePush()}
          >
            <Bell size={17} />
            {device.busy === 'push'
              ? 'Configurando…'
              : device.pushOn
                ? 'Desactivar notificaciones'
                : blocked
                  ? 'Permiso bloqueado'
                  : 'Activar notificaciones'}
          </button>
          {blocked && (
            <p className="field-hint">
              Habilitá las notificaciones en los permisos de este sitio, junto a la dirección del
              navegador, y volvé a intentarlo.
            </p>
          )}
          {!supportsPush() && (
            <p className="field-hint">
              Este navegador no admite avisos del dispositivo. Usá Chrome o Edge actualizado; las
              novedades también están en la campana.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
