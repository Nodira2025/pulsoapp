import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Building2,
  FolderKanban,
  Plus,
  Search,
  ArrowUpRight,
  CalendarDays,
  Github,
  Globe,
  Pencil,
  ListTodo,
  BarChart3,
  MessageSquare,
  Wallet,
  Paperclip,
  Phone,
  MapPin,
} from 'lucide-react'
import { differenceInCalendarDays, addDays, parseISO, format } from 'date-fns'
import { useStore } from '../lib/store'
import { dateLabel, normalize, progress, today, messageOf, money, whatsapp } from '../lib/utils'
import {
  Avatar,
  PageTitle,
  Empty,
  Progress,
  Badge,
  External,
  Attachments,
  Modal,
  Dictation,
} from '../components/UI'
import { PostCard, type OpenForm } from './Feed'
import { Finances } from './Finances'
import { MeetingList } from './Agenda'
import { labels, type Project, type Task } from '../lib/types'

export function ProjectCard({ project: p }: { project: Project }) {
  const { data } = useStore(),
    c = data.companies.find((c) => c.id === p.company_id),
    owner = data.profiles.find((x) => x.id === p.owner_id)
  return (
    <Link className="card project-card" to={`/proyectos/${p.id}`}>
      <div className="project-top">
        <Avatar name={c?.name || p.name} path={c?.logo_path} size={46} square />
        <Badge status={p.status} />
      </div>
      <span className="eyebrow">{c?.name}</span>
      <h3>{p.name}</h3>
      <p>{p.description || 'Listo para empezar a trabajar.'}</p>
      <Progress value={progress(data.tasks.filter((t) => t.project_id === p.id))} />
      <footer>
        <div className="person-inline">
          <Avatar name={owner?.display_name || 'Equipo'} path={owner?.avatar_path} size={25} />
          <span>{owner?.display_name}</span>
        </div>
        <span>
          <CalendarDays size={14} />
          {dateLabel(p.end_date, 'd MMM')}
        </span>
      </footer>
      <small className="meta">
        Incorporado por {data.profiles.find((x) => x.id === p.created_by)?.display_name}
      </small>
    </Link>
  )
}
export function Companies({ open }: { open: OpenForm }) {
  const { data } = useStore()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  useEffect(() => setSearch(params.get('q') || ''), [params])
  const list = data.companies.filter((c) =>
    normalize(`${c.name} ${c.industry} ${c.contact_name}`).includes(normalize(search)),
  )
  return (
    <>
      <PageTitle
        eyebrow="NUESTRAS CONEXIONES"
        title="Empresas"
        description="Cada empresa tiene su historia. Acá la construimos juntos."
        action={
          <button className="button primary" onClick={() => open({ kind: 'company' })}>
            <Plus size={18} />
            Añadir empresa
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar empresa"
            placeholder="Buscar por nombre, rubro o contacto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">{list.length} empresas</span>
      </div>
      {list.length ? (
        <div className="company-grid">
          {list.map((c) => (
            <Link to={`/empresas/${c.id}`} className="card company-card" key={c.id}>
              <div className="company-card-top">
                <Avatar name={c.name} path={c.logo_path} size={60} square />
                <ArrowUpRight size={20} />
              </div>
              <h3>{c.name}</h3>
              <p>{c.industry || 'Sin rubro indicado'}</p>
              <div className="company-count">
                <FolderKanban size={16} />
                {data.projects.filter((p) => p.company_id === c.id).length} proyectos
              </div>
              <footer>
                <span>
                  Incorporada por{' '}
                  <strong>{data.profiles.find((p) => p.id === c.created_by)?.display_name}</strong>
                </span>
                <small>{dateLabel(c.created_at, 'd MMM yyyy')}</small>
              </footer>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty
            icon={Building2}
            title={
              search ? 'No encontramos esa empresa' : 'La próxima gran idea empieza con una empresa'
            }
            description={
              search
                ? 'Probá con otro nombre o rubro.'
                : 'Agregá tu primera empresa y reuní sus proyectos, contactos y novedades.'
            }
            action={
              !search && (
                <button className="button primary" onClick={() => open({ kind: 'company' })}>
                  <Plus size={17} />
                  Añadir empresa
                </button>
              )
            }
          />
        </div>
      )}
    </>
  )
}
export function Projects({ open }: { open: OpenForm }) {
  const { data, user } = useStore()
  const [search, setSearch] = useState(''),
    [scope, setScope] = useState('all'),
    [status, setStatus] = useState('')
  const list = data.projects.filter(
    (p) =>
      (scope !== 'mine' || p.owner_id === user!.id || p.created_by === user!.id) &&
      (!status || p.status === status) &&
      normalize(`${p.name} ${data.companies.find((c) => c.id === p.company_id)?.name}`).includes(
        normalize(search),
      ),
  )
  return (
    <>
      <PageTitle
        eyebrow="DEL PLAN A LA ACCIÓN"
        title="Mis proyectos"
        description="Una vista compartida de todo lo que estamos creando."
        action={
          <button className="button primary" onClick={() => open({ kind: 'project' })}>
            <Plus size={18} />
            Nuevo proyecto
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented">
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
            Todo el equipo
          </button>
          <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>
            Los míos
          </button>
        </div>
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar proyectos"
            placeholder="Buscar proyecto o empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Estado del proyecto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {['planning', 'active', 'waiting', 'completed', 'archived'].map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
      </div>
      {list.length ? (
        <div className="project-grid">
          {list.map((p) => (
            <ProjectCard project={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty
            icon={FolderKanban}
            title="Dale forma al próximo proyecto"
            description="Cada proyecto reúne sus tareas, avances, reuniones y cobros."
            action={
              <button className="button primary" onClick={() => open({ kind: 'project' })}>
                Crear proyecto
              </button>
            }
          />
        </div>
      )}
    </>
  )
}
export function TaskList({ tasks }: { tasks: Task[] }) {
  const { data, update, toast } = useStore()
  const [selected, setSelected] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="task-list">
      {selected && (
        <Modal
          title="Detalle de la tarea"
          onClose={() => {
            if (!busy) setSelected(null)
          }}
        >
          <form
            className="task-detail-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!title.trim() || title.trim().length > 80) {
                setError('Escribí un título de entre 1 y 80 caracteres.')
                return
              }
              setBusy(true)
              setError('')
              try {
                await update('tasks', selected.id, {
                  title: title.trim(),
                  description: description.trim(),
                })
                toast('Tarea actualizada')
                setSelected(null)
              } catch (err) {
                setError(messageOf(err))
              } finally {
                setBusy(false)
              }
            }}
          >
            <label htmlFor="task-detail-title">Título de la tarea</label>
            <input
              id="task-detail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              disabled={busy}
            />
            <small className="field-hint">{title.length}/80 caracteres</small>
            <label htmlFor="task-detail-description">Descripción de la tarea</label>
            <textarea
              id="task-detail-description"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              placeholder="Detalles y pasos a seguir"
            />
            {!busy && (
              <Dictation onText={(text) => setDescription((old) => `${old} ${text}`.trim())} />
            )}
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        </Modal>
      )}

      {tasks.map((t) => {
        const p = data.profiles.find((p) => p.id === t.assignee_id)
        return (
          <div className="task-row" key={t.id}>
            <button
              className={`task-check ${t.status === 'done' ? 'checked' : ''}`}
              aria-label={`${t.status === 'done' ? 'Reabrir' : 'Completar'} ${t.title}`}
              onClick={async () => {
                try {
                  await update('tasks', t.id, { status: t.status === 'done' ? 'todo' : 'done' })
                } catch (e) {
                  toast(messageOf(e))
                }
              }}
            >
              {t.status === 'done' ? '✓' : ''}
            </button>
            <div className="grow">
              <button
                className={`task-title-button ${t.status === 'done' ? 'strike' : ''}`}
                onClick={() => {
                  setSelected(t)
                  setTitle(t.title)
                  setDescription(t.description || '')
                  setError('')
                }}
              >
                {t.title}
              </button>
              <div className="meta">
                <Link to={`/proyectos/${t.project_id}`}>
                  {data.projects.find((p) => p.id === t.project_id)?.name}
                </Link>
                <span className={t.due_date < today() && t.status !== 'done' ? 'overdue' : ''}>
                  {' '}
                  · {dateLabel(t.due_date, 'd MMM')}
                </span>
              </div>
            </div>
            <Avatar name={p?.display_name || 'Equipo'} path={p?.avatar_path} size={30} />
            <Badge status={t.priority} />
            <select
              aria-label={`Estado de ${t.title}`}
              value={t.status}
              onChange={async (e) => {
                try {
                  await update('tasks', t.id, { status: e.target.value })
                } catch (err) {
                  toast(messageOf(err))
                }
              }}
            >
              {['todo', 'doing', 'blocked', 'done'].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
export function Gantt({ tasks }: { tasks: Task[] }) {
  if (!tasks.length)
    return (
      <Empty
        icon={BarChart3}
        title="El plan toma forma con las tareas"
        description="Agregá tareas con inicio y vencimiento para ver el cronograma."
      />
    )
  const start = parseISO(tasks.map((t) => t.start_date).sort()[0]),
    end = parseISO(
      tasks
        .map((t) => t.due_date)
        .sort()
        .at(-1)!,
    )
  const days = Math.max(7, differenceInCalendarDays(end, start) + 1),
    width = Math.max(640, Math.min(days * 26, 1800))
  return (
    <div className="gantt-scroll">
      <div className="gantt" style={{ minWidth: width + 200 }}>
        <div className="gantt-head">
          <span>Tarea / avance</span>
          <div>
            {Array.from({ length: Math.min(days, 12) }, (_, i) => (
              <span key={i}>
                {format(addDays(start, Math.floor((i * days) / Math.min(days, 12))), 'dd/MM')}
              </span>
            ))}
          </div>
        </div>
        {tasks.map((t) => (
          <div className="gantt-row" key={t.id}>
            <div className="gantt-label">
              <strong>{t.title}</strong>
              <small>
                {dateLabel(t.start_date, 'd MMM')} – {dateLabel(t.due_date, 'd MMM')}
              </small>
            </div>
            <div className="gantt-lane">
              <div
                className={`gantt-bar ${t.status}`}
                style={{
                  left: `${(differenceInCalendarDays(parseISO(t.start_date), start) / days) * 100}%`,
                  width: `${((differenceInCalendarDays(parseISO(t.due_date), parseISO(t.start_date)) + 1) / days) * 100}%`,
                }}
                title={`${t.title}: ${labels[t.status]}`}
              >
                {labels[t.status]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export function Detail({ type, open }: { type: 'company' | 'project'; open: OpenForm }) {
  const { id } = useParams(),
    { data } = useStore(),
    [tab, setTab] = useState('summary')
  const project = type === 'project' ? data.projects.find((p) => p.id === id) : undefined,
    company = data.companies.find((c) => c.id === (type === 'company' ? id : project?.company_id))
  if (!company || (type === 'project' && !project))
    return (
      <Empty
        title="No encontramos este registro"
        description="Es posible que el enlace haya cambiado."
        action={
          <Link to="/empresas" className="button secondary">
            Ir a empresas
          </Link>
        }
      />
    )
  const projects = data.projects.filter((p) => p.company_id === company.id),
    tasks = data.tasks.filter((t) =>
      project ? t.project_id === project.id : projects.some((p) => p.id === t.project_id),
    ),
    posts = data.posts.filter((p) =>
      project ? p.project_id === project.id : p.company_id === company.id,
    ),
    meetings = data.meetings.filter((m) =>
      project ? m.project_id === project.id : m.company_id === company.id,
    ),
    scope = { company_id: company.id, ...(project ? { project_id: project.id } : {}) }
  const tabs = project
    ? [
        ['summary', 'Resumen'],
        ['tasks', 'Tareas'],
        ['gantt', 'Gantt'],
        ['activity', 'Actividad'],
        ['payments', 'Cobros'],
        ['meetings', 'Reuniones'],
        ['files', 'Archivos'],
      ]
    : [
        ['summary', 'Resumen'],
        ['projects', 'Proyectos'],
        ['activity', 'Actividad'],
        ['payments', 'Cobros'],
        ['meetings', 'Reuniones'],
        ['files', 'Archivos'],
      ]
  return (
    <>
      <Link className="back-link" to={project ? `/empresas/${company.id}` : '/empresas'}>
        ← {project ? company.name : 'Todas las empresas'}
      </Link>
      <div className="detail-heading">
        <Avatar name={company.name} path={company.logo_path} size={76} square />
        <div className="grow">
          <span className="eyebrow">{project ? company.name : company.industry || 'EMPRESA'}</span>
          <h1>{project?.name || company.name}</h1>
          <p>
            Incorporad{project ? 'o' : 'a'} por{' '}
            <strong>
              {
                data.profiles.find((p) => p.id === (project?.created_by || company.created_by))
                  ?.display_name
              }
            </strong>{' '}
            · {dateLabel(project?.created_at || company.created_at)}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            open({
              kind: project ? 'project' : 'company',
              id: project?.id || company.id,
              initial: project || company,
            })
          }
        >
          <Pencil size={16} />
          Editar
        </button>
      </div>
      <nav className="tabs" aria-label="Secciones del perfil">
        {tabs.map(([key, name]) => (
          <button className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>
            {name}
          </button>
        ))}
      </nav>
      {tab === 'summary' && (
        <div className="detail-columns">
          <div>
            <div className="card padded">
              <div className="section-heading">
                <h2>{project ? 'El proyecto' : 'Sobre la empresa'}</h2>
                {project && <Badge status={project.status} />}
              </div>
              <p className="preserve-lines">
                {project?.description ||
                  company.notes ||
                  'Todavía no hay notas. Podés agregarlas desde Editar.'}
              </p>
              {project ? (
                <>
                  <Progress value={progress(tasks)} />
                  <div className="info-grid">
                    <div>
                      <span>Responsable</span>
                      <strong>
                        {data.profiles.find((p) => p.id === project.owner_id)?.display_name}
                      </strong>
                    </div>
                    <div>
                      <span>Entrega</span>
                      <strong>{dateLabel(project.end_date)}</strong>
                    </div>
                    <div>
                      <span>Presupuesto</span>
                      <strong>{money(project.budget)}</strong>
                    </div>
                    <div>
                      <span>Prioridad</span>
                      <Badge status={project.priority} />
                    </div>
                  </div>
                  <div className="link-row">
                    <External href={project.github_url}>
                      <Github size={18} />
                      Repositorio
                    </External>
                    <External href={project.public_url}>
                      <Globe size={18} />
                      Sitio publicado
                    </External>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => open({ kind: 'update', initial: scope })}
                  >
                    <Plus size={17} />
                    Actualizar proyecto
                  </button>
                </>
              ) : (
                <>
                  <div className="info-grid">
                    <div>
                      <span>Contacto</span>
                      <strong>{company.contact_name || 'Sin completar'}</strong>
                    </div>
                    <div>
                      <span>Correo</span>
                      {company.email ? (
                        <a href={`mailto:${company.email}`}>{company.email}</a>
                      ) : (
                        <strong>Sin completar</strong>
                      )}
                    </div>
                  </div>
                  <p className="preserve-lines muted">{company.networks}</p>
                  <div className="link-row">
                    {company.phone && (
                      <External href={whatsapp(company.phone, 'Hola, te escribimos desde PULSO.')}>
                        <Phone size={17} />
                        {company.phone}
                      </External>
                    )}
                    <External href={company.maps_url}>
                      <MapPin size={17} />
                      Ver ubicación
                    </External>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => open({ kind: 'project', initial: { company_id: company.id } })}
                  >
                    <Plus size={17} />
                    Nuevo proyecto
                  </button>
                </>
              )}
            </div>
            <div className="section-heading">
              <h2>Últimos avances</h2>
              <button
                className="text-button"
                onClick={() => open({ kind: project ? 'update' : 'post', initial: scope })}
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>
            {posts.length ? (
              posts.slice(0, 3).map((p) => <PostCard post={p} open={open} key={p.id} />)
            ) : (
              <div className="card">
                <Empty
                  icon={MessageSquare}
                  title="La historia empieza acá"
                  description="Sumá una nota o registrá el primer avance."
                />
              </div>
            )}
          </div>
          <aside>
            <div className="card padded">
              <h3>{project ? 'Próximas tareas' : 'Sus proyectos'}</h3>
              {project ? (
                tasks.length ? (
                  <TaskList tasks={tasks.filter((t) => t.status !== 'done').slice(0, 4)} />
                ) : (
                  <p className="muted">No hay tareas registradas.</p>
                )
              ) : (
                projects.map((p) => (
                  <Link className="related-project" to={`/proyectos/${p.id}`} key={p.id}>
                    <FolderKanban size={18} />
                    <span>{p.name}</span>
                    <ArrowUpRight size={15} />
                  </Link>
                ))
              )}
              {project && (
                <button
                  className="text-button"
                  onClick={() => open({ kind: 'task', initial: scope })}
                >
                  <Plus size={16} />
                  Crear tarea
                </button>
              )}
            </div>
            <div className="card padded">
              <h3>Próxima reunión</h3>
              <MeetingList
                meetings={meetings
                  .filter((m) => m.status === 'scheduled' && new Date(m.ends_at) > new Date())
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .slice(0, 1)}
                open={open}
              />
              <button
                className="text-button"
                onClick={() => open({ kind: 'meeting', initial: scope })}
              >
                <CalendarDays size={16} />
                Agendar
              </button>
            </div>
          </aside>
        </div>
      )}
      {tab === 'projects' && (
        <>
          <div className="section-heading">
            <h2>Proyectos de {company.name}</h2>
            <button
              className="button primary"
              onClick={() => open({ kind: 'project', initial: { company_id: company.id } })}
            >
              <Plus size={17} />
              Nuevo proyecto
            </button>
          </div>
          <div className="project-grid">
            {projects.map((p) => (
              <ProjectCard project={p} key={p.id} />
            ))}
          </div>
          {!projects.length && <Empty icon={FolderKanban} title="Todavía no hay proyectos" />}
        </>
      )}
      {tab === 'tasks' && (
        <div className="card padded">
          <div className="section-heading">
            <h2>Tareas del proyecto</h2>
            <button
              className="button primary"
              onClick={() => open({ kind: 'task', initial: scope })}
            >
              <Plus size={17} />
              Nueva tarea
            </button>
          </div>
          <Progress value={progress(tasks)} />
          {tasks.length ? (
            <TaskList tasks={tasks} />
          ) : (
            <Empty icon={ListTodo} title="Definamos el primer paso" />
          )}
        </div>
      )}
      {tab === 'gantt' && (
        <div className="card padded">
          <div className="section-heading">
            <h2>Cronograma del proyecto</h2>
            <Badge>{progress(tasks)}% completado</Badge>
          </div>
          <Gantt tasks={tasks} />
        </div>
      )}
      {tab === 'activity' && (
        <>
          <div className="section-heading">
            <h2>Memoria del {project ? 'proyecto' : 'cliente'}</h2>
            <button
              className="button primary"
              onClick={() => open({ kind: project ? 'update' : 'post', initial: scope })}
            >
              <Plus size={17} />
              Agregar avance
            </button>
          </div>
          {posts.map((p) => (
            <PostCard post={p} open={open} key={p.id} />
          ))}
          {!posts.length && <Empty title="Todavía no hay novedades" />}
        </>
      )}
      {tab === 'payments' && (
        <Finances open={open} companyId={company.id} projectId={project?.id} />
      )}
      {tab === 'meetings' && (
        <>
          <div className="section-heading">
            <h2>Historial de reuniones</h2>
            <button
              className="button primary"
              onClick={() => open({ kind: 'meeting', initial: scope })}
            >
              <Plus size={17} />
              Agendar
            </button>
          </div>
          <MeetingList
            meetings={meetings.sort((a, b) => b.starts_at.localeCompare(a.starts_at))}
            open={open}
          />
        </>
      )}
      {tab === 'files' && (
        <div className="card padded">
          <div className="section-heading">
            <h2>Archivos y enlaces</h2>
            <button
              className="button secondary"
              onClick={() => open({ kind: 'post', initial: scope })}
            >
              <Paperclip size={17} />
              Adjuntar en una nota
            </button>
          </div>
          <Attachments
            items={data.attachments.filter((a) =>
              project
                ? posts.some((p) => p.id === a.post_id)
                : a.company_id === company.id || posts.some((p) => p.id === a.post_id),
            )}
          />
          {(project ? [project] : projects).map((p) => (
            <div className="project-links" key={p.id}>
              <h3>{p.name}</h3>
              <div className="link-row">
                <External href={p.github_url}>
                  <Github size={17} />
                  GitHub
                </External>
                <External href={p.public_url}>
                  <Globe size={17} />
                  Sitio publicado
                </External>
                {!p.github_url && !p.public_url && (
                  <p className="muted">Los enlaces se pueden agregar al editar el proyecto.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
export function Pending({ open }: { open: OpenForm }) {
  const { data, user } = useStore()
  const [scope, setScope] = useState('mine'),
    [filter, setFilter] = useState('all')
  const tasks = data.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      (scope === 'all' || t.assignee_id === user!.id) &&
      (filter !== 'late' || t.due_date < today()) &&
      (filter !== 'today' || t.due_date === today()) &&
      (filter !== 'blocked' || t.status === 'blocked') &&
      (filter !== 'week' ||
        (t.due_date >= today() && t.due_date <= format(addDays(new Date(), 7), 'yyyy-MM-dd'))),
  )
  const waiting = data.projects.filter(
    (p) => p.status === 'waiting' && (scope === 'all' || p.owner_id === user!.id),
  )
  return (
    <>
      <PageTitle
        eyebrow="UN PASO A LA VEZ"
        title="Pendientes"
        description="Qué falta, quién sigue y cuándo lo necesitamos."
        action={
          <button className="button primary" onClick={() => open({ kind: 'task' })}>
            <Plus size={18} />
            Nueva tarea
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented">
          <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>
            Lo mío
          </button>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
            Todo el equipo
          </button>
        </div>
        <select
          aria-label="Filtrar pendientes"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Todos los pendientes</option>
          <option value="today">Para hoy</option>
          <option value="week">Próximos 7 días</option>
          <option value="late">Atrasados</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <Link className="text-button" to="/cobros">
          Ver cuotas pendientes <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="card padded">
        {tasks.length ? (
          <TaskList tasks={tasks.sort((a, b) => a.due_date.localeCompare(b.due_date))} />
        ) : (
          <Empty
            icon={ListTodo}
            title="Sin pendientes en esta vista"
            description="Cuando se asignen tareas, las vas a encontrar acá."
          />
        )}
      </div>
      {waiting.length > 0 && (
        <>
          <div className="section-heading">
            <h2>Esperando al cliente</h2>
          </div>
          <div className="project-grid">
            {waiting.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
