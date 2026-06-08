export interface WarehouseBookingLine {
  id: string
  checkedOut: boolean
  checkedIn?: boolean
  equipment: {
    id: string
    sku: string
    serialNumber?: string | null
  }
}

export function matchBookingEquipmentLine(
  lines: WarehouseBookingLine[],
  scan: string,
  mode: 'checkout' | 'checkin',
  equipmentId?: string
): WarehouseBookingLine | undefined {
  const normalized = scan.trim()

  return lines.find((line) => {
    if (mode === 'checkout' && line.checkedOut) return false
    if (mode === 'checkin' && (!line.checkedOut || line.checkedIn)) return false

    if (equipmentId && line.equipment.id === equipmentId) return true
    return (
      line.equipment.sku === normalized ||
      (line.equipment.serialNumber != null && line.equipment.serialNumber === normalized)
    )
  })
}
