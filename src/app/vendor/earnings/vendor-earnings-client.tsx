'use client'

interface MonthlyItem {
  month: string
  gross: number
  net: number
}

export function VendorEarningsClient({ monthlyData }: { monthlyData: MonthlyItem[] }) {
  const maxNet = Math.max(...monthlyData.map((d) => d.net), 1)

  return (
    <div className="space-y-2">
      {monthlyData.map((d) => {
        const label = new Date(d.month + '-01').toLocaleDateString('ar', {
          month: 'short',
          year: 'numeric',
        })
        const pct = (d.net / maxNet) * 100
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="w-16 text-sm text-muted-foreground">{label}</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded transition-all"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-24 text-sm font-medium text-right">
              {new Intl.NumberFormat('ar-SA', {
                style: 'currency',
                currency: 'SAR',
                minimumFractionDigits: 0,
              }).format(d.net)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
