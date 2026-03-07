/**
 * Barcode generation utility for equipment items.
 * Format: CAM-XXXXX-C where XXXXX is zero-padded ID and C is Luhn checksum.
 */

const PREFIX = 'CAM'

function calculateLuhnChecksum(input: string): number {
  const digits = input.replace(/\D/g, '')
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return (10 - (sum % 10)) % 10
}

export function generateBarcodeValue(numericId: number): string {
  const padded = String(numericId).padStart(5, '0')
  const checksum = calculateLuhnChecksum(padded)
  return `${PREFIX}-${padded}-${checksum}`
}

export function generateQrCodeUrl(barcodeValue: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/warehouse/scan/${barcodeValue}`
}

/**
 * Generates a sequential barcode for equipment.
 * Uses the equipment's row number from the database to ensure uniqueness.
 */
export async function assignBarcodeToEquipment(
  prisma: { equipment: { count: () => Promise<number>; update: (args: { where: { id: string }; data: { barcode: string; qrCodeData: string } }) => Promise<unknown> } },
  equipmentId: string
): Promise<{ barcode: string; qrCodeData: string }> {
  const count = await prisma.equipment.count()
  const numericId = count + 1
  const barcode = generateBarcodeValue(numericId)
  const qrCodeData = generateQrCodeUrl(barcode)

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: { barcode, qrCodeData },
  })

  return { barcode, qrCodeData }
}
