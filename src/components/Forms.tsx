import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, addWeeks, addMonths, format } from 'date-fns'
import { Wizard, type Field, type Step, type Values } from './Wizard'
import { useStore } from '../lib/store'
import { supabase, upload } from '../lib/supabase'
import { balance, conflicts, normalize, today } from '../lib/utils'
import { labels } from '../lib/types'
export type FormKind =
  | 'company'
  | 'project'
  | 'post'
  | 'update'
  | 'task'
  | 'meeting'
  | 'installment'
  | 'payment'
  | 'expense'
  | 'member'
export interface FormRequest {
  kind: FormKind
  initial?: Values
  id?: string
}
const f = (
  key: string,
  label: string,
  type = 'text',
  required = false,
  extra: Partial<Field> = {},
): Field => ({ key, label, type, required, ...extra })
const choices = (keys: string[]) => keys.map((value) => ({ value, label: labels[value] || value }))
const methods = [
  'Transferencia',
  'Efectivo',
  'Tarjeta de débito',
  'Tarjeta de crédito',
  'Mercado Pago',
  'Otro',
].map((value) => ({ value, label: value }))
const dateField = (key: string, label: string) => f(key, label, 'date', true)
const imageField = (key: string, label: string) =>
  f(key, label, 'files', false, {
    accept: 'image/png,image/jpeg,image/webp',
    hint: 'PNG, JPG o WebP. Máximo 20 MB.',
  })
