import { describe, expect, it } from 'vitest'
import { balance, conflicts, normalize, progress, safeUrl, whatsapp } from './utils'
import type { Installment, Payment, Meeting, Task } from './types'
describe('cobros parciales', () => {
  const installment = { id: 'q1', amount: 1000 } as Installment
  it('descuenta únicamente pagos de la cuota', () =>
    expect(
      balance(installment, [
        { installment_id: 'q1', amount: 350 },
        { installment_id: 'q2', amount: 900 },
      ] as Payment[]),
    ).toBe(650))
  it('redondea centavos sin crear deuda residual', () =>
    expect(
      balance(
        { id: 'q1', amount: 0.3 } as Installment,
        [
          { installment_id: 'q1', amount: 0.1 },
          { installment_id: 'q1', amount: 0.2 },
        ] as Payment[],
      ),
    ).toBe(0))
})
describe('agenda', () => {
  const meetings = [
    {
      id: 'a',
      status: 'scheduled',
      starts_at: '2026-09-14T13:00:00Z',
      ends_at: '2026-09-14T14:00:00Z',
      attendees: ['franco'],
    },
    {
      id: 'b',
      status: 'cancelled',
      starts_at: '2026-09-14T13:00:00Z',
      ends_at: '2026-09-14T15:00:00Z',
      attendees: ['franco'],
    },
  ] as Meeting[]
  it('detecta el cruce de un participante', () =>
    expect(
      conflicts(meetings, '2026-09-14T13:30:00Z', '2026-09-14T14:30:00Z', ['franco']),
    ).toHaveLength(1))
  it('permite reuniones consecutivas y otros participantes', () => {
    expect(
      conflicts(meetings, '2026-09-14T14:00:00Z', '2026-09-14T15:00:00Z', ['franco']),
    ).toHaveLength(0)
    expect(
      conflicts(meetings, '2026-09-14T13:00:00Z', '2026-09-14T14:00:00Z', ['florencia']),
    ).toHaveLength(0)
  })
  it('no compara la reunión editada consigo misma', () =>
    expect(
      conflicts(meetings, '2026-09-14T13:00:00Z', '2026-09-14T14:00:00Z', ['franco'], 'a'),
    ).toHaveLength(0))
})
describe('contexto y enlaces', () => {
  it('calcula avance a partir de tareas finalizadas', () => {
    expect(progress([])).toBe(0)
    expect(
      progress([
        { status: 'done' },
        { status: 'blocked' },
        { status: 'doing' },
        { status: 'done' },
      ] as Task[]),
    ).toBe(50)
  })
  it('busca sin distinguir acentos o mayúsculas', () =>
    expect(normalize('  Café AURORA ')).toBe('cafe aurora'))
  it('rechaza protocolos ejecutables', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<script>')).toBeUndefined()
    expect(safeUrl('https://example.com')).toBe('https://example.com/')
  })
  it('codifica mensajes y limpia teléfonos para WhatsApp', () =>
    expect(whatsapp('+54 (9) 111', 'Pago & saldo')).toBe(
      'https://wa.me/549111?text=Pago%20%26%20saldo',
    ))
})
