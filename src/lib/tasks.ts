/** Preserve the complete text when restoring tasks from the old single-field form. */
export function taskText<T extends { title?: string; description?: string }>(values: T) {
  const original = values.title || ''
  const compact = original.replace(/\s+/g, ' ').trim()
  const legacy = compact.length > 80 || /[\r\n]/.test(original)
  return {
    ...values,
    title: compact.length > 80 ? `${compact.slice(0, 79).trimEnd()}…` : compact,
    description: legacy
      ? [original, values.description].filter(Boolean).join('\n\n')
      : values.description || '',
  }
}
