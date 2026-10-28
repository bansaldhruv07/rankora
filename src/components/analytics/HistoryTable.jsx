import Badge from '../ui/Badge'
import Card from '../ui/Card'
import { getTestStats } from '../../utils/analytics'
import { formatClock, formatDate } from '../../utils/format'

const KIND_LABEL = { mock: 'Mock test', diagnostic: 'Diagnostic', practice: 'Practice' }
const minus = (value) => String(value).replace('-', '−')

export default function HistoryTable({ history }) {
  const rows = [...history].reverse()

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <caption className="sr-only">Test history, newest first</caption>
          <thead className="border-b border-line bg-ivory-100 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Test</th>
              <th scope="col" className="px-5 py-3 font-medium">Date</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Score</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Accuracy</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((entry) => {
              const stats = getTestStats(entry)
              return (
                <tr key={entry.id} className="transition-colors hover:bg-ivory-100/60">
                  <th scope="row" className="px-5 py-4 font-medium text-ink-900">
                    <span className="block">{entry.name}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs font-normal text-ink-500">
                      {KIND_LABEL[entry.kind] ?? 'Test'}
                      {entry.sample && <Badge tone="ember">Sample</Badge>}
                    </span>
                  </th>
                  <td className="px-5 py-4 text-ink-600">{formatDate(entry.date)}</td>
                  <td className="tabular px-5 py-4 text-right font-mono text-ink-900">
                    {minus(entry.score)} / {entry.maxScore}
                  </td>
                  <td className="tabular px-5 py-4 text-right font-mono text-ink-700">{stats.accuracy}%</td>
                  <td className="tabular px-5 py-4 text-right font-mono text-ink-700">
                    {formatClock(entry.timeSeconds)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}