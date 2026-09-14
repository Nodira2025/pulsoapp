import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, ArrowUpRight, Paperclip, FileText, Mic, MicOff, LoaderCircle } from 'lucide-react'
import { fileUrl } from '../lib/supabase'
import { initials, messageOf, safeUrl } from '../lib/utils'
import { useStore } from '../lib/store'
import { labels, type Attachment } from '../lib/types'

const signedImages = new Map<string, { url: string; expires: number }>()
export function Avatar({
  name,
  path,
  size = 40,
  square = false,
}: {
  name: string
  path?: string | null
  size?: number
  square?: boolean
}) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    setUrl('')
    if (path) {
      const cached = signedImages.get(path)
      if (cached && cached.expires > Date.now()) setUrl(cached.url)
      else
        void fileUrl(path)
          .then((u) => {
            signedImages.set(path, { url: u, expires: Date.now() + 3300000 })
            if (live) setUrl(u)
          })
          .catch(() => {})
    }
    return () => {
      live = false
    }
  }, [path])
  return (
    <span
      className={`avatar ${square ? 'square' : ''} tone-${name.charCodeAt(0) % 5}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      {url ? <img src={url} alt={name} onError={() => setUrl('')} /> : initials(name)}
    </span>
  )
}
export function Badge({ status, children }: { status?: string; children?: ReactNode }) {
  return (
    <span className={`badge ${status || ''}`}>{children || labels[status || ''] || status}</span>
  )
}
export function Empty({
  icon: Icon = FileText,
  title,
  description,
  action,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress-line">
      <div className="progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  )
}
export function External({
  href,
  children,
  className = '',
}: {
  href?: string | null
  children: ReactNode
  className?: string
}) {
  const url = safeUrl(href)
  return url ? (
    <a className={`external ${className}`} href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={15} />
    </a>
  ) : null
}
export function FileLink({
  path,
  name = 'Ver comprobante',
  share = false,
}: {
  path: string
  name?: string
  share?: boolean
}) {
  const { toast } = useStore()
  return (
    <button
      className="text-button"
      onClick={async () => {
        try {
          const url = await fileUrl(path, share ? 604800 : 3600)
          const a = document.createElement('a')
          a.href = url
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.click()
        } catch (e) {
          toast(messageOf(e))
        }
      }}
    >
      <Paperclip size={15} />
      {name}
    </button>
  )
}
export function Attachments({ items }: { items: Attachment[] }) {
  return (
    <div className="attachments">
      {items.map((a) => (
        <div key={a.id}>
          {a.path ? (
            <FileLink path={a.path} name={a.name} />
          ) : (
            <External href={a.url}>{a.name}</External>
          )}
        </div>
      ))}
    </div>
  )
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    const prev = document.activeElement as HTMLElement
    d?.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = old
      prev?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <header className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X />
        </button>
      </header>
      {children}
    </dialog>
  )
}
export function Spinner() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Cargando tu espacio…</span>
    </div>
  )
}
type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechEngine = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
export function Dictation({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false),
    [error, setError] = useState('')
  const instance = useRef<SpeechEngine | null>(null),
    callback = useRef(onText)
  callback.current = onText
  const Constructor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechEngine
        webkitSpeechRecognition?: new () => SpeechEngine
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechEngine })
      .webkitSpeechRecognition
  useEffect(
    () => () => {
      if (instance.current) {
        instance.current.onresult = null
        instance.current.onerror = null
        instance.current.onend = null
        instance.current.stop()
      }
    },
    [],
  )
  if (!Constructor)
    return (
      <span className="field-hint">
        El dictado no está disponible en este navegador. Podés usar el micrófono del teclado.
      </span>
    )
  return (
    <div className="dictation">
      <button
        type="button"
        className={`text-button ${listening ? 'recording' : ''}`}
        onClick={() => {
          if (listening) {
            instance.current?.stop()
            return
          }
          setError('')
          const s = new Constructor()
          s.lang = 'es-AR'
          s.continuous = true
          s.interimResults = false
          s.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++)
              if (e.results[i].isFinal) callback.current(e.results[i][0].transcript)
          }
          s.onerror = (e) => {
            setError(
              e.error === 'not-allowed'
                ? 'Permití el micrófono para dictar.'
                : 'No pudimos escuchar. Probá nuevamente.',
            )
            setListening(false)
          }
          s.onend = () => setListening(false)
          instance.current = s
          try {
            s.start()
            setListening(true)
          } catch {
            setError('No se pudo iniciar el micrófono.')
          }
        }}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}{' '}
        {listening ? 'Detener dictado' : 'Dictar con micrófono'}
      </button>
      {error && <span className="field-hint">{error}</span>}
    </div>
  )
}
