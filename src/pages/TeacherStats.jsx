import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Award, BadgeCheck, Clock, IndianRupee, MousePointerClick, ShoppingBag, Users, Wallet } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import { useApi } from '../hooks/useApi'
import { formatLongDate, formatPrice } from '../utils/format'
import NotFound from './NotFound'

const STATUS = {
  pending: { tone: 'neutral', label: 'In refund window' },
  payable: { tone: 'ember', label: 'Ready to pay' },
  paid: { tone: 'sage', label: 'Paid' },
  refunded: { tone: 'danger', label: 'Refunded' },
}
const BONUS = {
  not_eligible: { tone: 'neutral', label: 'Not reached' },
  eligible: { tone: 'ember', label: 'Reached, awaiting approval' },
  approved: { tone: 'sage', label: 'Approved' },
  issued: { tone: 'sage', label: 'Issued' },
}

// Search engines must not index a teacher's private page.
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = 'Teacher dashboard'
    return () => {
      meta.remove()
      document.title = title
    }
  }, [])
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-4 sm:p-5">
      <span className="grid size-9 place-items-center rounded-xl bg-ember-50 text-ember-600">
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-2xl font-semibold tabular sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>}
    </Card>
  )
}

function Table({ head, rows, empty }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-600">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-ivory-100 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
          <tr>
            {head.map(([label, right]) => (
              <th key={label} scope="col" className={`px-4 py-3 font-medium ${right ? 'text-right' : ''}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft bg-surface">{rows}</tbody>
      </table>
    </div>
  )
}

// A teacher's read-only dashboard. It is reached only through the private link the admin shares, needs no login, and
// shows totals and sales but never anything about the students.
export default function TeacherStats() {
  useNoIndex()
  const { token } = useParams()
  const { data, error, loading, reload } = useApi(`/t/${encodeURIComponent(token)}`)

  if (error?.status === 404) return <NotFound />

  return (
    <>
      <PageHeader eyebrow="Teacher dashboard" title={data ? `Hello, ${data.teacher.name.split(' ')[0]}` : 'Your dashboard'} description="Your students, sales and commission. This page is private: do not share the link.">
        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-sm font-semibold tracking-wide">{data.teacher.code}</span>
            {data.teacher.partnerTeacher && (
              <Badge tone="sage" icon={BadgeCheck}>
                Partner Teacher
              </Badge>
            )}
          </div>
        )}
      </PageHeader>

      <section className="page-container py-10 sm:py-12">
        {loading ? (
          <div role="status" aria-busy="true" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-ivory-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-semibold">Could not load your dashboard</p>
            <p className="mt-1 text-sm text-ink-600">{error.message}</p>
            <Button variant="outline" className="mt-5" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-10">
            {!data.teacher.active && (
              <p role="status" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
                Your code is switched off right now, so new students cannot use it. Your earnings below are unchanged.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Stat icon={MousePointerClick} label="Link clicks" value={data.stats.clicks} />
              <Stat icon={Users} label="Paid students" value={data.stats.paidStudents} hint="Different students who bought." />
              <Stat icon={ShoppingBag} label="Orders" value={data.stats.orders} />
              <Stat icon={IndianRupee} label="Total sales" value={formatPrice(data.stats.sales)} />
              <Stat icon={Wallet} label="Commission earned" value={formatPrice(data.stats.earned)} />
              <Stat icon={BadgeCheck} label="Paid to you" value={formatPrice(data.stats.paid)} />
              <Stat icon={Clock} label="Pending" value={formatPrice(data.stats.pending)} hint={`Paid out ${data.rules.refundWindowDays} days after each sale, once there is no refund.`} />
              <Stat icon={Award} label="Qualified students" value={data.stats.qualifiedStudents} hint="Past the refund window and not refunded." />
            </div>

            <Card className="p-5 sm:p-7">
              <h2 className="text-xl font-semibold">Milestone bonuses</h2>
              {data.stats.nextMilestone ? (
                <div className="mt-4">
                  <ProgressBar
                    value={data.stats.qualifiedStudents}
                    max={data.stats.nextMilestone.students}
                    label={`${data.stats.qualifiedStudents} of ${data.stats.nextMilestone.students} students`}
                    showValue
                  />
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">
                    {data.stats.nextMilestone.remaining} more {data.stats.nextMilestone.remaining === 1 ? 'student' : 'students'} to reach {data.stats.nextMilestone.students}: a{' '}
                    <strong className="text-ink-900">{formatPrice(data.stats.nextMilestone.giftValue)}</strong> gift card.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-600">You have reached every milestone. Thank you.</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Only different paying students count, and only after their refund window. Clicks, sign-ups and repeat orders do not.
              </p>
              {data.stats.bonuses.length > 0 && (
                <ul className="mt-5 divide-y divide-line-soft rounded-xl border border-line">
                  {data.stats.bonuses.map((bonus) => (
                    <li key={bonus.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="font-medium">
                        {bonus.milestone} students · {formatPrice(bonus.giftValue)} gift card{bonus.partnerTeacher ? ' · Partner Teacher' : ''}
                      </span>
                      <Badge tone={BONUS[bonus.status].tone}>{BONUS[bonus.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div>
              <h2 className="text-xl font-semibold">Month by month</h2>
              <div className="mt-4">
                <Table
                  head={[['Month'], ['Orders', true], ['Sales', true], ['Commission', true]]}
                  empty="No sales yet. Share your code with your students."
                  rows={data.monthly.map((m) => (
                    <tr key={m.month}>
                      <td className="px-4 py-3 font-medium">{m.month}</td>
                      <td className="px-4 py-3 text-right tabular">{m.orders}</td>
                      <td className="px-4 py-3 text-right tabular">{formatPrice(m.sales)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular">{formatPrice(m.commission)}</td>
                    </tr>
                  ))}
                />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Recent orders</h2>
              <div className="mt-4">
                <Table
                  head={[['Date'], ['Product'], ['Amount', true], ['Status']]}
                  empty="Your first sale will appear here."
                  rows={data.recent.map((order, index) => (
                    <tr key={`${order.date}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatLongDate(order.date)}</td>
                      <td className="px-4 py-3">{order.product}</td>
                      <td className="px-4 py-3 text-right tabular">{formatPrice(order.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Badge>
                      </td>
                    </tr>
                  ))}
                />
              </div>
              <p className="mt-3 text-xs text-ink-500">For privacy, student names and contact details are never shown.</p>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
