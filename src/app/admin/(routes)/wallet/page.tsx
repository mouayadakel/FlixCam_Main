/**
 * @file page.tsx
 * @description Wallet/Credits page (skeleton)
 * @module app/admin/(routes)/wallet
 */

import { TableFilters } from '@/components/tables/table-filters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { Eye } from 'lucide-react'
import Link from 'next/link'

const mockWalletTx = [
  {
    id: '1',
    user: 'John Doe',
    type: 'credit',
    amount: 500,
    balance: 1200,
    note: 'Top-up',
    createdAt: '2026-01-25',
  },
  {
    id: '2',
    user: 'Jane Smith',
    type: 'debit',
    amount: 250,
    balance: 450,
    note: 'Order payment',
    createdAt: '2026-01-24',
  },
]

export default function WalletPage() {
  const types = ['All', 'credit', 'debit']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          </div>
        <Button>Add Credit</Button>
      </div>

      <TableFilters searchPlaceholder="Search transactions..." statusOptions={types} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance After</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockWalletTx.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">{tx.user}</TableCell>
                <TableCell>
                  <Badge className={tx.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(tx.amount)}</TableCell>
                <TableCell>{formatCurrency(tx.balance)}</TableCell>
                <TableCell>{tx.note}</TableCell>
                <TableCell>{formatDate(tx.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/wallet/${tx.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
