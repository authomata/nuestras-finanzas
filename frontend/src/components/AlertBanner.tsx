import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

interface Alert {
  categoryId: string
  name: string
  pct: number
  threshold: number
}

interface Props {
  alerts: Alert[]
}

export function AlertBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([])

  const visible = alerts.filter((a) => !dismissed.includes(a.categoryId))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.categoryId}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            alert.pct >= 100
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              <strong>{alert.name}</strong>:{' '}
              {alert.pct >= 100
                ? `presupuesto agotado (${alert.pct}%)`
                : `${alert.pct}% del presupuesto usado`}
            </span>
          </div>
          <button
            onClick={() => setDismissed((d) => [...d, alert.categoryId])}
            className="opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
