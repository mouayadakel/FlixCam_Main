import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/admin/table-skeleton'

export default function InvoicesLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton
        rowCount={8}
        headers={['رقم الفاتورة', 'العميل', 'المبلغ', 'الحالة', 'تاريخ الاستحقاق', '']}
      />
    </div>
  )
}
