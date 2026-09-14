import type { Meeting, Data } from './types'
import { addDays, format, endOfDay } from 'date-fns'
import { balance, dateLabel, money, whatsapp } from './utils'

export function meetingWhatsapp(m: Meeting, data: Data) {
  const company = data.companies.find((c) => c.id === m.company_id)
  const recipients = company
    ? [{ id: company.id, name: company.contact_name || company.name, phone: company.phone }]
    : data.profiles
        .filter((p) => p.active && m.attendees.includes(p.id))
        .map((p) => ({ id: p.id, name: p.display_name, phone: p.phone }))
  return recipients.map((p) => ({
    ...p,
    url: /^\d{7,15}$/.test(p.phone.replace(/\D/g, ''))
      ? whatsapp(
          p.phone,
          `Hola, ${p.name}. ${m.status === 'cancelled' ? 'Se canceló' : m.status === 'missed' ? 'No se realizó' : m.status === 'completed' ? 'Se realizó' : 'Te recordamos'} la reunión de PULSO: ${m.title}. ${dateLabel(m.starts_at, 'd MMMM yyyy')}, de ${dateLabel(m.starts_at, 'HH:mm')} a ${dateLabel(m.ends_at, 'HH:mm')} (${Intl.DateTimeFormat().resolvedOptions().timeZone}).${m.location ? ` Lugar o enlace: ${m.location}` : ''}`,
        )
      : null,
  }))
}

// Use visual duration too, so short meetings remain readable without hiding their neighbours.
export function layoutMeetings(meetings: Meeting[]) {
  const sorted = [...meetings].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const output: { meeting: Meeting; lane: number; columns: number }[] = []
  let group: typeof output = [],
    ends: number[] = []
  const finish = () => {
    for (const item of group) item.columns = ends.length
    output.push(...group)
    group = []
    ends = []
  }
  for (const meeting of sorted) {
    const start = new Date(meeting.starts_at).getTime()
    const end = Math.max(new Date(meeting.ends_at).getTime(), start + 45 * 60000)
    if (group.length && start >= Math.max(...ends)) finish()
    let lane = ends.findIndex((e) => e <= start)
    if (lane < 0) lane = ends.length
    ends[lane] = end
    group.push({ meeting, lane, columns: 1 })
  }
  finish()
  return output
}

export type AttentionItem = {
  id: string
  kind: 'task' | 'meeting' | 'payment'
  title: string
  detail: string
  href: string
  urgent: boolean
  date: string
}
export function attentionItems(data: Data, userId: string, now = new Date()): AttentionItem[] {
  const today = format(now, 'yyyy-MM-dd'),
    tomorrow = format(addDays(now, 1), 'yyyy-MM-dd')
  const due = (date: string) =>
    date < today ? 'Vencido' : date === today ? 'Vence hoy' : 'Vence mañana'
  const tasks: AttentionItem[] = data.tasks
    .filter((t) => t.assignee_id === userId && t.status !== 'done' && t.due_date <= tomorrow)
    .map((t) => ({
      id: `task:${t.id}`,
      kind: 'task',
      title: t.title,
      detail: `${due(t.due_date)} · ${dateLabel(t.due_date)}`,
      href: `/proyectos/${t.project_id}`,
      urgent: t.due_date <= today,
      date: t.due_date,
    }))
  const meetings: AttentionItem[] = data.meetings
    .filter(
      (m) =>
        m.status === 'scheduled' &&
        m.attendees.includes(userId) &&
        new Date(m.ends_at) > now &&
        new Date(m.starts_at) <= endOfDay(addDays(now, 1)),
    )
    .map((m) => ({
      id: `meeting:${m.id}`,
      kind: 'meeting',
      title: m.title,
      detail: `${dateLabel(m.starts_at, 'EEE d MMM · HH:mm')} · ${data.companies.find((c) => c.id === m.company_id)?.name || 'Equipo PULSO'}`,
      href: `/agenda?reunion=${m.id}`,
      urgent: new Date(m.starts_at).getTime() <= now.getTime() + 3600000,
      date: m.starts_at,
    }))
  const payments: AttentionItem[] = data.installments
    .filter(
      (i) =>
        data.projects.some((p) => p.id === i.project_id && p.owner_id === userId) &&
        i.due_date <= tomorrow &&
        balance(i, data.payments) > 0,
    )
    .map((i) => ({
      id: `payment:${i.id}`,
      kind: 'payment',
      title: i.title,
      detail: `${due(i.due_date)} · ${money(balance(i, data.payments))} · ${data.projects.find((p) => p.id === i.project_id)?.name || ''}`,
      href: '/cobros',
      urgent: i.due_date <= today,
      date: i.due_date,
    }))
  return [...meetings, ...tasks, ...payments].sort(
    (a, b) => Number(b.urgent) - Number(a.urgent) || a.date.localeCompare(b.date),
  )
}
