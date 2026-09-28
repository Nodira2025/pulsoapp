import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock3, ListTodo, UserRound } from 'lucide-react'
import { useStore } from '../lib/store'
import { Avatar } from '../components/UI'
import './welcome.css'

export function Welcome({ onStart }: { onStart: () => void }) {
  const { user, data } = useStore()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])
  const hour = Number(
    new Intl.DateTimeFormat('es-AR', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(now),
  )
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const pending = data.tasks.filter((t) => t.assignee_id === user?.id && t.status !== 'done').length
  const meetings = data.meetings.filter(
    (m) => m.status === 'scheduled' && new Date(m.ends_at) >= now && m.attendees.includes(user!.id),
  ).length
  return (
    <section className="welcome-home" aria-label="Inicio de PULSO">
      <div className="welcome-window" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="welcome-brand">
        <div>
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <strong>PULSO</strong>
        </div>
        <p>TRANSFORMAMOS PROCESOS PARA CRECER</p>
      </header>
      <div className="welcome-strip">
        <Link to="/pendientes">
          <ListTodo />
          <div>
            <strong>{pending}</strong>
            <span>Mis pendientes</span>
          </div>
        </Link>
        <div>
          <Clock3 />
          <div>
            <strong>
              {new Intl.DateTimeFormat('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
                timeZone: 'America/Argentina/Buenos_Aires',
              }).format(now)}
            </strong>
            <span>
              {new Intl.DateTimeFormat('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'America/Argentina/Buenos_Aires',
              }).format(now)}{' '}
              · Argentina
            </span>
          </div>
        </div>
        <Link to="/agenda">
          <CalendarDays />
          <div>
            <strong>{meetings}</strong>
            <span>Próximas reuniones</span>
          </div>
        </Link>
      </div>
      <div className="welcome-body">
        <div className="welcome-greeting">
          <span className="welcome-accent" />
          <h1>
            {greeting},<br />
            <em>{user?.display_name.split(' ')[0] || 'equipo'}.</em>
          </h1>
          <p>
            Listo para impulsar proyectos,
            <br className="desktop-break" /> ventas y sistemas desde un solo lugar.
          </p>
          <span className="welcome-motto">IDEAS · PROCESOS · PERSONAS · RESULTADOS</span>
        </div>
        <Link to="/perfil" className="welcome-profile">
          <div className="welcome-avatar">
            <Avatar name={user?.display_name || 'PULSO'} path={user?.avatar_path} size={146} />
          </div>
          <span>
            <UserRound size={22} /> Mi perfil
          </span>
        </Link>
      </div>
      <div className="welcome-start">
        <button onClick={onStart}>
          Iniciar <ArrowRight size={30} />
        </button>
        <p>Al iniciar se abrirá el menú principal</p>
      </div>
      <footer className="welcome-footer">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        <span>Pulso · Plataforma de gestión e innovación</span>
        <small>
          HACIA
          <br />
          LO QUE SIGUE
        </small>
      </footer>
    </section>
  )
}
