import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/admin/table-skeleton'

export default function EquipmentLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <TableSkeleton rowCount={8} headers={['SKU', 'الموديل', 'الفئة', 'السعر', 'الحالة', '']} />
    </div>
  )
}
