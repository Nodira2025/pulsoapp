import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ListTodo, Wallet, ArrowRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { useDevice } from './DeviceSetup'
import { attentionItems } from '../lib/agenda'
import { today, dateLabel, messageOf } from '../lib/utils'
import { Modal } from './UI'

export function AttentionBrief() {
  const { user, data, loading, update, toast } = useStore()
  const device = useDevice(),
    navigate = useNavigate(),
    location = useLocation()
  const [open, setOpen] = useState(false),
    [now, setNow] = useState(new Date())
  const items = user ? attentionItems(data, user.id, now) : []
  const unread = data.notifications.filter((n) => !n.read_at)
  const key = `pulso-attention:${user?.id}:${today()}`
  const fingerprint = JSON.stringify([
    items.map((i) => [i.id, i.date, i.detail]),
    unread.map((n) => n.id),
  ])
  useEffect(() => {
    const show = () => {
      setNow(new Date())
      setOpen(true)
    }
    const tick = setInterval(() => setNow(new Date()), 60000)
    window.addEventListener('pulso:show-attention', show)
    return () => {
      clearInterval(tick)
      window.removeEventListener('pulso:show-attention', show)
    }
  }, [])
  useEffect(() => {
    setOpen(false)
  }, [user?.id])
  useEffect(() => {
    if (
      !user ||
      user.must_change_password ||
      loading ||
      !device.onboardingReady ||
      device.onboardingOpen ||
      (!device.installed && !device.onboardingHandled) ||
      (!items.length && !unread.length)
    )
      return
    try {
      if (sessionStorage.getItem(key) === 'shown') return
    } catch {
      /* Optional preference. */
    }
    const timer = setTimeout(() => {
      if (!document.querySelector('dialog[open]')) setOpen(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [
    user?.id,
    user?.must_change_password,
    loading,
    device.onboardingReady,
    device.onboardingOpen,
    device.onboardingHandled,
    device.installed,
    fingerprint,
    key,
    location.pathname,
  ])
  function close() {
    try {
      sessionStorage.setItem(key, 'shown')
    } catch {
      /* Keep working if storage is unavailable. */
    }
    setOpen(false)
  }
  if (!open || !user || user.must_change_password || device.onboardingOpen) return null
  return (
    <Modal title="Lo que necesita tu atención" onClose={close}>
      <div className="padded attention-brief">
        <p className="muted">
          Hola, {user.display_name}. Estos son tus próximos compromisos y los avisos del equipo.
        </p>
        <div className="attention-counts">
          {[
            { kind: 'task', name: 'Tareas', Icon: ListTodo },
            { kind: 'meeting', name: 'Reuniones', Icon: CalendarDays },
            { kind: 'payment', name: 'Cobros', Icon: Wallet },
          ].map(({ kind, name, Icon }) => (
            <div key={kind}>
              <Icon size={18} />
              <strong>{items.filter((i) => i.kind === kind).length}</strong>
              <span>{name}</span>
            </div>
          ))}
        </div>
        <p className="field-hint">
          Incluye vencimientos hasta mañana y reuniones de hoy y mañana. Los cobros corresponden a
          los proyectos a tu cargo.
        </p>
        {items.map((item) => (
          <button
            className={`attention-item ${item.urgent ? 'urgent' : ''}`}
            key={item.id}
            onClick={() => {
              close()
              navigate(item.href)
            }}
          >
            {item.kind === 'task' ? (
              <ListTodo size={20} />
            ) : item.kind === 'meeting' ? (
              <CalendarDays size={20} />
            ) : (
              <Wallet size={20} />
            )}
            <span>
              <small>
                {item.kind === 'task' ? 'TAREA' : item.kind === 'meeting' ? 'REUNIÓN' : 'COBRO'}
              </small>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
        {unread.length > 0 && (
          <h3 className="attention-heading">Novedades sin leer · {unread.length}</h3>
        )}
        {unread.slice(0, 10).map((n) => (
          <button
            className="attention-item"
            key={n.id}
            onClick={async () => {
              try {
                await update('notifications', n.id, { read_at: new Date().toISOString() })
                close()
                navigate(n.href.startsWith('/') ? n.href : '/')
              } catch (error) {
                toast(messageOf(error))
              }
            }}
          >
            <Bell size={20} />
            <span>
              <strong>{n.title}</strong>
              <span>{n.body}</span>
              <small>{dateLabel(n.created_at, 'd MMM · HH:mm')}</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
        {!items.length && !unread.length && <p>Estás al día. Tus nuevos avisos aparecerán acá.</p>}
        <button className="button primary full" onClick={close}>
          Seguir trabajando
        </button>
      </div>
    </Modal>
  )
}
