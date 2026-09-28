import { compressImage } from '../lib/images'
import { useState, type FormEvent } from 'react'
import { Plus, Camera, LogOut, ShieldCheck, UserRound, LockKeyhole } from 'lucide-react'
import { useStore } from '../lib/store'
import { supabase, upload } from '../lib/supabase'
import { DeviceActions, useDevice } from '../components/DeviceSetup'
import { ThemeControl } from '../lib/theme'
import { messageOf } from '../lib/utils'
import { PageTitle, Avatar } from '../components/UI'
import type { OpenForm } from './Feed'
export function PasswordForm({ required = false }: { required?: boolean }) {
  const { refresh, toast } = useStore()
  const [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) {
          setError('Usá al menos 8 caracteres.')
          return
        }
        if (password !== repeat) {
          setError('Las contraseñas no coinciden.')
          return
        }
        setBusy(true)
        try {
          const { error } = await supabase.auth.updateUser({ password })
          if (error) throw error
          const result = await supabase.rpc('finish_password_change')
          if (result.error) throw result.error
          setPassword('')
          setRepeat('')
          await refresh()
          toast('Contraseña actualizada.')
        } catch (e) {
          setError(messageOf(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="field">
        <label htmlFor="new-password">Nueva contraseña</label>
        <input
          id="new-password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="repeat-password">Repetir contraseña</label>
        <input
          id="repeat-password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        <LockKeyhole size={17} />
        {busy ? 'Guardando…' : required ? 'Guardar y entrar' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}
export function FirstPassword() {
  const { user, signOut } = useStore()
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-word">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          PULSO
        </div>
        <span className="eyebrow">TU ESPACIO, TU ACCESO</span>
        <h1>Hola, {user!.display_name}.</h1>
        <p className="muted">
          Elegí una contraseña personal para reemplazar la temporal y empezar a trabajar.
        </p>
        <PasswordForm required />
        <button className="text-button" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
export function Profile({ open }: { open: OpenForm }) {
  const { user, update, toast, signOut, data } = useStore()
  const [name, setName] = useState(user!.display_name),
    [phone, setPhone] = useState(user!.phone),
    [bio, setBio] = useState(user!.bio),
    [minutes, setMinutes] = useState(user!.reminder_minutes),
    [busy, setBusy] = useState(false)
  const device = useDevice()
  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await update('profiles', user!.id, {
        display_name: name.trim(),
        phone,
        bio,
        reminder_minutes: Number(minutes),
      })
      toast('Tu perfil está actualizado.')
    } catch (e) {
      toast(messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TU LUGAR EN EL EQUIPO"
        title="Mi perfil"
        description="Tus datos, tus preferencias y tu acceso a PULSO."
      />
      <div className="profile-grid">
        <section className="card padded">
          <div className="profile-photo">
            <Avatar name={user!.display_name} path={user!.avatar_path} size={92} />
            <label className="button secondary">
              <Camera size={17} />
              Cambiar foto
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ''
                  setBusy(true)
                  try {
                    const path = await upload(await compressImage(file, 768), user!.id)
                    await update('profiles', user!.id, { avatar_path: path })
                    toast('Foto actualizada.')
                  } catch (e) {
                    toast(messageOf(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              />
            </label>
          </div>
          <p className="field-hint">
            Tu foto se comprime automáticamente antes de subirla. JPG, PNG o WebP, hasta 20 MB.
          </p>
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="profile-name">Nombre</label>
              <input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Usuario</label>
              <input value={user!.username} disabled />
            </div>
            <div className="field">
              <label htmlFor="profile-phone">Teléfono</label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-bio">Sobre vos / rol en el equipo</label>
              <textarea
                id="profile-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-reminder">
                Recordatorio predeterminado para nuevas reuniones
              </label>
              <select
                id="profile-reminder"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                <option value="0">Al comenzar</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            <button className="button primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </form>
        </section>
        <aside>
          <section className="card padded">
            <h3>Apariencia</h3>
            <p className="muted">
              Elegí modo día, noche o seguir la configuración de tu dispositivo.
            </p>
            <ThemeControl full />
          </section>
          <section className="card padded">
            <h3>PULSO en tu dispositivo</h3>
            <DeviceActions />
            <button className="text-button" onClick={device.show}>
              Ver guía de instalación y avisos
            </button>
          </section>
          <section className="card padded">
            <h3>
              <ShieldCheck size={18} /> Contraseña
            </h3>
            <PasswordForm />
          </section>
          <button className="button secondary full" onClick={() => void signOut()}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </aside>
      </div>
      <div className="section-heading">
        <h2>Nuestro equipo</h2>
        {user!.role === 'admin' && (
          <button className="button primary" onClick={() => open({ kind: 'member' })}>
            <Plus size={17} />
            Agregar integrante
          </button>
        )}
      </div>
      <div className="team-grid">
        {data.profiles
          .filter((p) => p.active)
          .map((p) => (
            <div className="card team-card" key={p.id}>
              <Avatar name={p.display_name} path={p.avatar_path} size={60} />
              <h3>{p.display_name}</h3>
              <span className="muted">@{p.username}</span>
              <p>{p.bio || 'Equipo PULSO'}</p>
              <span className="badge">
                {p.role === 'admin' ? <ShieldCheck size={13} /> : <UserRound size={13} />}{' '}
                {p.role === 'admin' ? 'Administrador' : 'Integrante'}
              </span>
            </div>
          ))}
      </div>
    </>
  )
}
