import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, UploadCloud, CheckCircle2 } from 'lucide-react'
import { Modal, Dictation } from './UI'
import { useStore } from '../lib/store'
import { messageOf } from '../lib/utils'

export type Values = Record<string, any>
export interface Field {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: { value: string; label: string }[]
  optionsFor?: (v: Values) => { value: string; label: string }[]
  hint?: string
  placeholder?: string
  min?: string | number
  maxLength?: number
  max?: string | number
  step?: number
  accept?: string
  multiple?: boolean
  show?: (v: Values) => boolean
}
export interface Step {
  title: string
  description?: string
  fields: Field[]
}
export function Wizard({
  title,
  steps,
  initial,
  contextValues,
  normalizeInitial,
  draftId,
  onClose,
  onSave,
  validate,
  extra,
}: {
  title: string
  steps: Step[]
  initial: Values
  contextValues?: Values
  normalizeInitial?: (values: Values) => Values
  draftId: string
  onClose: () => void
  onSave: (v: Values) => Promise<void>
  validate?: (v: Values, step: number) => string | undefined
  extra?: (v: Values, step: number) => React.ReactNode
}) {
  const { user } = useStore()
  const key = `pulso-draft-${user?.id}-${draftId}`
  const [values, setValues] = useState<Values>(() => {
      try {
        const restored = {
          ...initial,
          ...JSON.parse(localStorage.getItem(key) || '{}'),
          ...contextValues,
        }
        return normalizeInitial ? normalizeInitial(restored) : restored
      } catch {
        const restored = { ...initial, ...contextValues }
        return normalizeInitial ? normalizeInitial(restored) : restored
      }
    }),
    [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const hasDraft = Boolean(localStorage.getItem(key))
  const [restored, setRestored] = useState(hasDraft)
  useEffect(() => {
    const safe = Object.fromEntries(
      Object.entries(values).filter(
        ([k, v]) =>
          !k.toLowerCase().includes('password') &&
          !(v instanceof File) &&
          !(Array.isArray(v) && v.some((x) => x instanceof File)),
      ),
    )
    try {
      localStorage.setItem(key, JSON.stringify(safe))
    } catch {
      /* Quota exceeded: keep current form in memory. */
    }
  }, [values, key])
  const change = (name: string, v: any) => {
    setValues((old) => ({
      ...old,
      [name]: v,
      ...(name === 'company_id' ? { project_id: '' } : {}),
    }))
    setError('')
  }
  const confirm = step === steps.length
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const problem = validate?.(values, step)
    if (problem) {
      setError(problem)
      return
    }
    if (!confirm) {
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      await onSave(values)
      localStorage.removeItem(key)
      onClose()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  const visible = (f: Field) => !f.show || f.show(values)
  steps = steps.map((s) => ({
    ...s,
    fields: s.fields.map((f) => ({
      ...f,
      options: f.optionsFor ? f.optionsFor(values) : f.options,
    })),
  }))
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form onSubmit={submit} className="wizard">
        <div className="wizard-progress">
          <span>
            Paso {step + 1} de {steps.length + 1}
          </span>
          <span>{confirm ? 'Revisar y confirmar' : steps[step].title}</span>
        </div>
        <div className="step-track">
          {[...steps, {}].map((_, i) => (
            <span key={i} className={i <= step ? 'active' : ''} />
          ))}
        </div>
        {restored && (
          <div className="draft-note">
            Recuperamos tu borrador. Los archivos deben seleccionarse nuevamente.
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setValues(initial)
                setRestored(false)
              }}
            >
              Empezar de nuevo
            </button>
          </div>
        )}
        <div className="wizard-body">
          {confirm ? (
            <>
              <div className="review-heading">
                <CheckCircle2 />
                <h3>Todo listo para guardar</h3>
              </div>
              <dl className="review">
                {steps
                  .flatMap((s) => s.fields)
                  .filter((f) => visible(f) && f.type !== 'password')
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>
                        {f.type === 'files'
                          ? values[f.key]?.map((x: File) => x.name).join(', ') || 'Sin archivos'
                          : f.type === 'multi'
                            ? f.options
                                ?.filter((o) => values[f.key]?.includes(o.value))
                                .map((o) => o.label)
                                .join(', ') || 'Sin seleccionar'
                            : f.type === 'checkbox'
                              ? values[f.key]
                                ? 'Sí'
                                : 'No'
                              : f.options
                                ? f.options.find((o) => o.value === values[f.key])?.label ||
                                  'Sin seleccionar'
                                : String(values[f.key] || '—')}
                      </dd>
                    </div>
                  ))}
              </dl>
            </>
          ) : (
            <>
              <h3>{steps[step].title}</h3>
              {steps[step].description && <p className="muted">{steps[step].description}</p>}
              {steps[step].fields.filter(visible).map((f) => (
                <div className="field" key={f.key}>
                  <label htmlFor={`field-${f.key}`}>
                    {f.label}
                    {f.required && <span className="required"> *</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <>
                      <textarea
                        id={`field-${f.key}`}
                        value={values[f.key] || ''}
                        onChange={(e) => change(f.key, e.target.value)}
                        required={f.required}
                        placeholder={f.placeholder}
                        rows={4}
                      />
                      <Dictation
                        onText={(t) =>
                          setValues((old) => ({
                            ...old,
                            [f.key]: `${old[f.key] || ''} ${t}`.trim(),
                          }))
                        }
                      />
                    </>
                  ) : f.type === 'select' ? (
                    <select
                      id={`field-${f.key}`}
                      value={values[f.key] || ''}
                      onChange={(e) => change(f.key, e.target.value)}
                      required={f.required}
                    >
                      <option value="">Seleccionar…</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'multi' ? (
                    <div className="choice-list">
                      {f.options?.map((o) => (
                        <label
                          key={o.value}
                          className={`choice ${(values[f.key] || []).includes(o.value) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={(values[f.key] || []).includes(o.value)}
                            onChange={(e) =>
                              change(
                                f.key,
                                e.target.checked
                                  ? [...(values[f.key] || []), o.value]
                                  : (values[f.key] || []).filter((x: string) => x !== o.value),
                              )
                            }
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'checkbox' ? (
                    <label className="checkbox-label">
                      <input
                        id={`field-${f.key}`}
                        type="checkbox"
                        checked={!!values[f.key]}
                        onChange={(e) => change(f.key, e.target.checked)}
                      />
                      {f.placeholder || 'Sí'}
                    </label>
                  ) : f.type === 'files' ? (
                    <div className="upload">
                      <UploadCloud size={24} />
                      <span>
                        {values[f.key]?.length
                          ? values[f.key].map((x: File) => x.name).join(', ')
                          : 'Seleccionar archivos'}
                      </span>
                      <input
                        aria-label={f.label}
                        id={`field-${f.key}`}
                        type="file"
                        multiple={f.multiple}
                        accept={f.accept}
                        onChange={(e) => change(f.key, Array.from(e.target.files || []))}
                      />
                    </div>
                  ) : (
                    <input
                      id={`field-${f.key}`}
                      name={f.key}
                      type={f.type || 'text'}
                      onInput={(e) => change(f.key, e.currentTarget.value)}
                      value={values[f.key] ?? ''}
                      min={f.min}
                      max={f.max}
                      maxLength={f.maxLength}
                      step={f.type === 'number' ? f.step || '0.01' : undefined}
                      required={f.required}
                      autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                      placeholder={f.placeholder}
                      onChange={(e) => change(f.key, e.target.value)}
                    />
                  )}
                  {f.hint && <small className="field-hint">{f.hint}</small>}
                </div>
              ))}
            </>
          )}
          {extra?.(values, step)}
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="wizard-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (step > 0) {
                setStep(step - 1)
                setError('')
              } else onClose()
            }}
          >
            <ArrowLeft size={17} />
            {step ? 'Atrás' : 'Cerrar'}
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : confirm ? 'Confirmar y guardar' : 'Continuar'}
            {confirm ? <Check size={17} /> : <ArrowRight size={17} />}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
