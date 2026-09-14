import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Installment, Payment, Task, Meeting } from './types'
export const today = () => format(new Date(), 'yyyy-MM-dd')
export const dateLabel = (date?: string | null, pattern = 'd MMM yyyy') =>
  date ? format(parseISO(date), pattern, { locale: es }) : 'Sin fecha'
export const money = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
export const initials = (s: string) =>
  s
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0] || '')
    .join('')
    .toUpperCase()
export const progress = (tasks: Task[]) =>
  tasks.length
    ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
    : 0
export const balance = (i: Installment, payments: Payment[]) =>
  Math.max(
    0,
    Math.round(
      (Number(i.amount) -
        payments
          .filter((p) => p.installment_id === i.id)
          .reduce((a, p) => a + Number(p.amount), 0)) *
        100,
    ) / 100,
  )
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
export function safeUrl(raw?: string | null) {
  if (!raw) return undefined
  try {
    const u = new URL(raw)
    return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined
  } catch {
    return undefined
  }
}
export function whatsapp(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
export function conflicts(
  meetings: Meeting[],
  start: string,
  end: string,
  people: string[],
  exclude?: string,
) {
  return meetings.filter(
    (m) =>
      m.id !== exclude &&
      m.status === 'scheduled' &&
      new Date(m.starts_at) < new Date(end) &&
      new Date(m.ends_at) > new Date(start) &&
      m.attendees.some((a) => people.includes(a)),
  )
}
export function messageOf(e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === 'object' && e && 'message' in e
        ? String(e.message)
        : 'No se pudo guardar. Intentá nuevamente.'
  if (msg.includes('Invalid login credentials'))
    return 'El usuario o la contraseña no son correctos.'
  if (msg.includes('Failed to fetch'))
    return 'No pudimos conectar. Revisá tu conexión e intentá nuevamente.'
  if (msg.includes('duplicate key')) return 'Ya existe un registro con esos datos.'
  return msg
}
