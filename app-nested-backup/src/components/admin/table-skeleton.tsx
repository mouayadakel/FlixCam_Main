/**
 * @file table-skeleton.tsx
 * @description Skeleton rows for admin data tables (consistent loading UX)
 * @module components/admin
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  /** Number of skeleton rows */
  rowCount?: number
  /** Number of columns (default 6) */
  colCount?: number
  /** Optional column headers; if provided, colCount is derived and header row is shown */
  headers?: string[]
}

export function TableSkeleton({ rowCount = 5, colCount, headers }: TableSkeletonProps) {
  const cols = headers?.length ?? colCount ?? 6

  return (
    <Table>
      {headers && headers.length > 0 && (
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: cols }).map((_, cellIndex) => (
              <TableCell key={cellIndex}>
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
