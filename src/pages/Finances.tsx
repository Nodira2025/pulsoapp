import { useState } from 'react'
import {
  Plus,
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { fileUrl } from '../lib/supabase'
import { balance, dateLabel, money, today, whatsapp, messageOf, normalize } from '../lib/utils'
import { PageTitle, Empty, Badge, FileLink, Modal } from '../components/UI'
import type { OpenForm } from './Feed'
import type { Payment } from '../lib/types'
export function Finances({
  open,
  companyId,
  projectId,
  expenseOnly = false,
}: {
  open: OpenForm
  companyId?: string
  projectId?: string
  expenseOnly?: boolean
}) {
  const { data, toast } = useStore()
  const [view, setView] = useState(expenseOnly ? 'expenses' : 'pending'),
    [search, setSearch] = useState(''),
    [share, setShare] = useState<{ href: string; hasFile: boolean } | null>(null),
    [preparing, setPreparing] = useState<string | null>(null)
  const projects = data.projects.filter(
    (p) => (!companyId || p.company_id === companyId) && (!projectId || p.id === projectId),
  )
  const installments = data.installments.filter((i) => projects.some((p) => p.id === i.project_id))
  const payments = data.payments.filter((p) => installments.some((i) => i.id === p.installment_id))
  const expenses = data.expenses.filter(
    (e) => (!companyId || e.company_id === companyId) && (!projectId || e.project_id === projectId),
  )
  const pending = installments.filter((i) => balance(i, data.payments) > 0)
  const overdue = pending.filter((i) => i.due_date < today())
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0),
    spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const scope = { company_id: companyId || '', project_id: projectId || '' }
  const projectName = (id: string) => {
    const p = data.projects.find((p) => p.id === id)
    return `${data.companies.find((c) => c.id === p?.company_id)?.name || ''} · ${p?.name || ''}`
  }
  async function prepareShare(p: Payment) {
    setPreparing(p.id)
    try {
      const i = data.installments.find((i) => i.id === p.installment_id)!,
        project = data.projects.find((pr) => pr.id === i.project_id)!,
        company = data.companies.find((c) => c.id === project.company_id)!
      let text = `Hola, ${company.contact_name || company.name}. Registramos tu pago de ${money(p.amount)} del ${dateLabel(p.paid_on)} por ${i.title} (${project.name}). Saldo de esta cuota: ${money(balance(i, data.payments))}. Gracias, equipo PULSO.`
      if (p.receipt_path)
        text += `\nComprobante (disponible durante 7 días): ${await fileUrl(p.receipt_path, 604800)}`
      setShare({ href: whatsapp(company.phone, text), hasFile: !!p.receipt_path })
    } catch (e) {
      toast(messageOf(e))
    } finally {
      setPreparing(null)
    }
  }
  return (
    <>
      {!companyId && (
        <PageTitle
          eyebrow="CUENTAS CLARAS"
          title={expenseOnly ? 'Gastos' : 'Cobros y cuotas'}
          description={
            expenseOnly
              ? 'Cada gasto, con su motivo y comprobante.'
              : 'Lo acordado, lo recibido y lo que sigue pendiente.'
          }
          action={
            <button
              className="button primary"
              onClick={() => open({ kind: expenseOnly ? 'expense' : 'payment', initial: scope })}
            >
              <Plus size={18} />
              {expenseOnly ? 'Ingresar gasto' : 'Registrar cobro'}
            </button>
          }
        />
      )}
      <div className="finance-summary">
        <div className="card">
          <span>
            <Wallet size={18} />
            Por cobrar
          </span>
          <strong>{money(pending.reduce((n, i) => n + balance(i, data.payments), 0))}</strong>
          <small>{overdue.length} cuotas vencidas</small>
        </div>
        <div className="card">
          <span>
            <ArrowDownLeft size={18} />
            Cobrado
          </span>
          <strong>{money(paid)}</strong>
          <small>{payments.length} pagos registrados</small>
        </div>
        <div className="card">
          <span>
            <ArrowUpRight size={18} />
            Gastos
          </span>
          <strong>{money(spent)}</strong>
          <small>{expenses.length} gastos registrados</small>
        </div>
      </div>
      <div className="toolbar">
        {!expenseOnly && (
          <div className="segmented">
            <button
              className={view === 'pending' ? 'active' : ''}
              onClick={() => setView('pending')}
            >
              Cuotas
            </button>
            <button
              className={view === 'history' ? 'active' : ''}
              onClick={() => setView('history')}
            >
              Historial de pagos
            </button>
            <button
              className={view === 'expenses' ? 'active' : ''}
              onClick={() => setView('expenses')}
            >
              Gastos
            </button>
          </div>
        )}
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Buscar por concepto o proyecto"
            aria-label="Buscar movimientos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className="button secondary"
          onClick={() =>
            open({ kind: view === 'expenses' ? 'expense' : 'installment', initial: scope })
          }
        >
          <Plus size={17} />
          {view === 'expenses' ? 'Ingresar gasto' : 'Programar cuota'}
        </button>
      </div>
      {view === 'pending' && (
        <div className="card finance-list">
          {installments
            .filter((i) =>
              normalize(`${i.title} ${projectName(i.project_id)}`).includes(normalize(search)),
            )
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
            .map((i) => {
              const left = balance(i, data.payments)
              return (
                <div className="finance-row" key={i.id}>
                  <div className="finance-row-icon">
                    <Wallet size={21} />
                  </div>
                  <div className="grow">
                    <strong>{i.title}</strong>
                    <Link className="meta" to={`/proyectos/${i.project_id}`}>
                      {projectName(i.project_id)}
                    </Link>
                    <small>
                      Vence {dateLabel(i.due_date)} · Total {money(i.amount)}
                    </small>
                  </div>
                  <Badge
                    status={left === 0 ? 'done' : i.due_date < today() ? 'blocked' : 'planning'}
                  >
                    {left === 0 ? 'Pagada' : i.due_date < today() ? 'Vencida' : 'Pendiente'}
                  </Badge>
                  <div className="amount">
                    <strong>{money(left)}</strong>
                    <small>Saldo pendiente</small>
                  </div>
                  {left > 0 && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        open({ kind: 'payment', initial: { installment_id: i.id, amount: left } })
                      }
                    >
                      Registrar pago
                    </button>
                  )}
                </div>
              )
            })}
          {!installments.length && (
            <Empty
              icon={Wallet}
              title="Organicemos el próximo cobro"
              description="Programá las cuotas de un proyecto y registrá cada pago cuando llegue."
              action={
                <button
                  className="button primary"
                  onClick={() => open({ kind: 'installment', initial: scope })}
                >
                  Programar cuota
                </button>
              }
            />
          )}
        </div>
      )}
      {view === 'history' && (
        <div className="card finance-list">
          {payments
            .filter((p) => {
              const i = installments.find((i) => i.id === p.installment_id)
              return normalize(
                `${i?.title} ${p.note} ${i ? projectName(i.project_id) : ''}`,
              ).includes(normalize(search))
            })
            .map((p) => {
              const i = installments.find((i) => i.id === p.installment_id)!
              return (
                <div className="payment-row" key={p.id}>
                  <div className="finance-row">
                    <div className="finance-row-icon green">
                      <ArrowDownLeft size={21} />
                    </div>
                    <div className="grow">
                      <strong>{i.title}</strong>
                      <span className="meta">{projectName(i.project_id)}</span>
                      <small>
                        {dateLabel(p.paid_on)} · {p.method} · Registró{' '}
                        {data.profiles.find((u) => u.id === p.created_by)?.display_name}
                      </small>
                    </div>
                    <strong className="amount">{money(p.amount)}</strong>
                  </div>
                  {p.note && <p className="muted">{p.note}</p>}
                  <div className="payment-actions">
                    {p.receipt_path && <FileLink path={p.receipt_path} />}
                    <button
                      className="text-button"
                      disabled={preparing === p.id}
                      onClick={() => void prepareShare(p)}
                    >
                      <MessageCircle size={17} />
                      {preparing === p.id ? 'Preparando…' : 'Compartir por WhatsApp'}
                    </button>
                  </div>
                </div>
              )
            })}
          {!payments.length && <Empty icon={Receipt} title="Todavía no hay pagos registrados" />}
        </div>
      )}
      {view === 'expenses' && (
        <div className="card finance-list">
          {expenses
            .filter((e) =>
              normalize(
                `${e.category} ${e.description} ${e.project_id ? projectName(e.project_id) : ''}`,
              ).includes(normalize(search)),
            )
            .map((e) => (
              <div className="payment-row" key={e.id}>
                <div className="finance-row">
                  <div className="finance-row-icon orange">
                    <Receipt size={21} />
                  </div>
                  <div className="grow">
                    <strong>{e.description}</strong>
                    <span className="meta">
                      {e.category} ·{' '}
                      {e.project_id
                        ? projectName(e.project_id)
                        : e.company_id
                          ? data.companies.find((c) => c.id === e.company_id)?.name
                          : 'Gasto general'}
                    </span>
                    <small>
                      {dateLabel(e.paid_on)} · {e.method} · Pagó{' '}
                      {data.profiles.find((p) => p.id === e.paid_by)?.display_name}
                    </small>
                  </div>
                  <strong className="amount">{money(e.amount)}</strong>
                </div>
                {e.receipt_path && <FileLink path={e.receipt_path} />}
              </div>
            ))}
          {!expenses.length && (
            <Empty
              icon={Receipt}
              title="Todos los gastos en un lugar"
              description="Registrá el primero para tener las cuentas al día."
              action={
                <button
                  className="button primary"
                  onClick={() => open({ kind: 'expense', initial: scope })}
                >
                  Ingresar gasto
                </button>
              }
            />
          )}
        </div>
      )}
      {share && (
        <Modal title="Compartir el pago" onClose={() => setShare(null)}>
          <div className="padded">
            <p>Revisá el mensaje en WhatsApp antes de enviarlo.</p>
            {share.hasFile && (
              <p className="muted">
                Incluye un enlace al comprobante válido por 7 días. Quien reciba el enlace podrá
                abrir ese archivo.
              </p>
            )}
            <a
              className="button primary"
              target="_blank"
              rel="noopener noreferrer"
              href={share.href}
            >
              <MessageCircle size={18} />
              Abrir WhatsApp
            </a>
          </div>
        </Modal>
      )}
    </>
  )
}