const extraFiles = f('files', 'Adjuntar archivos', 'files', false, {
  multiple: true,
  hint: 'Hasta 20 MB por archivo. Documentos, imágenes, audio o video MP4.',
})
export function Forms({ request, onClose }: { request: FormRequest; onClose: () => void }) {
  const { data, user, insert, update, refresh, toast } = useStore(),
    navigate = useNavigate()
  const createdCompany = useRef<string | null>(null),
    createdRow = useRef<string | null>(null),
    savedFiles = useRef<Set<string>>(new Set())
  if (!user) return null
  const people = data.profiles
    .filter((p) => p.active)
    .map((p) => ({ value: p.id, label: p.display_name }))
  const companies = data.companies.map((c) => ({ value: c.id, label: c.name }))
  const projects = data.projects
    .filter((p) => p.status !== 'archived')
    .map((p) => ({
      value: p.id,
      label: `${data.companies.find((c) => c.id === p.company_id)?.name} · ${p.name}`,
    }))
  const company = f('company_id', 'Empresa', 'select', false, { options: companies })
  const project = f('project_id', 'Proyecto', 'select', false, {
    optionsFor: (v) =>
      projects.filter(
        (o) =>
          !v.company_id || data.projects.find((p) => p.id === o.value)?.company_id === v.company_id,
      ),
  })
  const person = (key: string, label: string) => f(key, label, 'select', true, { options: people })
  let title = '',
    steps: Step[] = [],
    initial: Values = {}
  const kind = request.kind
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (kind === 'company') {
    title = request.id ? 'Editar empresa' : 'Añadir marca'
    initial = {
      name: '',
      industry: '',
      contact_name: '',
      phone: '',
      email: '',
      maps_url: '',
      networks: '',
      notes: '',
    }
    steps = [
      {
        title: 'Conozcamos la marca',
        fields: [
          f('name', 'Nombre de la empresa', 'text', true),
          f('industry', 'Rubro'),
          imageField('logo', 'Logo de la empresa'),
        ],
      },
      {
        title: 'Contacto y ubicación',
        fields: [
          f('contact_name', 'Persona de contacto'),
          f('phone', 'WhatsApp con código de país', 'tel', false, { placeholder: '549…' }),
          f('email', 'Correo electrónico', 'email'),
          f('maps_url', 'Ubicación en Google Maps', 'url'),
        ],
      },
      {
        title: 'Su presencia y necesidades',
        fields: [
          f('networks', 'Redes sociales y sitio web', 'textarea'),
          f('notes', 'Problemas, necesidades o notas', 'textarea'),
          extraFiles,
          f('attachment_url', 'Adjuntar un enlace', 'url'),
        ],
      },
    ]
  } else if (kind === 'project') {
    title = request.id ? 'Editar proyecto' : 'Nuevo proyecto'
    initial = {
      company_id: '',
      name: '',
      description: '',
      owner_id: user.id,
      start_date: today(),
      end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      budget: '',
      status: 'planning',
      priority: 'medium',
      github_url: '',
      public_url: '',
    }
    steps = [
      {
        title: '¿Qué vamos a crear?',
        fields: [
          { ...company, required: true, show: () => !request.id },
          f('name', 'Nombre del proyecto', 'text', true),
          f('description', 'Alcance del trabajo', 'textarea'),
        ],
      },
      {
        title: 'Equipo y planificación',
        fields: [
          person('owner_id', 'Responsable'),
          dateField('start_date', 'Fecha de inicio'),
          dateField('end_date', 'Fecha de entrega'),
          f('priority', 'Prioridad', 'select', true, {
            options: choices(['low', 'medium', 'high']),
          }),
          f('status', 'Estado', 'select', true, {
            options: choices(['planning', 'active', 'waiting', 'completed', 'archived']),
          }),
        ],
      },
      {
        title: 'Presupuesto y enlaces',
        fields: [
          f('budget', 'Presupuesto acordado (ARS)', 'number', false, { min: 0 }),
          f('github_url', 'Repositorio de GitHub', 'url'),
          f('public_url', 'Dirección pública del proyecto', 'url'),
        ],
      },
    ]
  } else if (kind === 'post' || kind === 'update') {
    title = kind === 'post' ? 'Publicar una novedad' : 'Actualizar estado de un proyecto'
    initial = {
      company_id: '',
      project_id: '',
      content: '',
      responsible_id: user.id,
      happened_on: today(),
      next_step: '',
      blocker: '',
      mentions: [],
    }
    steps = [
      {
        title: '¿Dónde queda esta novedad?',
        description:
          kind === 'post'
            ? 'Podés dejar una nota general o vincularla a una empresa o proyecto.'
            : undefined,
        fields: [
          company,
          { ...project, required: kind === 'update' },
          ...(kind === 'update'
            ? [
                dateField('happened_on', 'Fecha del avance'),
                person('responsible_id', 'Persona a cargo'),
              ]
            : []),
        ],
      },
      {
        title: kind === 'post' ? 'Compartí con el equipo' : '¿Qué se hizo?',
        fields: [
          f('content', kind === 'post' ? 'Tu mensaje' : 'Trabajo realizado', 'textarea', true),
          ...(kind === 'update'
            ? [
                f('next_step', '¿Qué sigue?', 'textarea'),
                f('blocker', '¿Hay algún bloqueo?', 'textarea'),
              ]
            : []),
        ],
      },
      {
        title: 'Archivos y menciones',
        fields: [
          extraFiles,
          f('attachment_url', 'Adjuntar un enlace', 'url'),
          f('mentions', 'Avisar a', 'multi', false, {
            options: people,
            hint: 'Las personas seleccionadas reciben una notificación.',
          }),
        ],
      },
    ]
  } else if (kind === 'task') {
    title = 'Nueva tarea'
    initial = {
      project_id: '',
      title: '',
      assignee_id: user.id,
      start_date: today(),
      due_date: tomorrow,
      status: 'todo',
      priority: 'medium',
    }
    steps = [
      {
        title: 'Un próximo paso claro',
        fields: [
          { ...project, required: true },
          f('title', '¿Qué hay que hacer?', 'textarea', true),
          person('assignee_id', 'Responsable'),
        ],
      },
      {
        title: 'Fecha y prioridad',
        fields: [
          dateField('start_date', 'Inicio'),
          dateField('due_date', 'Vencimiento'),
          f('priority', 'Prioridad', 'select', true, {
            options: choices(['low', 'medium', 'high']),
          }),
          f('status', 'Estado', 'select', true, {
            options: choices(['todo', 'doing', 'blocked', 'done']),
          }),
        ],
      },
    ]
  } else if (kind === 'meeting') {
    title = request.id ? 'Editar reunión' : 'Agendar una reunión'
    initial = {
      company_id: 'internal',
      project_id: '',
      title: '',
      date: tomorrow,
      time: '10:00',
      duration: '60',
      attendees: [user.id],
      guests: '',
      location_type: 'virtual',
      location: '',
      notes: '',
      reminder_minutes: String(user.reminder_minutes),
      recurrence: 'none',
      occurrences: '4',
      allow_conflict: false,
    }
    steps = [
      {
        title: '¿Con quién nos reunimos?',
        fields: [
          f('company_id', 'Empresa o equipo', 'select', true, {
            options: [
              { value: 'internal', label: 'Reunión interna de PULSO' },
              { value: 'new', label: '+ Nueva empresa' },
              ...companies,
            ],
          }),
          f('new_company_name', 'Nombre de la nueva empresa', 'text', true, {
            show: (v) => v.company_id === 'new',
          }),
          f('new_contact_name', 'Persona de contacto', 'text', false, {
            show: (v) => v.company_id === 'new',
          }),
          f('new_phone', 'WhatsApp', 'tel', false, { show: (v) => v.company_id === 'new' }),
          {
            ...project,
            show: (v) => !!v.company_id && !['new', 'internal'].includes(v.company_id),
          },
          f('title', 'Motivo de la reunión', 'text', true),
        ],
      },
      {
        title: 'Fecha y participantes',
        fields: [
          dateField('date', 'Día'),
          f('time', 'Hora', 'time', true),
          f('duration', 'Duración (minutos)', 'number', true, { min: 5, max: 1440, step: 1 }),
          f('attendees', 'Integrantes de PULSO', 'multi', false, { options: people }),
          f('guests', 'Contactos invitados'),
          f('allow_conflict', 'Permitir superposición', 'checkbox', false, {
            placeholder: 'Revisé el cruce y quiero guardar igualmente.',
          }),
        ],
      },
      {
        title: 'Lugar y recordatorios',
        fields: [
          f('location_type', 'Modalidad', 'select', true, {
            options: choices(['virtual', 'presencial', 'llamada']),
          }),
          f('location', 'Enlace, dirección o teléfono'),
          f('notes', 'Temas para conversar', 'textarea'),
          f('reminder_minutes', 'Avisar antes', 'select', true, {
            options: [
              { value: '0', label: 'Al comenzar' },
              { value: '15', label: '15 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '60', label: '1 hora' },
              { value: '1440', label: '1 día' },
            ],
          }),
          ...(!request.id
            ? [
                f('recurrence', 'Repetir', 'select', true, {
                  options: [
                    { value: 'none', label: 'No se repite' },
                    { value: 'weekly', label: 'Cada semana' },
                    { value: 'monthly', label: 'Cada mes' },
                  ],
                }),
                f('occurrences', 'Cantidad de reuniones', 'number', true, {
                  min: 2,
                  max: 12,
                  step: 1,
                  show: (v) => v.recurrence !== 'none',
                }),
              ]
            : []),
        ],
      },
    ]
  } else if (kind === 'installment') {
    title = 'Programar una cuota'
    initial = { project_id: '', title: '', amount: '', due_date: tomorrow }
    steps = [
      {
        title: 'El acuerdo de cobro',
        fields: [
          { ...project, required: true },
          f('title', 'Concepto', 'text', true, {
            placeholder: 'Anticipo, segunda cuota, entrega final…',
          }),
        ],
      },
      {
        title: 'Importe y vencimiento',
        fields: [
          f('amount', 'Importe (ARS)', 'number', true, { min: 0.01 }),
          dateField('due_date', 'Vencimiento'),
        ],
      },
    ]
  } else if (kind === 'payment') {
    title = 'Registrar cobro'
    initial = {
      installment_id: '',
      amount: '',
      paid_on: today(),
      method: 'Transferencia',
      note: '',
    }
    steps = [
      {
        title: '¿A qué cuota corresponde?',
        fields: [
          f('installment_id', 'Cuota pendiente', 'select', true, {
            options: data.installments
              .filter((i) => balance(i, data.payments) > 0)
              .map((i) => ({
                value: i.id,
                label: `${data.projects.find((p) => p.id === i.project_id)?.name} · ${i.title} · Saldo $${balance(i, data.payments).toLocaleString('es-AR')}`,
              })),
          }),
          f('amount', 'Importe recibido (ARS)', 'number', true, { min: 0.01 }),
        ],
      },
      {
        title: 'Detalle del pago',
        fields: [
          dateField('paid_on', 'Fecha de pago'),
          f('method', 'Medio de pago', 'select', true, { options: methods }),
          f('note', 'Notas', 'textarea'),
          f('receipt', 'Comprobante', 'files', false, { accept: 'image/*,application/pdf' }),
        ],
      },
    ]
  } else if (kind === 'expense') {
    title = 'Ingresar gasto'
    initial = {
      company_id: '',
      project_id: '',
      category: 'Herramientas y software',
      description: '',
      amount: '',
      method: 'Transferencia',
      paid_on: today(),
      paid_by: user.id,
    }
    steps = [
      {
        title: '¿En qué se gastó?',
        fields: [
          f('category', 'Tipo de gasto', 'select', true, {
            options: [
              'Herramientas y software',
              'Publicidad',
              'Servicios profesionales',
              'Traslados',
              'Equipamiento',
              'Impuestos',
              'Otro',
            ].map((value) => ({ value, label: value })),
          }),
          f('description', 'Descripción', 'textarea', true),
          company,
          project,
        ],
      },
      {
        title: 'Pago y comprobante',
        fields: [
          f('amount', 'Importe (ARS)', 'number', true, { min: 0.01 }),
          f('method', 'Medio de pago', 'select', true, { options: methods }),
          dateField('paid_on', 'Fecha del gasto'),
          person('paid_by', '¿Quién pagó?'),
          f('receipt', 'Comprobante', 'files', false, { accept: 'image/*,application/pdf' }),
        ],
      },
    ]
  } else if (kind === 'member') {
    title = 'Agregar integrante'
    initial = { username: '', display_name: '', password: '' }
    steps = [
      {
        title: 'Su perfil en PULSO',
        fields: [
          f('display_name', 'Nombre completo', 'text', true),
          f('username', 'Nombre de usuario', 'text', true, {
            hint: 'Entre 3 y 30 letras minúsculas, números o guion bajo.',
          }),
        ],
      },
      {
        title: 'Acceso inicial',
        fields: [
          f('password', 'Contraseña temporal', 'password', true, {
            hint: 'Mínimo 8 caracteres. Deberá cambiarla al ingresar.',
          }),
        ],
      },
    ]
  }
  initial = { ...initial, ...request.initial }
  async function attachments(v: Values, scope: { company_id?: string; post_id?: string }) {
    for (const file of (v.files || []) as File[]) {
      const key = `${file.name}-${file.size}-${file.lastModified}`
      if (savedFiles.current.has(key)) continue
      const path = await upload(file, user!.id)
      await insert('attachments', { ...scope, name: file.name, path, created_by: user!.id })
      savedFiles.current.add(key)
    }
    if (v.attachment_url && !savedFiles.current.has('url')) {
      await insert('attachments', {
        ...scope,
        name: v.attachment_url,
        url: v.attachment_url,
        created_by: user!.id,
      })
      savedFiles.current.add('url')
    }
  }
  async function save(v: Values) {
    const creator = { created_by: user!.id }
    const base = {
      company_id: !v.company_id || ['new', 'internal'].includes(v.company_id) ? null : v.company_id,
      project_id: v.project_id || null,
    }
    if (kind === 'company') {
      const values = {
        name: v.name.trim(),
        industry: v.industry || '',
        contact_name: v.contact_name || '',
        phone: v.phone || '',
        email: v.email || '',
        maps_url: v.maps_url || '',
        networks: v.networks || '',
        notes: v.notes || '',
        ...(v.logo?.[0] ? { logo_path: await upload(v.logo[0], user!.id) } : {}),
      }
      const id =
        request.id ||
        createdRow.current ||
        (await insert('companies', { ...values, ...creator })).id
      createdRow.current = id
      if (request.id) await update('companies', id, values)
      await attachments(v, { company_id: id })
      navigate(`/empresas/${id}`)
    } else if (kind === 'project') {
      const values = {
        company_id: v.company_id,
        name: v.name,
        description: v.description || '',
        owner_id: v.owner_id,
        start_date: v.start_date,
        end_date: v.end_date,
        budget: Number(v.budget || 0),
        status: v.status,
        priority: v.priority,
        github_url: v.github_url || '',
        public_url: v.public_url || '',
      }
      const id = request.id || (await insert('projects', { ...values, ...creator })).id
      if (request.id) await update('projects', id, values)
      navigate(`/proyectos/${id}`)
    } else if (kind === 'post' || kind === 'update') {
      const id =
        createdRow.current ||
        (
          await insert('posts', {
            ...base,
            author_id: user!.id,
            responsible_id: v.responsible_id || user!.id,
            content: v.content,
            happened_on: v.happened_on || today(),
            kind: kind === 'update' ? 'update' : 'note',
            next_step: v.next_step || '',
            blocker: v.blocker || '',
            mentions: v.mentions || [],
          })
        ).id
      createdRow.current = id
      await attachments(v, { post_id: id, company_id: base.company_id || undefined })
    } else if (kind === 'task') {
      await insert('tasks', {
        project_id: v.project_id,
        title: v.title,
        assignee_id: v.assignee_id,
        start_date: v.start_date,
        due_date: v.due_date,
        status: v.status,
        priority: v.priority,
        ...creator,
      })
    } else if (kind === 'meeting') {
      if (v.company_id === 'new') {
        if (!createdCompany.current)
          createdCompany.current = (
            await insert('companies', {
              name: v.new_company_name.trim(),
              contact_name: v.new_contact_name || '',
              phone: v.new_phone || '',
              ...creator,
            })
          ).id
        base.company_id = createdCompany.current
      }
      const start = new Date(`${v.date}T${v.time}`)
      const series = request.id ? null : v.recurrence !== 'none' ? crypto.randomUUID() : null
      const count = series ? Number(v.occurrences) : 1
      const rows = Array.from({ length: count }, (_, i) => {
        const when = v.recurrence === 'monthly' ? addMonths(start, i) : addWeeks(start, i)
        return {
          ...base,
          title: v.title,
          starts_at: when.toISOString(),
          ends_at: new Date(when.getTime() + Number(v.duration) * 60000).toISOString(),
          attendees: v.attendees || [],
          guests: v.guests || '',
          location_type: v.location_type,
          location: v.location || '',
          notes: v.notes || '',
          reminder_minutes: Number(v.reminder_minutes),
          ...(!request.id ? { series_id: series, ...creator } : {}),
        }
      })
      if (request.id) await update('meetings', request.id, rows[0])
      else {
        const { error } = await supabase.from('meetings').insert(rows)
        if (error) throw error
        await refresh()
      }
      navigate('/agenda')
    } else if (kind === 'installment') {
      await insert('installments', {
        project_id: v.project_id,
        title: v.title,
        amount: Number(v.amount),
        due_date: v.due_date,
        ...creator,
      })
    } else if (kind === 'payment') {
      await insert('payments', {
        installment_id: v.installment_id,
        amount: Number(v.amount),
        paid_on: v.paid_on,
        method: v.method,
        note: v.note || '',
        receipt_path: v.receipt?.[0] ? await upload(v.receipt[0], user!.id) : null,
        ...creator,
      })
    } else if (kind === 'expense') {
      await insert('expenses', {
        ...base,
        category: v.category,
        description: v.description,
        amount: Number(v.amount),
        method: v.method,
        paid_on: v.paid_on,
        paid_by: v.paid_by,
        receipt_path: v.receipt?.[0] ? await upload(v.receipt[0], user!.id) : null,
        ...creator,
      })
    } else if (kind === 'member') {
      const { error } = await supabase.rpc('admin_create_member', {
        p_username: v.username.trim(),
        p_name: v.display_name.trim(),
        p_password: v.password,
      })
      if (error) throw error
      await refresh()
    }
    toast(request.id ? 'Cambios guardados' : 'Listo. Ya está compartido con el equipo.')
  }
  function validate(v: Values, step: number) {
    const final = step === steps.length
    if (
      (kind === 'project' || kind === 'task') &&
      (step === 1 || final) &&
      (v.end_date || v.due_date) < v.start_date
    )
      return 'La fecha final debe ser igual o posterior al inicio.'
    if (
      kind === 'company' &&
      (step === 0 || final) &&
      data.companies.some(
        (c) =>
          normalize(c.name) === normalize(v.name) &&
          c.id !== request.id &&
          c.id !== createdRow.current,
      )
    )
      return 'Ya existe una empresa con ese nombre. Buscala para evitar duplicados.'
    if (kind === 'meeting') {
      if (
        (step === 0 || final) &&
        v.company_id === 'new' &&
        data.companies.some(
          (c) =>
            normalize(c.name) === normalize(v.new_company_name) && c.id !== createdCompany.current,
        )
      )
        return 'Esa empresa ya está registrada. Seleccionala de la lista.'
      if ((step === 1 || final) && (!v.attendees || v.attendees.length === 0))
        return 'Seleccioná al menos un integrante del equipo.'
      if (step === 1 || final) {
        const start = new Date(`${v.date}T${v.time}`)
        if (!Number.isFinite(start.getTime())) return 'Revisá la fecha y la hora.'
        const n = final && v.recurrence !== 'none' && !request.id ? Number(v.occurrences) : 1
        for (let i = 0; i < n; i++) {
          const s = v.recurrence === 'monthly' ? addMonths(start, i) : addWeeks(start, i)
          if (
            !v.allow_conflict &&
            conflicts(
              data.meetings,
              s.toISOString(),
              new Date(s.getTime() + Number(v.duration) * 60000).toISOString(),
              v.attendees,
              request.id,
            ).length
          )
            return 'Hay un cruce con otra reunión de los participantes. Cambiá el horario o confirmá la superposición.'
        }
      }
    }
    if (kind === 'payment' && (step === 0 || final)) {
      const i = data.installments.find((x) => x.id === v.installment_id)
      if (!i) return 'Seleccioná una cuota pendiente.'
      if (Number(v.amount) > balance(i, data.payments))
        return 'El importe supera el saldo pendiente.'
    }
    if (kind === 'member' && (step === 0 || final) && !/^[a-z0-9_]{3,30}$/.test(v.username))
      return 'El usuario debe tener entre 3 y 30 letras minúsculas, números o guion bajo.'
    if (kind === 'member' && (step === 1 || final) && v.password.length < 8)
      return 'La contraseña debe tener al menos 8 caracteres.'
  }
  return (
    <Wizard
      title={title}
      steps={steps}
      initial={initial}
      draftId={`${kind}-${request.id || request.initial?.project_id || request.initial?.company_id || 'new'}`}
      onClose={onClose}
      onSave={save}
      validate={validate}
      extra={(v, step) => {
        if (kind !== 'meeting' || step !== 1 || !v.date || !v.time) return null
        const start = new Date(`${v.date}T${v.time}`)
        if (!Number.isFinite(start.getTime())) return null
        const matches = conflicts(
          data.meetings,
          start.toISOString(),
          new Date(start.getTime() + Number(v.duration || 60) * 60000).toISOString(),
          v.attendees || [],
          request.id,
        )
        return matches.length ? (
          <div className="warning-box">
            Cruce de horario: {matches.map((m) => m.title).join(', ')}
          </div>
        ) : null
      }}
    />
  )
}
