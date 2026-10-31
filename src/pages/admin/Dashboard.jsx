import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, PageTitle, Panel, StatusBadge, Table } from '../../components/admin/ui'
import { useApi } from '../../hooks/useApi'
import { formatDateTime, formatLongDate, formatPrice } from '../../utils/format'
import { cn } from '../../utils/cn'

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="tabular mt-2 font-display text-4xl font-semibold text-ink-900">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
    </div>
  )
}

const niceMax = (value) => {
  if (value <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(value))
  const f = value / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

const W = 720
const H = 230
const PAD = { l: 52, r: 8, t: 12, b: 28 }

// Revenue per day: one series, so no legend; the title names it. The table view is the accessible equivalent.
function RevenueChart({ series }) {
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  const max = niceMax(Math.max(...series.map((d) => d.revenue)))
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const band = plotW / series.length
  const barW = Math.max(2, Math.min(18, band - 2))
  const y = (v) => PAD.t + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const total = series.reduce((s, d) => s + d.revenue, 0)
  const label = (d) => new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          <span className="tabular font-semibold text-ink-900">{formatPrice(total)}</span> over {series.length} days
        </p>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
          {table ? 'Show chart' : 'View as table'}
        </button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Revenue per day</caption>
            <thead className="sticky top-0 bg-ivory-100 text-left font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
              <tr>
                <th className="px-4 py-2 font-medium">Day</th>
                <th className="px-4 py-2 text-right font-medium">Orders</th>
                <th className="px-4 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {[...series].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2">{label(d)}</td>
                  <td className="tabular px-4 py-2 text-right">{d.orders}</td>
                  <td className="tabular px-4 py-2 text-right">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bar chart of revenue per day, ${formatPrice(total)} in total`} className="w-full" onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e9e1cf" strokeWidth="1" />
                <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5f6e8a" className="tabular">
                  {t === 0 ? '₹0' : `₹${t.toLocaleString('en-IN')}`}
                </text>
              </g>
            ))}
            {series.map((d, i) => {
              const x = PAD.l + i * band + (band - barW) / 2
              const h = Math.max(0, (d.revenue / max) * plotH)
              const top = PAD.t + plotH - h
              const r = Math.min(4, barW / 2, h)
              return (
                <g key={d.date}>
                  {h > 0 && (
                    <path
                      d={`M${x},${PAD.t + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.t + plotH} Z`}
                      fill={hover === i ? '#c2571a' : '#2f4064'}
                    />
                  )}
                  <rect x={PAD.l + i * band} y={PAD.t} width={band} height={plotH + 14} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${label(d)}: ${formatPrice(d.revenue)}, ${d.orders} orders`} />
                </g>
              )
            })}
            <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="#aab2c2" strokeWidth="1" />
            {[0, Math.floor((series.length - 1) / 2), series.length - 1].map((i) => (
              <text key={i} x={PAD.l + i * band + band / 2} y={H - 8} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#5f6e8a">
                {label(series[i])}
              </text>
            ))}
          </svg>
          {hover !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-2 text-xs text-ivory-50 shadow-lift"
              style={{ left: `${Math.min(88, Math.max(12, ((PAD.l + hover * band + band / 2) / W) * 100))}%` }}
            >
              <p className="font-semibold">{label(series[hover])}</p>
              <p className="tabular">{formatPrice(series[hover].revenue)} · {series[hover].orders} {series[hover].orders === 1 ? 'order' : 'orders'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const orderColumns = [
  { key: 'productTitle', label: 'Item', render: (o) => <span className="block max-w-[16rem] truncate">{o.productTitle}</span> },
  { key: 'user', label: 'Student', render: (o) => <span className="block max-w-[12rem] truncate text-ink-600">{o.user.email}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (o) => formatPrice(o.amount) },
  { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  { key: 'createdAt', label: 'When', render: (o) => <span className="whitespace-nowrap text-ink-600">{formatDateTime(o.paidAt ?? o.createdAt)}</span> },
]

export default function Dashboard() {
  const [days, setDays] = useState(30)
  const { data, error, loading, reload } = useApi(`/admin/stats?days=${days}`)

  if (error) return <ErrorNote error={error} onRetry={reload} />
  if (!data) return <div className="h-96 animate-pulse rounded-2xl bg-ivory-200" aria-busy="true" aria-label={loading ? 'Loading' : undefined} />
  const { totals, conversion } = data
  const pct = (v) => (v === null ? 'Not enough data yet' : `${v}%`)

  return (
    <>
      <PageTitle title="Overview" description="Real totals from orders and verified payments." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Students" value={totals.students} note="Registered accounts" />
        <Stat label="Paying customers" value={totals.payingCustomers} note="With at least one paid order" />
        <Stat label="Purchases" value={totals.purchases} note={totals.refundedOrders ? `${totals.refundedOrders} refunded, not counted` : 'Paid orders'} />
        <Stat label="Net revenue" value={formatPrice(totals.revenue)} note={totals.refunded ? `${formatPrice(totals.grossRevenue)} collected, ${formatPrice(totals.refunded)} refunded` : 'Collected, minus refunds'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel
          title="Revenue by day"
          action={
            <div className="flex gap-1 rounded-full bg-ivory-100 p-1" role="group" aria-label="Period">
              {[7, 30, 90].map((d) => (
                <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn('rounded-full px-3 py-1 text-xs font-semibold', days === d ? 'bg-ink-900 text-ivory-50' : 'text-ink-600')}>
                  {d}d
                </button>
              ))}
            </div>
          }
        >
          <RevenueChart series={data.revenueByDay} />
        </Panel>
        <Panel title="Conversion">
          <dl className="space-y-5">
            <div>
              <dt className="text-sm text-ink-600">Visits that became a purchase</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold">{pct(conversion.viewToPurchase)}</dd>
              <dd className="mt-1 text-xs text-ink-500">Purchases ÷ {conversion.views} product-page visits, each counted once per visitor per 30 minutes.</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-600">Checkouts that were paid</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold">{pct(conversion.checkoutCompletion)}</dd>
              <dd className="mt-1 text-xs text-ink-500">Of orders started, how many ended in a verified payment.</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-600">Reader sessions opened ({data.days}d)</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold">{totals.readerOpens}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Best selling">
          <Table
            rows={data.bestSelling}
            empty="No sales yet."
            columns={[
              { key: 'title', label: 'Item', render: (r) => <span className="block max-w-[16rem] truncate">{r.title}</span> },
              { key: 'sales', label: 'Sales', align: 'right' },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatPrice(r.revenue) },
            ]}
          />
        </Panel>
        <Panel title="Most viewed">
          <Table
            rows={data.mostViewed}
            empty="No page views recorded yet."
            columns={[
              { key: 'title', label: 'Note', render: (r) => <Link to={`/notes/${r.slug}`} className="block max-w-[18rem] truncate hover:text-ember-600">{r.title}</Link> },
              { key: 'views', label: 'Views', align: 'right' },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6 space-y-6">
        <Panel title="Recent transactions">
          <Table rows={data.recentTransactions} columns={orderColumns} empty="No transactions yet." />
        </Panel>
        <Panel title="Pending or failed payments" description="Orders started in the last 7 days that were not completed. Nothing is granted for these.">
          <Table rows={data.unfinishedPayments} columns={orderColumns} empty="None. Every recent checkout was completed or cancelled." />
        </Panel>
        <Panel title="Recent registrations">
          <Table
            rows={data.recentRegistrations}
            empty="No students yet."
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'createdAt', label: 'Joined', render: (r) => formatLongDate(r.createdAt) },
            ]}
          />
        </Panel>
      </div>
    </>
  )
}
