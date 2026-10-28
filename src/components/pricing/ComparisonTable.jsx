import { Check, Minus } from 'lucide-react'
import Card from '../ui/Card'
import { COMPARISON } from '../../data/plans'

function Cell({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sage-700">
        <Check size={18} aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-300">
        <Minus size={18} aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    )
  }
  return <span className="text-ink-800">{value}</span>
}

export default function ComparisonTable() {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-136 text-left text-sm">
          <caption className="sr-only">Free and Premium plan comparison</caption>
          <thead className="border-b border-line bg-ivory-100">
            <tr>
              <th scope="col" className="px-5 py-4 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-500">
                Feature
              </th>
              <th scope="col" className="px-5 py-4 font-display text-lg font-semibold">Free</th>
              <th scope="col" className="px-5 py-4 font-display text-lg font-semibold text-ember-600">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {COMPARISON.map((row) => (
              <tr key={row.feature} className="transition-colors hover:bg-ivory-100/60">
                <th scope="row" className="px-5 py-4 font-medium text-ink-900">{row.feature}</th>
                <td className="px-5 py-4"><Cell value={row.free} /></td>
                <td className="px-5 py-4"><Cell value={row.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}