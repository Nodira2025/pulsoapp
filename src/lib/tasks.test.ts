import { describe, expect, it } from 'vitest'
import { taskText } from './tasks'
describe('task titles and descriptions', () => {
  it('keeps a short title separate from its full description', () => {
    expect(
      taskText({
        title: '  Diseñar portada  ',
        description: 'Usar el logo y los colores de la marca.',
      }),
    ).toEqual({ title: 'Diseñar portada', description: 'Usar el logo y los colores de la marca.' })
  })
  it('preserves all old long text and an existing description', () => {
    const original = 'Preparar las publicaciones para Instagram. '.repeat(8)
    const result = taskText({ title: original, description: 'Detalle adicional' })
    expect(result.title.length).toBeLessThanOrEqual(80)
    expect(result.title.endsWith('…')).toBe(true)
    expect(result.description).toBe(`${original}\n\nDetalle adicional`)
    expect(taskText(result)).toEqual(result)
  })
  it('preserves multiline task drafts', () => {
    expect(taskText({ title: 'Diseñar portada\nUsar el logo' })).toEqual({
      title: 'Diseñar portada Usar el logo',
      description: 'Diseñar portada\nUsar el logo',
    })
  })
  it('keeps imported notes in the description and requests a new title', () => {
    expect(taskText({ title: '', description: 'Nota extensa para convertir en tarea' })).toEqual({
      title: '',
      description: 'Nota extensa para convertir en tarea',
    })
  })
})
