/**
 * @file page.tsx
 * @description Technicians management page (skeleton)
 * @module app/admin/(routes)/technicians
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
import { Eye } from 'lucide-react'
import Link from 'next/link'

const mockTechnicians = [
  {
    id: '1',
    name: 'Omar Khalid',
    phone: '+96650000001',
    specialty: 'Lighting',
    status: 'active',
    jobs: 34,
  },
  {
    id: '2',
    name: 'Maha Ali',
    phone: '+96650000002',
    specialty: 'Camera',
    status: 'on-leave',
    jobs: 18,
  },
]

export default function TechniciansPage() {
  const statuses = ['All', 'active', 'inactive', 'on-leave']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Technicians</h1>
          </div>
        <Button>New Technician</Button>
      </div>

      <TableFilters searchPlaceholder="Search technicians..." statusOptions={statuses} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTechnicians.map((tech) => (
              <TableRow key={tech.id}>
                <TableCell className="font-medium">{tech.name}</TableCell>
                <TableCell>{tech.phone}</TableCell>
                <TableCell>{tech.specialty}</TableCell>
                <TableCell>
                  <Badge>{tech.status}</Badge>
                </TableCell>
                <TableCell>{tech.jobs}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/technicians/${tech.id}`}>
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
