export type ID = string
export interface Profile {
  id: ID
  username: string
  display_name: string
  avatar_path: string | null
  phone: string
  bio: string
  role: 'admin' | 'member'
  active: boolean
  must_change_password: boolean
  reminder_minutes: number
  created_at: string
}
export interface Company {
  id: ID
  name: string
  industry: string
  contact_name: string
  phone: string
  email: string
  maps_url: string
  networks: string
  notes: string
  logo_path: string | null
  created_by: ID
  created_at: string
}
export interface Project {
  id: ID
  company_id: ID
  name: string
  description: string
  owner_id: ID
  status: 'planning' | 'active' | 'waiting' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high'
  start_date: string
  end_date: string
  budget: number
  github_url: string
  public_url: string
  created_by: ID
  created_at: string
}
export interface Task {
  id: ID
  project_id: ID
  title: string
  description: string
  assignee_id: ID
  start_date: string
  due_date: string
  status: 'todo' | 'doing' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_by: ID
  created_at: string
}
export interface Post {
  id: ID
  company_id: ID | null
  project_id: ID | null
  author_id: ID
  responsible_id: ID | null
  content: string
  next_step: string
  blocker: string
  happened_on: string
  kind: 'note' | 'update'
  created_at: string
  mentions: ID[]
}
export interface Comment {
  id: ID
  post_id: ID
  author_id: ID
  content: string
  created_at: string
}
export interface Reaction {
  post_id: ID
  user_id: ID
}
export interface Installment {
  id: ID
  project_id: ID
  title: string
  amount: number
  due_date: string
  created_by: ID
  created_at: string
}
export interface Payment {
  id: ID
  installment_id: ID
  amount: number
  paid_on: string
  method: string
  note: string
  receipt_path: string | null
  created_by: ID
  created_at: string
}
export interface Expense {
  id: ID
  company_id: ID | null
  project_id: ID | null
  category: string
  description: string
  amount: number
  method: string
  paid_on: string
  paid_by: ID
  receipt_path: string | null
  created_by: ID
  created_at: string
}
export interface Meeting {
  id: ID
  company_id: ID | null
  project_id: ID | null
  title: string
  starts_at: string
  ends_at: string
  attendees: ID[]
  guests: string
  location_type: 'virtual' | 'presencial' | 'llamada'
  location: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed'
  notes: string
  outcome: string
  reminder_minutes: number
  series_id: ID | null
  created_by: ID
  created_at: string
}
export interface MeetingChange {
  id: ID
  meeting_id: ID
  changed_by: ID
  old_starts_at: string
  new_starts_at: string
  old_status: string
  new_status: string
  created_at: string
}
export interface Attachment {
  id: ID
  company_id: ID | null
  post_id: ID | null
  name: string
  path: string | null
  url: string | null
  created_by: ID
  created_at: string
}
export interface Notice {
  id: ID
  recipient_id: ID
  title: string
  body: string
  href: string
  read_at: string | null
  created_at: string
}
export interface Data {
  profiles: Profile[]
  companies: Company[]
  projects: Project[]
  tasks: Task[]
  posts: Post[]
  comments: Comment[]
  reactions: Reaction[]
  installments: Installment[]
  payments: Payment[]
  expenses: Expense[]
  meetings: Meeting[]
  meeting_changes: MeetingChange[]
  attachments: Attachment[]
  notifications: Notice[]
}
export type Table = keyof Data
export const emptyData: Data = {
  profiles: [],
  companies: [],
  projects: [],
  tasks: [],
  posts: [],
  comments: [],
  reactions: [],
  installments: [],
  payments: [],
  expenses: [],
  meetings: [],
  meeting_changes: [],
  attachments: [],
  notifications: [],
}
export const labels: Record<string, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
  llamada: 'Llamada',
  planning: 'Por comenzar',
  active: 'En curso',
  waiting: 'Esperando al cliente',
  completed: 'Finalizado',
  archived: 'Archivado',
  todo: 'Pendiente',
  doing: 'En curso',
  blocked: 'Bloqueado',
  done: 'Completado',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  scheduled: 'Programada',
  cancelled: 'Cancelada',
  missed: 'No se realizó',
}
