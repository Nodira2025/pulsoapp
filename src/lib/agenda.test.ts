import { describe, expect, it } from 'vitest'
import { attentionItems, layoutMeetings, meetingWhatsapp } from './agenda'
import {
  emptyData,
  type Data,
  type Meeting,
  type Task,
  type Project,
  type Installment,
  type Payment,
  type Profile,
  type Company,
} from './types'
const meeting = (id: string, start: string, end: string) =>
  ({
    id,
    starts_at: `2026-09-15T${start}:00-03:00`,
    ends_at: `2026-09-15T${end}:00-03:00`,
    status: 'scheduled',
    attendees: ['u'],
    title: 'Revisión',
    location: '',
  }) as Meeting
describe('agenda legible', () => {
  it('separa reuniones superpuestas y devuelve el ancho completo al siguiente grupo', () => {
    const result = layoutMeetings([
      meeting('a', '10:00', '11:00'),
      meeting('b', '10:30', '11:30'),
      meeting('c', '12:00', '13:00'),
    ])
    expect(result.map((x) => [x.lane, x.columns])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ])
  })
  it('protege el tamaño visual de reuniones de cinco minutos', () => {
    const result = layoutMeetings([meeting('a', '10:00', '10:05'), meeting('b', '10:10', '10:15')])
    expect(result[0].columns).toBe(2)
  })
})
describe('resumen del día', () => {
  const data: Data = {
    ...emptyData,
    projects: [{ id: 'p', owner_id: 'u' } as Project],
    tasks: [
      { id: 'a', assignee_id: 'u', due_date: '2026-09-15', status: 'todo', project_id: 'p' },
      { id: 'b', assignee_id: 'u', due_date: '2026-09-16', status: 'todo' },
      { id: 'c', assignee_id: 'other', due_date: '2026-09-14', status: 'todo' },
      { id: 'd', assignee_id: 'u', due_date: '2026-09-14', status: 'done' },
    ] as Task[],
    installments: [
      { id: 'q', project_id: 'p', amount: 100, due_date: '2026-09-15' },
      { id: 'paid', project_id: 'p', amount: 100, due_date: '2026-09-14' },
    ] as Installment[],
    payments: [
      { installment_id: 'q', amount: 40 },
      { installment_id: 'paid', amount: 100 },
    ] as Payment[],
    meetings: [
      meeting('tomorrow', '10:00', '11:00'),
      { ...meeting('cancelled', '10:00', '11:00'), status: 'cancelled' },
    ],
  }
  it('anticipa un día, respeta responsables y excluye tareas terminadas, cuotas pagadas y reuniones canceladas', () => {
    const items = attentionItems(data, 'u', new Date(2026, 8, 14, 12))
    expect(items.map((i) => i.id).sort()).toEqual(['meeting:tomorrow', 'payment:q', 'task:a'])
    expect(items.find((i) => i.id === 'payment:q')?.detail).toContain('60')
    expect(items.find((i) => i.id === 'task:a')?.detail).toContain('mañana')
  })
})
describe('destinatarios WhatsApp', () => {
  const data: Data = {
    ...emptyData,
    profiles: [
      { id: 'u', active: true, display_name: 'Franco', phone: '+54 9 381 1234567' },
      { id: 'v', active: true, display_name: 'Florencia', phone: '' },
    ] as Profile[],
    companies: [
      { id: 'c', name: 'Empresa', contact_name: 'Contacto', phone: '+54 9 381 7654321' },
    ] as Company[],
  }
  it('una reunión interna usa sus participantes y señala teléfonos faltantes', () => {
    const links = meetingWhatsapp(
      { ...meeting('a', '10:00', '11:00'), attendees: ['u', 'v'] },
      data,
    )
    expect(links[0].url).toContain('wa.me/5493811234567')
    expect(links[1].url).toBeNull()
  })
  it('una reunión de empresa dirige el aviso al contacto de esa empresa', () => {
    const links = meetingWhatsapp({ ...meeting('a', '10:00', '11:00'), company_id: 'c' }, data)
    expect(links).toHaveLength(1)
    expect(links[0].url).toContain('wa.me/5493817654321')
  })
})
