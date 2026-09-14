import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  addDays,
  addMonths,
  addWeeks,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
  differenceInMinutes,
} from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  Video,
  MapPin,
  Phone,
  Repeat,
  Pencil,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { dateLabel, normalize, messageOf, whatsapp } from '../lib/utils'
import type { Meeting } from '../lib/types'
import { Avatar, Badge, Empty, PageTitle, Modal, Dictation, External } from '../components/UI'
import type { OpenForm } from './Feed'

export function meetingEdit(m: Meeting) {
  return {
    ...m,
    company_id: m.company_id || 'internal',
    date: format(new Date(m.starts_at), 'yyyy-MM-dd'),
    time: format(new Date(m.starts_at), 'HH:mm'),
    duration: String(differenceInMinutes(new Date(m.ends_at), new Date(m.starts_at))),
    reminder_minutes: String(m.reminder_minutes),
  }
}
export function MeetingList({ meetings, open }: { meetings: Meeting[]; open: OpenForm }) {
  const { data } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <>
      {meetings.map((m) => {
        const c = data.companies.find((c) => c.id === m.company_id)
        const Icon =
          m.location_type === 'virtual' ? Video : m.location_type === 'presencial' ? MapPin : Phone
        return (
          <button className="card meeting-card" key={m.id} onClick={() => setSelected(m.id)}>
            <div className="meeting-date">
              <strong>{dateLabel(m.starts_at, 'dd')}</strong>
              <span>{dateLabel(m.starts_at, 'MMM')}</span>
            </div>
            <div className="grow">
              <div className="meeting-card-title">
                <strong>{m.title}</strong>
                <Badge status={m.status} />
              </div>
              <span>{c?.name || 'Equipo PULSO'}</span>
              <div className="meta">
                <Clock size={14} />
                {dateLabel(m.starts_at, 'HH:mm')} – {dateLabel(m.ends_at, 'HH:mm')}{' '}
                <Icon size={14} />
                {m.location_type}
                {m.series_id && <Repeat size={14} />}
              </div>
            </div>
            <div className="avatar-stack">
              {m.attendees.slice(0, 3).map((id) => {
                const p = data.profiles.find((p) => p.id === id)
                return (
                  <Avatar
                    key={id}
                    name={p?.display_name || 'Equipo'}
                    path={p?.avatar_path}
                    size={28}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
      {!meetings.length && <p className="muted empty-inline">No hay reuniones en esta vista.</p>}
      {selected && data.meetings.find((m) => m.id === selected) && (
        <MeetingDetail
          meeting={data.meetings.find((m) => m.id === selected)!}
          open={open}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
export function MeetingDetail({
  meeting: m,
  open,
  onClose,
}: {
  meeting: Meeting
  open: OpenForm
  onClose: () => void
}) {
  const { data, update, toast } = useStore(),
    [outcome, setOutcome] = useState(m.outcome),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(m.status)
  const c = data.companies.find((c) => c.id === m.company_id),
    project = data.projects.find((p) => p.id === m.project_id),
    previous = data.meetings
      .filter(
        (x) =>
          x.id !== m.id && x.company_id === m.company_id && x.status === 'completed' && x.outcome,
      )
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]
  const tasks = data.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      (m.project_id
        ? t.project_id === m.project_id
        : data.projects.some((p) => p.id === t.project_id && p.company_id === m.company_id)),
  )
  return (
    <Modal title="Detalle de reunión" onClose={onClose} wide>
      <div className="meeting-detail padded">
        <div className="detail-meeting-head">
          <Avatar name={c?.name || 'PULSO'} path={c?.logo_path} size={52} square />
          <div>
            <span className="eyebrow">{c?.name || 'EQUIPO PULSO'}</span>
            <h2>{m.title}</h2>
          </div>
        </div>
        <div className="meeting-info">
          <span>
            <CalendarDays size={17} />
            {dateLabel(m.starts_at, 'EEEE d MMMM')}
          </span>
          <span>
            <Clock size={17} />
            {dateLabel(m.starts_at, 'HH:mm')} – {dateLabel(m.ends_at, 'HH:mm')}
          </span>
          <Badge status={m.status} />
        </div>
        <div className="person-list">
          {m.attendees.map((id) => {
            const p = data.profiles.find((p) => p.id === id)
            return (
              <span className="person-inline" key={id}>
                <Avatar name={p?.display_name || 'Equipo'} path={p?.avatar_path} size={25} />
                {p?.display_name}
              </span>
            )
          })}
        </div>
        {m.guests && (
          <p>
            <strong>Invitados:</strong> {m.guests}
          </p>
        )}
        {project && (
          <Link to={`/proyectos/${project.id}`} onClick={onClose}>
            {project.name}
          </Link>
        )}
        <div className="link-row">
          {m.location_type === 'virtual' ? (
            <External href={m.location}>
              <Video size={17} />
              Entrar a la reunión
            </External>
          ) : m.location_type === 'presencial' ? (
            <External
              href={
                m.location.startsWith('http')
                  ? m.location
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`
              }
            >
              <MapPin size={17} />
              {m.location || 'Sin dirección'}
            </External>
          ) : (
            m.location && (
              <a className="external" href={`tel:${m.location.replace(/[^+\d]/g, '')}`}>
                <Phone size={17} />
                {m.location}
              </a>
            )
          )}
          {c && (
            <External
              href={whatsapp(
                c.phone,
                `Hola, ${c.contact_name || c.name}. Te compartimos la reunión de PULSO: ${m.title}, el ${dateLabel(m.starts_at, 'd MMMM yyyy')} de ${dateLabel(m.starts_at, 'HH:mm')} a ${dateLabel(m.ends_at, 'HH:mm')} (${Intl.DateTimeFormat().resolvedOptions().timeZone}). ${m.location || ''}`,
              )}
            >
              <MessageCircle size={17} />
              Compartir por WhatsApp
            </External>
          )}
        </div>
        <div className="meeting-section">
          <h3>Temas para conversar</h3>
          <p className="preserve-lines">{m.notes || 'Sin temas cargados.'}</p>
        </div>
        {previous && (
          <details className="meeting-section">
            <summary>Lo que acordamos la última vez</summary>
            <p className="preserve-lines">{previous.outcome}</p>
          </details>
        )}
        {tasks.length > 0 && (
          <details className="meeting-section">
            <summary>{tasks.length} tareas abiertas de esta empresa</summary>
            {tasks.slice(0, 8).map((t) => (
              <p key={t.id}>
                {t.title} · {data.profiles.find((p) => p.id === t.assignee_id)?.display_name}
              </p>
            ))}
          </details>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              await update('meetings', m.id, { outcome, status })
              toast('Resultado de la reunión guardado.')
              onClose()
            } catch (e) {
              toast(messageOf(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="meeting-outcome">Resultado y acuerdos</label>
            <textarea
              id="meeting-outcome"
              rows={4}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="¿Qué conversamos? ¿Qué acordamos? ¿Quién sigue?"
            />
            <Dictation onText={(t) => setOutcome((old) => `${old} ${t}`.trim())} />
          </div>
          <div className="field">
            <label htmlFor="meeting-status">Estado de la reunión</label>
            <select
              id="meeting-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Meeting['status'])}
            >
              <option value="scheduled">Programada</option>
              <option value="completed">Realizada</option>
              <option value="cancelled">Cancelada</option>
              <option value="missed">No se realizó</option>
            </select>
          </div>
          <div className="button-row">
            <button className="button primary" disabled={busy}>
              <CheckCircle2 size={17} />
              {busy ? 'Guardando…' : 'Guardar resultado'}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                onClose()
                open({
                  kind: 'task',
                  initial: {
                    company_id: m.company_id || '',
                    project_id: m.project_id || '',
                    title: outcome || '',
                  },
                })
              }}
            >
              <Plus size={17} />
              Crear tarea
            </button>
          </div>
        </form>
        <div className="meeting-section">
          <button
            className="text-button"
            onClick={() => {
              onClose()
              open({ kind: 'meeting', id: m.id, initial: meetingEdit(m) })
            }}
          >
            <Pencil size={16} />
            Editar o reprogramar{m.series_id ? ' esta reunión' : ''}
          </button>
          {m.series_id && (
            <p className="field-hint">El cambio se aplica a esta fecha de la serie.</p>
          )}
        </div>
        {data.meeting_changes.some((h) => h.meeting_id === m.id) && (
          <details className="meeting-section">
            <summary>Historial de cambios</summary>
            {data.meeting_changes
              .filter((h) => h.meeting_id === m.id)
              .map((h) => (
                <p key={h.id} className="small">
                  {dateLabel(h.created_at, 'd MMM HH:mm')} ·{' '}
                  {data.profiles.find((p) => p.id === h.changed_by)?.display_name || 'Equipo'}:{' '}
                  {dateLabel(h.old_starts_at, 'd MMM HH:mm')} →{' '}
                  {dateLabel(h.new_starts_at, 'd MMM HH:mm')} · {h.old_status} → {h.new_status}
                </p>
              ))}
          </details>
        )}
      </div>
    </Modal>
  )
}
export function Agenda({ open }: { open: OpenForm }) {
  const { data } = useStore(),
    [params, setParams] = useSearchParams(),
    [date, setDate] = useState(new Date()),
    [mode, setMode] = useState('week'),
    [search, setSearch] = useState(''),
    [person, setPerson] = useState(''),
    [company, setCompany] = useState(''),
    [state, setState] = useState('all')
  const calendarRef = useRef<HTMLDivElement>(null)
  const week = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(date, { weekStartsOn: 1 }), i),
  )
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  })
  const filtered = data.meetings.filter(
    (m) =>
      (!person || m.attendees.includes(person)) &&
      (!company || m.company_id === company) &&
      (state === 'all' || m.status === state) &&
      normalize(
        `${m.title} ${m.guests} ${data.companies.find((c) => c.id === m.company_id)?.name || ''}`,
      ).includes(normalize(search)),
  )
  const dayMeetings = filtered
    .filter((m) => isSameDay(new Date(m.starts_at), date))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const selected = data.meetings.find((m) => m.id === params.get('reunion'))
  useEffect(() => {
    if (calendarRef.current) calendarRef.current.scrollTop = 8 * 48
  }, [mode])
  const shift = (n: number) =>
    setDate((d) =>
      mode === 'month' ? addMonths(d, n) : mode === 'day' ? addDays(d, n) : addWeeks(d, n),
    )
  const show = (m: Meeting) => setParams({ reunion: m.id })
  return (
    <>
      <PageTitle
        eyebrow="TIEMPO PARA CONECTAR"
        title="Agenda"
        description="Nuestras reuniones, con todo el contexto a mano."
        action={
          <button className="button primary" onClick={() => open({ kind: 'meeting' })}>
            <Plus size={18} />
            Agendar reunión
          </button>
        }
      />
      <div className="toolbar agenda-filters">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar reuniones"
            placeholder="Buscar empresa, contacto o reunión"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar participante"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        >
          <option value="">Todo el equipo</option>
          {data.profiles.map((p) => (
            <option value={p.id} key={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar empresa"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <option value="">Todas las empresas</option>
          {data.companies.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar estado de reunión"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="scheduled">Programadas</option>
          <option value="completed">Realizadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="missed">No se realizaron</option>
        </select>
      </div>
      <div className="card calendar-card">
        <header className="calendar-toolbar">
          <div className="calendar-navigation">
            <button className="icon-button" aria-label="Período anterior" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </button>
            <h2>{dateLabel(format(date, 'yyyy-MM-dd'), 'MMMM yyyy')}</h2>
            <button className="icon-button" aria-label="Período siguiente" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </button>
            <button className="button secondary compact" onClick={() => setDate(new Date())}>
              Hoy
            </button>
          </div>
          <div className="segmented">
            <button className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>
              Día
            </button>
            <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>
              Semana
            </button>
            <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>
              Mes
            </button>
          </div>
        </header>
        {mode !== 'month' && (
          <div className="mobile-week">
            {week.map((d) => (
              <button
                key={d.toISOString()}
                className={isSameDay(d, date) ? 'active' : ''}
                onClick={() => setDate(d)}
              >
                <span>{dateLabel(format(d, 'yyyy-MM-dd'), 'EEE')}</span>
                <strong>{format(d, 'd')}</strong>
                <i
                  className={
                    filtered.some((m) => isSameDay(new Date(m.starts_at), d)) ? 'has-meetings' : ''
                  }
                />
              </button>
            ))}
          </div>
        )}
        {mode === 'month' && (
          <div className="month-grid">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div className="month-label" key={d}>
                {d}
              </div>
            ))}
            {monthDays.map((d) => (
              <button
                className={`month-day ${!isSameMonth(d, date) ? 'outside' : ''} ${isSameDay(d, new Date()) ? 'today' : ''} ${isSameDay(d, date) ? 'selected' : ''}`}
                key={d.toISOString()}
                onClick={() => {
                  setDate(d)
                  setMode('day')
                }}
              >
                <strong>{format(d, 'd')}</strong>
                {filtered
                  .filter((m) => isSameDay(new Date(m.starts_at), d))
                  .slice(0, 3)
                  .map((m) => (
                    <span className={`month-event ${m.status}`} key={m.id}>
                      {dateLabel(m.starts_at, 'HH:mm')} {m.title}
                    </span>
                  ))}
                {filtered.filter((m) => isSameDay(new Date(m.starts_at), d)).length > 3 && (
                  <small>+ más</small>
                )}
              </button>
            ))}
          </div>
        )}
        {mode === 'week' && !search && (
          <div className="desktop-week">
            <div className="week-head">
              <span>GMT{new Date().getTimezoneOffset() / -60}</span>
              {week.map((d) => (
                <button
                  className={isSameDay(d, new Date()) ? 'today' : ''}
                  key={d.toISOString()}
                  onClick={() => {
                    setDate(d)
                    setMode('day')
                  }}
                >
                  <span>{dateLabel(format(d, 'yyyy-MM-dd'), 'EEE')}</span>
                  <strong>{format(d, 'd')}</strong>
                </button>
              ))}
            </div>
            <div className="week-scroll" ref={calendarRef}>
              <div className="week-timeline">
                <div className="hours">
                  {Array.from({ length: 24 }, (_, h) => (
                    <span key={h}>{String(h).padStart(2, '0')}:00</span>
                  ))}
                </div>
                {week.map((d) => (
                  <div className="week-day" key={d.toISOString()}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div
                        className="hour-slot"
                        key={h}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const m = data.meetings.find(
                            (m) => m.id === e.dataTransfer.getData('text/plain'),
                          )
                          if (m)
                            open({
                              kind: 'meeting',
                              id: m.id,
                              initial: {
                                ...meetingEdit(m),
                                date: format(d, 'yyyy-MM-dd'),
                                time: `${String(h).padStart(2, '0')}:00`,
                              },
                            })
                        }}
                      />
                    ))}
                    {filtered
                      .filter((m) => isSameDay(new Date(m.starts_at), d))
                      .map((m) => {
                        const start = new Date(m.starts_at)
                        return (
                          <button
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', m.id)}
                            className={`calendar-event ${m.status}`}
                            key={m.id}
                            style={{
                              top: (start.getHours() + start.getMinutes() / 60) * 48,
                              height: Math.max(
                                36,
                                (differenceInMinutes(new Date(m.ends_at), start) / 60) * 48 - 2,
                              ),
                            }}
                            onClick={() => show(m)}
                          >
                            <small>{dateLabel(m.starts_at, 'HH:mm')}</small>
                            <strong>{m.title}</strong>
                            <span>
                              {data.companies.find((c) => c.id === m.company_id)?.name || 'PULSO'}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
            <footer className="calendar-hint">
              Arrastrá una reunión a otro horario para revisar su reprogramación.
            </footer>
          </div>
        )}
      </div>
      <section className={mode === 'week' && !search ? 'agenda-day-list mobile-only' : ''}>
        <div className="section-heading">
          <h2>
            {search
              ? 'Resultados de búsqueda'
              : dateLabel(format(date, 'yyyy-MM-dd'), 'EEEE d MMMM')}
          </h2>
          <span>{search ? filtered.length : dayMeetings.length} reuniones</span>
        </div>
        <MeetingList
          meetings={
            search ? filtered.sort((a, b) => b.starts_at.localeCompare(a.starts_at)) : dayMeetings
          }
          open={open}
        />
        {!(search ? filtered : dayMeetings).length && (
          <div className="card">
            <Empty
              icon={CalendarDays}
              title={search ? 'No encontramos reuniones' : 'Tu día tiene espacio para algo nuevo'}
              description={
                search
                  ? 'Probá con otro nombre o cambiá los filtros.'
                  : 'Agendá una reunión con el equipo o una empresa.'
              }
            />
          </div>
        )}
      </section>
      {!search && mode === 'week' && (
        <section className="mobile-only">
          <div className="section-heading">
            <h2>Próximas reuniones</h2>
          </div>
          <MeetingList
            meetings={filtered
              .filter(
                (m) =>
                  m.status === 'scheduled' &&
                  new Date(m.starts_at) > new Date() &&
                  !isSameDay(new Date(m.starts_at), date),
              )
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .slice(0, 5)}
            open={open}
          />
        </section>
      )}
      {selected && <MeetingDetail meeting={selected} open={open} onClose={() => setParams({})} />}
    </>
  )
}
