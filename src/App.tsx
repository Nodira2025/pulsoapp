import { useEffect, useState, type FormEvent } from 'react'
import {
  HashRouter,
  NavLink,
  Link,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CalendarDays,
  ListTodo,
  Wallet,
  Receipt,
  MessageSquare,
  Bell,
  Search,
  Plus,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  LogOut,
  UserRound,
  WifiOff,
  Eye,
  EyeOff,
  CheckCheck,
  Activity,
} from 'lucide-react'
import { StoreProvider, useStore } from './lib/store'
import { supabase } from './lib/supabase'
import { messageOf, dateLabel } from './lib/utils'
import { Avatar, Modal, Spinner, Empty } from './components/UI'
import { Forms, type FormRequest } from './components/Forms'
import { Dashboard } from './pages/Dashboard'
import { Feed } from './pages/Feed'
import { Companies, Projects, Detail, Pending } from './pages/Projects'
import { Agenda } from './pages/Agenda'
import { Finances } from './pages/Finances'
import { FirstPassword, Profile } from './pages/Profile'
import { AppUpdate } from './components/AppUpdate'

const nav = [
  { to: '/', name: 'Inicio', icon: LayoutDashboard },
  { to: '/novedades', name: 'Novedades', icon: MessageSquare },
  { to: '/empresas', name: 'Empresas', icon: Building2 },
  { to: '/proyectos', name: 'Mis proyectos', icon: FolderKanban },
  { to: '/agenda', name: 'Agenda', icon: CalendarDays },
  { to: '/pendientes', name: 'Pendientes', icon: ListTodo },
  { to: '/cobros', name: 'Cobros y cuotas', icon: Wallet },
  { to: '/gastos', name: 'Gastos', icon: Receipt },
]
function Login() {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${username.trim().toLowerCase()}@equipo.pulso.internal`,
        password,
      })
      if (error) throw error
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <img
          className="login-logo"
          src={`${import.meta.env.BASE_URL}pulso-logo.jpeg`}
          alt="PULSO"
        />
        <div className="login-story-copy">
          <span className="eyebrow">NUESTRO ESPACIO DE TRABAJO</span>
          <h1>
            Todo lo que hacemos.
            <br />
            <em>Juntos.</em>
          </h1>
          <p>
            Ideas que se conectan.
            <br />
            Proyectos que avanzan.
            <br />
            Un equipo en la misma página.
          </p>
          <div className="login-pill">
            <span className="live-dot" /> El pulso de nuestro equipo
          </div>
        </div>
        <footer>
          PULSO <span>Crear. Conectar. Avanzar.</span>
        </footer>
      </section>
      <main className="login-form-side">
        <form className="login-form" onSubmit={submit}>
          <div className="brand-word mobile-brand">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
            PULSO
          </div>
          <span className="eyebrow">BIENVENIDO A PULSO</span>
          <h2>Tu equipo está acá.</h2>
          <p>Ingresá a tu espacio de trabajo.</p>
          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Tu nombre de usuario"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                type={show ? 'text' : 'password'}
                placeholder="Tu contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full login-submit" disabled={busy}>
            {busy ? 'Ingresando…' : 'Entrar a PULSO'}
            <ArrowRight size={19} />
          </button>
          <p className="login-help">¿Necesitás acceso? Contactá al administrador de tu equipo.</p>
        </form>
        <span className="login-footer">Un equipo. Una memoria compartida.</span>
      </main>
    </div>
  )
}
function Shell() {
  const { session, user, data, loading, error, refresh, signOut, toast } = useStore()
  const [form, setForm] = useState<FormRequest | null>(null),
    [menu, setMenu] = useState(false),
    [quick, setQuick] = useState(false),
    [notices, setNotices] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [search, setSearch] = useState('')
  const navigate = useNavigate(),
    location = useLocation()
  const unread = data.notifications.filter((n) => !n.read_at).length
  useEffect(() => {
    const on = () => setOffline(false),
      off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  useEffect(() => {
    setMenu(false)
    setQuick(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  if (loading) return <Spinner />
  if (!session) return <Login />
  if (!user)
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>{error ? 'No pudimos cargar tu espacio' : 'Acceso pendiente'}</h1>
          <p>
            {error || 'Tu usuario necesita un perfil habilitado por el administrador de PULSO.'}
          </p>
          <button className="button primary" onClick={() => void refresh()}>
            Reintentar
          </button>
          <button className="text-button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  if (user.must_change_password) return <FirstPassword />
  const open = (r: FormRequest) => {
    setQuick(false)
    setForm(r)
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      {menu && (
        <button className="menu-backdrop" aria-label="Cerrar menú" onClick={() => setMenu(false)} />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Link className="brand" to="/">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <span>
            PULSO<small>ESPACIO DE TRABAJO</small>
          </span>
        </Link>
        <div className="workspace-chip">
          <span className="workspace-icon">P</span>
          <div>
            <strong>Equipo PULSO</strong>
            <small>Creando juntos</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">TU ESPACIO</span>
        <nav aria-label="Navegación principal">
          {nav.map((n) => (
            <NavLink end={n.to === '/'} to={n.to} key={n.to}>
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.to === '/pendientes' &&
                data.tasks.some((t) => t.status !== 'done' && t.assignee_id === user.id) && (
                  <small className="nav-count">
                    {
                      data.tasks.filter((t) => t.status !== 'done' && t.assignee_id === user.id)
                        .length
                    }
                  </small>
                )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="team-presence">
            <div className="avatar-stack">
              {data.profiles
                .filter((p) => p.active)
                .slice(0, 4)
                .map((p) => (
                  <Avatar key={p.id} name={p.display_name} path={p.avatar_path} size={28} />
                ))}
            </div>
            <span>Un mismo equipo</span>
          </div>
          <NavLink className="profile-link" to="/perfil">
            <Avatar name={user.display_name} path={user.avatar_path} size={38} />
            <div>
              <strong>{user.display_name}</strong>
              <small>Mi perfil y preferencias</small>
            </div>
            <ChevronDown size={15} />
          </NavLink>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>PULSO</span>
            <span>/</span>
            <strong>
              {nav.find((n) => n.to === location.pathname)?.name || 'Espacio de trabajo'}
            </strong>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/empresas?q=${encodeURIComponent(search)}`)
            }}
          >
            <Search size={17} />
            <input
              aria-label="Ir a buscar empresa"
              placeholder="Buscar empresa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-actions">
            <span className="team-tag">Equipo PULSO</span>
            <button
              className="icon-button notification-button"
              aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
              onClick={() => setNotices(true)}
            >
              <Bell size={20} />
              {unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}
            </button>
            <Link className="topbar-avatar" to="/perfil" aria-label="Mi perfil">
              <Avatar name={user.display_name} path={user.avatar_path} size={34} />
            </Link>
          </div>
        </header>
        {offline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            Sin conexión. Los borradores se conservan en este dispositivo; conectate para guardar y
            sincronizar.
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            No pudimos actualizar los datos. {error}
            <button onClick={() => void refresh()}>Reintentar</button>
          </div>
        )}
        <main id="main-content" className="page">
          <Routes>
            <Route path="/" element={<Dashboard open={open} />} />
            <Route path="/novedades" element={<Feed open={open} />} />
            <Route path="/empresas" element={<Companies open={open} />} />
            <Route path="/empresas/:id" element={<Detail type="company" open={open} />} />
            <Route path="/proyectos" element={<Projects open={open} />} />
            <Route path="/proyectos/:id" element={<Detail type="project" open={open} />} />
            <Route path="/agenda" element={<Agenda open={open} />} />
            <Route path="/pendientes" element={<Pending open={open} />} />
            <Route path="/cobros" element={<Finances open={open} />} />
            <Route path="/gastos" element={<Finances open={open} expenseOnly />} />
            <Route path="/perfil" element={<Profile open={open} />} />
            <Route
              path="*"
              element={
                <Empty
                  title="Esta página no existe"
                  action={
                    <Link to="/" className="button primary">
                      Volver al inicio
                    </Link>
                  }
                />
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>PULSO · Creando juntos</span>
          <span>Una memoria compartida.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {[nav[0], nav[3], nav[4], nav[5]].map((n) => (
          <NavLink end={n.to === '/'} to={n.to} key={n.to}>
            <n.icon size={21} />
            <span>{n.name === 'Mis proyectos' ? 'Proyectos' : n.name}</span>
          </NavLink>
        ))}
        <button onClick={() => setMenu(true)}>
          <Menu size={21} />
          <span>Más</span>
        </button>
      </nav>
      <div className="floating-actions">
        {quick && (
          <div className="quick-menu">
            <h3>¿Qué querés sumar?</h3>
            {[
              { kind: 'post', label: 'Una nota al equipo', icon: MessageSquare },
              { kind: 'company', label: 'Añadir marca', icon: Building2 },
              { kind: 'project', label: 'Nuevo proyecto', icon: FolderKanban },
              { kind: 'update', label: 'Actualizar proyecto', icon: Activity },
              { kind: 'meeting', label: 'Agendar reunión', icon: CalendarDays },
              { kind: 'task', label: 'Una tarea', icon: ListTodo },
              { kind: 'payment', label: 'Registrar cobro', icon: Wallet },
              { kind: 'expense', label: 'Ingresar gasto', icon: Receipt },
            ].map((a) => (
              <button key={a.kind} onClick={() => open({ kind: a.kind as FormRequest['kind'] })}>
                <a.icon size={18} />
                {a.label}
              </button>
            ))}
          </div>
        )}
        <button
          className={`fab ${quick ? 'expanded' : ''}`}
          aria-label={quick ? 'Cerrar acciones' : 'Añadir nota o registro'}
          aria-expanded={quick}
          onClick={() => setQuick(!quick)}
        >
          {quick ? <X size={24} /> : <Plus size={26} />}
        </button>
      </div>
      {form && (
        <Forms
          key={`${form.kind}-${form.id || 'new'}`}
          request={form}
          onClose={() => setForm(null)}
        />
      )}
      {notices && (
        <Modal title="Tus notificaciones" onClose={() => setNotices(false)}>
          <div className="padded">
            {unread > 0 && (
              <button
                className="text-button"
                onClick={async () => {
                  const { error } = await supabase
                    .from('notifications')
                    .update({ read_at: new Date().toISOString() })
                    .eq('recipient_id', user.id)
                    .is('read_at', null)
                  if (error) toast(messageOf(error))
                  else await refresh()
                }}
              >
                <CheckCheck size={17} />
                Marcar todas como leídas
              </button>
            )}
            {data.notifications.length ? (
              data.notifications.slice(0, 100).map((n) => (
                <button
                  className={`notice ${!n.read_at ? 'unread' : ''}`}
                  key={n.id}
                  onClick={async () => {
                    const { error } = await supabase
                      .from('notifications')
                      .update({ read_at: new Date().toISOString() })
                      .eq('id', n.id)
                    if (error) toast(messageOf(error))
                    else await refresh()
                    setNotices(false)
                    navigate(n.href.startsWith('/') ? n.href : '/')
                  }}
                >
                  <Bell size={18} />
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <small>{dateLabel(n.created_at, 'd MMM HH:mm')}</small>
                  </div>
                </button>
              ))
            ) : (
              <Empty
                icon={Bell}
                title="Estás al día"
                description="Las menciones, asignaciones y recordatorios aparecerán acá."
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
        <AppUpdate />
      </HashRouter>
    </StoreProvider>
  )
}
