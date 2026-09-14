import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MessageSquare,
  CheckCheck,
  CornerDownRight,
  Plus,
  Send,
  ListTodo,
  Search,
  Pin,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { dateLabel, messageOf, normalize } from '../lib/utils'
import type { Post } from '../lib/types'
import { Avatar, Attachments, Empty, PageTitle, Badge } from '../components/UI'
import type { FormRequest } from '../components/Forms'
export type OpenForm = (request: FormRequest) => void
export function PostCard({ post, open }: { post: Post; open: OpenForm }) {
  const { data, user, insert, refresh, toast } = useStore()
  const [expanded, setExpanded] = useState(false),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false)
  const author = data.profiles.find((p) => p.id === post.author_id),
    company = data.companies.find((c) => c.id === post.company_id),
    project = data.projects.find((p) => p.id === post.project_id),
    comments = data.comments.filter((c) => c.post_id === post.id).reverse(),
    reactions = data.reactions.filter((r) => r.post_id === post.id),
    seen = reactions.some((r) => r.user_id === user?.id)
  return (
    <article className="card post-card" id={`post-${post.id}`}>
      <header className="post-head">
        <Avatar name={author?.display_name || 'Equipo'} path={author?.avatar_path} />
        <div className="grow">
          <strong>{author?.display_name || 'Equipo PULSO'}</strong>
          <div className="meta">
            {dateLabel(post.created_at, 'd MMM · HH:mm')}
            {post.kind === 'update' && ` · Avance del ${dateLabel(post.happened_on, 'd MMM')}`}
          </div>
        </div>
        <Badge status={post.kind === 'update' ? 'active' : 'note'}>
          {post.kind === 'update' ? 'Avance' : 'Nota'}
        </Badge>
      </header>
      <div className="post-scope">
        {company ? (
          <Link to={`/empresas/${company.id}`}>{company.name}</Link>
        ) : (
          <span>
            <Pin size={13} /> Equipo PULSO
          </span>
        )}
        {project && (
          <>
            <span>/</span>
            <Link to={`/proyectos/${project.id}`}>{project.name}</Link>
          </>
        )}
      </div>
      <p className="post-content">{post.content}</p>
      {post.next_step && (
        <div className="post-next">
          <CornerDownRight size={16} />
          <div>
            <strong>Próximo paso</strong>
            <p>{post.next_step}</p>
          </div>
        </div>
      )}
      {post.blocker && (
        <div className="warning-box">
          <strong>Bloqueo:</strong> {post.blocker}
        </div>
      )}
      {post.mentions.length > 0 && (
        <div className="mentions">
          {post.mentions.map((id) => (
            <span key={id}>@{data.profiles.find((p) => p.id === id)?.display_name}</span>
          ))}
        </div>
      )}
      <Attachments items={data.attachments.filter((a) => a.post_id === post.id)} />
      <footer className="post-actions">
        <button
          className={`text-button ${seen ? 'selected' : ''}`}
          title={reactions
            .map((r) => data.profiles.find((p) => p.id === r.user_id)?.display_name)
            .join(', ')}
          onClick={async () => {
            try {
              const { error } = seen
                ? await supabase
                    .from('reactions')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', user!.id)
                : await supabase.from('reactions').insert({ post_id: post.id, user_id: user!.id })
              if (error) throw error
              await refresh()
            } catch (e) {
              toast(messageOf(e))
            }
          }}
        >
          <CheckCheck size={16} />
          Visto {reactions.length || ''}
        </button>
        <button className="text-button" onClick={() => setExpanded(!expanded)}>
          <MessageSquare size={16} />
          {comments.length ? `${comments.length} comentarios` : 'Comentar'}
        </button>
        <button
          className="text-button task-action"
          aria-label="Crear tarea a partir de esta nota"
          onClick={() =>
            open({
              kind: 'task',
              initial: { project_id: post.project_id || '', title: post.next_step || post.content },
            })
          }
        >
          <ListTodo size={16} />
          <span>Crear tarea</span>
        </button>
      </footer>
      {expanded && (
        <div className="comments">
          {comments.map((c) => {
            const a = data.profiles.find((p) => p.id === c.author_id)
            return (
              <div className="comment" key={c.id}>
                <Avatar name={a?.display_name || 'Equipo'} path={a?.avatar_path} size={30} />
                <div>
                  <strong>{a?.display_name}</strong>
                  <span className="meta"> · {dateLabel(c.created_at, 'd MMM HH:mm')}</span>
                  <p>{c.content}</p>
                </div>
              </div>
            )
          })}
          <form
            className="comment-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!text.trim() || busy) return
              setBusy(true)
              try {
                await insert('comments', {
                  post_id: post.id,
                  author_id: user!.id,
                  content: text.trim(),
                })
                setText('')
              } catch (e) {
                toast(messageOf(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            <input
              aria-label="Escribir comentario"
              placeholder="Sumá tu comentario…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <button aria-label="Enviar comentario" className="icon-button primary" disabled={busy}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
export function Feed({ open }: { open: OpenForm }) {
  const { data, user } = useStore(),
    [search, setSearch] = useState(''),
    [company, setCompany] = useState(''),
    [author, setAuthor] = useState(''),
    [params] = useSearchParams()
  const selected = params.get('post')
  const [count, setCount] = useState(30)
  const posts = data.posts.filter(
    (p) =>
      (!selected || p.id === selected) &&
      (!company || p.company_id === company) &&
      (!author || p.author_id === author) &&
      normalize(p.content).includes(normalize(search)),
  )
  return (
    <>
      <PageTitle
        eyebrow="MEMORIA COMPARTIDA"
        title="Novedades del equipo"
        description="Las conversaciones y los avances, en su contexto."
        action={
          <button className="button primary" onClick={() => open({ kind: 'post' })}>
            <Plus size={18} />
            Nueva nota
          </button>
        }
      />
      <div className="feed-layout">
        <div>
          <button className="composer card" onClick={() => open({ kind: 'post' })}>
            <Avatar name={user!.display_name} path={user!.avatar_path} />
            <span>¿Qué compartimos hoy, {user!.display_name.split(' ')[0]}?</span>
            <Plus size={20} />
          </button>
          <div className="toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Buscar novedades"
                placeholder="Buscar en las novedades"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar autor"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            >
              <option value="">Todo el equipo</option>
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <Link className="text-button" to="/novedades">
              Ver todas las novedades
            </Link>
          )}
          {posts.length ? (
            posts.slice(0, count).map((p) => <PostCard key={p.id} post={p} open={open} />)
          ) : (
            <div className="card">
              <Empty
                icon={MessageSquare}
                title="Cada avance cuenta"
                description="Publicá la primera novedad para que todo el equipo esté al tanto."
                action={
                  <button className="button secondary" onClick={() => open({ kind: 'post' })}>
                    Compartir una nota
                  </button>
                }
              />
            </div>
          )}
          {posts.length > count && (
            <button className="button secondary" onClick={() => setCount(count + 30)}>
              Ver más novedades
            </button>
          )}
        </div>
        <aside className="feed-aside">
          <div className="card padded">
            <h3>Tu equipo</h3>
            {data.profiles
              .filter((p) => p.active)
              .map((p) => (
                <div className="person-row" key={p.id}>
                  <Avatar name={p.display_name} path={p.avatar_path} />
                  <div>
                    <strong>{p.display_name}</strong>
                    <small>{p.role === 'admin' ? 'Administrador' : 'Integrante'}</small>
                  </div>
                </div>
              ))}
          </div>
          <div className="card padded">
            <h3>Explorar por empresa</h3>
            <select
              aria-label="Filtrar novedades por empresa"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              <option value="">Todas las empresas</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="muted small">
              Las notas de cada proyecto también aparecen en el perfil de su empresa.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
