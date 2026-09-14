import { Link } from 'react-router-dom'
import {
  Building2,
  FolderKanban,
  CalendarDays,
  ArrowUpRight,
  Plus,
  Wallet,
  Receipt,
  ListTodo,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Activity,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { dateLabel, today, balance, money } from '../lib/utils'
import { PageTitle, Avatar, Empty, Badge } from '../components/UI'
import { PostCard, type OpenForm } from './Feed'
export function Dashboard({ open }: { open: OpenForm }) {
  const { data, user } = useStore()
  const due = data.tasks.filter((t) => t.status !== 'done'),
    mine = due.filter((t) => t.assignee_id === user!.id),
    active = data.projects.filter((p) => ['active', 'planning', 'waiting'].includes(p.status)),
    meetings = data.meetings
      .filter((m) => m.status === 'scheduled' && new Date(m.ends_at) >= new Date())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 3),
    pending = data.installments.reduce((sum, i) => sum + balance(i, data.payments), 0)
  const actions = [
    {
      kind: 'company',
      label: 'Añadir marca',
      detail: 'Un nuevo vínculo',
      icon: Building2,
      color: 'blue',
    },
    {
      kind: 'update',
      label: 'Actualizar proyecto',
      detail: 'Compartí un avance',
      icon: Activity,
      color: 'purple',
    },
    {
      kind: 'meeting',
      label: 'Agendar reunión',
      detail: 'Encontrémonos',
      icon: CalendarDays,
      color: 'orange',
    },
    {
      kind: 'expense',
      label: 'Ingresar gasto',
      detail: 'Todo registrado',
      icon: Receipt,
      color: 'green',
    },
  ] as const
  return (
    <>
      <PageTitle
        eyebrow={dateLabel(today(), 'EEEE d · MMMM yyyy').toUpperCase()}
        title={`Hola, ${user!.display_name.split(' ')[0]} 👋`}
        description="Un nuevo día para crear, conectar y avanzar."
        action={
          <Link to="/agenda" className="button secondary">
            <CalendarDays size={18} />
            Mi agenda
          </Link>
        }
      />
      <section className="overview-grid">
        <Link className="stat-card" to="/proyectos">
          <span className="stat-icon blue">
            <FolderKanban />
          </span>
          <div>
            <span>Proyectos activos</span>
            <strong>{active.length.toString().padStart(2, '0')}</strong>
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <Link className="stat-card" to="/pendientes">
          <span className="stat-icon purple">
            <ListTodo />
          </span>
          <div>
            <span>Mis pendientes</span>
            <strong>{mine.length.toString().padStart(2, '0')}</strong>
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <Link className="stat-card" to="/cobros">
          <span className="stat-icon green">
            <Wallet />
          </span>
          <div>
            <span>Por cobrar</span>
            <strong className="money-stat">{money(pending)}</strong>
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <Link className="stat-card" to="/empresas">
          <span className="stat-icon orange">
            <Building2 />
          </span>
          <div>
            <span>Empresas del equipo</span>
            <strong>{data.companies.length.toString().padStart(2, '0')}</strong>
          </div>
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <div className="section-heading">
        <h2>¿Por dónde empezamos?</h2>
        <span>Accesos rápidos</span>
      </div>
      <section className="quick-grid">
        {actions.map((a) => (
          <button className="quick-action" key={a.kind} onClick={() => open({ kind: a.kind })}>
            <span className={`action-icon ${a.color}`}>
              <a.icon size={22} />
            </span>
            <div>
              <strong>{a.label}</strong>
              <small>{a.detail}</small>
            </div>
            <Plus size={17} />
          </button>
        ))}
      </section>
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>
              El pulso del equipo <span className="live-dot" title="Se actualiza automáticamente" />
            </h2>
            <Link to="/novedades">
              Ver todo <ArrowRight size={15} />
            </Link>
          </div>
          <button className="composer card" onClick={() => open({ kind: 'post' })}>
            <Avatar name={user!.display_name} path={user!.avatar_path} />
            <span>Compartí una idea, una novedad, un avance…</span>
            <MessageSquare size={19} />
          </button>
          {data.posts.length ? (
            data.posts.slice(0, 3).map((post) => <PostCard key={post.id} post={post} open={open} />)
          ) : (
            <div className="card welcome-card">
              <span className="welcome-symbol">
                <Sparkles size={30} />
              </span>
              <span className="eyebrow">ESTE ES NUESTRO ESPACIO</span>
              <h2>
                Las buenas ideas
                <br />
                se construyen en equipo.
              </h2>
              <p>
                Empezá sumando una marca o compartiendo una nota. Cada avance queda acá, para todos.
              </p>
              <button className="button primary" onClick={() => open({ kind: 'company' })}>
                <Plus size={17} />
                Añadir la primera marca
              </button>
              <div className="welcome-team">
                <div className="avatar-stack">
                  {data.profiles
                    .filter((p) => p.active)
                    .map((p) => (
                      <Avatar key={p.id} name={p.display_name} path={p.avatar_path} size={32} />
                    ))}
                </div>
                <span>Un equipo. Una memoria compartida.</span>
              </div>
            </div>
          )}
        </section>
        <aside>
          <div className="section-heading">
            <h2>En agenda</h2>
            <Link to="/agenda">
              <ArrowUpRight size={18} />
              <span className="sr-only">Ver agenda</span>
            </Link>
          </div>
          <div className="card padded agenda-summary">
            {meetings.length ? (
              meetings.map((m) => (
                <Link className="meeting-mini" to={`/agenda?reunion=${m.id}`} key={m.id}>
                  <div className="date-square">
                    <strong>{dateLabel(m.starts_at, 'dd')}</strong>
                    <span>{dateLabel(m.starts_at, 'MMM')}</span>
                  </div>
                  <div className="grow">
                    <strong>{m.title}</strong>
                    <small>
                      {dateLabel(m.starts_at, 'HH:mm')} · {m.location_type}
                    </small>
                    <span className="meta">
                      {data.companies.find((c) => c.id === m.company_id)?.name || 'Equipo PULSO'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty
                icon={CalendarDays}
                title="Un lugar para encontrarse"
                description="Todavía no hay reuniones próximas."
              />
            )}
            <button className="button secondary full" onClick={() => open({ kind: 'meeting' })}>
              <Plus size={16} />
              Agendar reunión
            </button>
          </div>
          <div className="section-heading">
            <h2>En foco</h2>
            <Link to="/pendientes">Ver todo</Link>
          </div>
          <div className="card padded">
            {due.length ? (
              due
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .slice(0, 4)
                .map((t) => (
                  <Link to={`/proyectos/${t.project_id}`} className="focus-task" key={t.id}>
                    <span className={`task-dot ${t.priority}`} />
                    <div>
                      <strong>{t.title}</strong>
                      <small className={t.due_date < today() ? 'overdue' : ''}>
                        {dateLabel(t.due_date, 'd MMM')} ·{' '}
                        {data.profiles.find((p) => p.id === t.assignee_id)?.display_name}
                      </small>
                    </div>
                    <Badge status={t.status} />
                  </Link>
                ))
            ) : (
              <p className="muted">Las próximas tareas del equipo van a aparecer acá.</p>
            )}
            <button className="text-button" onClick={() => open({ kind: 'task' })}>
              <Plus size={16} />
              Crear tarea
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}
