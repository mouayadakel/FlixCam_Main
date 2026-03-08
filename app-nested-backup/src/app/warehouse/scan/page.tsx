/**
 * Warehouse barcode scanning page.
 * Mobile-first. Supports USB scanner (keyboard input) and camera QR scan.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Camera, Package, ArrowLeftRight, CheckCircle, XCircle, Loader2, ScanLine } from 'lucide-react'

type ScanMode = 'dispatch' | 'return'
type ScanState = 'idle' | 'loading' | 'found' | 'error' | 'success'

interface ScanResult {
  success: boolean
  equipment: {
    id: string
    name: string
    sku: string
    imageUrl: string | null
    condition: string
  }
  booking: {
    id: string
    bookingNumber: string
    customerName: string
    customerPhone: string | null
    startDate: string
    endDate: string
    status: string
    bookingEquipmentId: string
    quantity: number
  } | null
  action: string
  label: string
  warning?: string
}

function useBarcodeScanner(onScan: (value: string) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let buffer = ''
    let lastKeyTime = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastKeyTime > 100) buffer = ''
      lastKeyTime = now

      if (e.key === 'Enter' && buffer.length > 3) {
        onScan(buffer.trim())
        buffer = ''
        e.preventDefault()
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onScan, enabled])
}

export default function WarehouseScanPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ScanMode>('dispatch')
  const [state, setState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [conditionNotes, setConditionNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScan = useCallback(async (barcode: string) => {
    if (state === 'loading') return
    setState('loading')
    setErrorMessage('')
    setScanResult(null)
    setConditionNotes('')

    try {
      const res = await fetch(`/api/warehouse/scan?barcode=${encodeURIComponent(barcode)}&mode=${mode}`)
      const data = await res.json()

      if (!res.ok) {
        setState('error')
        setErrorMessage(data.error || 'Scan failed')
        return
      }

      setScanResult(data)
      setState(data.booking ? 'found' : 'error')
      if (!data.booking && data.warning) {
        setErrorMessage(data.warning)
      }
    } catch {
      setState('error')
      setErrorMessage('Network error. Check connection.')
    }
  }, [mode, state])

  useBarcodeScanner(handleScan, state === 'idle' || state === 'error' || state === 'success')

  const handleConfirm = async () => {
    if (!scanResult?.booking) return
    setIsConfirming(true)

    try {
      const res = await fetch('/api/warehouse/scan/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingEquipmentId: scanResult.booking.bookingEquipmentId,
          bookingId: scanResult.booking.id,
          equipmentId: scanResult.equipment.id,
          action: mode,
          conditionNotes: conditionNotes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || 'Confirm failed')
        setIsConfirming(false)
        return
      }

      setState('success')
    } catch {
      setErrorMessage('Network error during confirmation')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleReset = () => {
    setState('idle')
    setScanResult(null)
    setConditionNotes('')
    setErrorMessage('')
    setManualBarcode('')
    inputRef.current?.focus()
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim())
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-4">
      {/* Mode Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Warehouse Scan</h1>
        <div className="flex rounded-lg border bg-white p-1">
          <button
            onClick={() => { setMode('dispatch'); handleReset() }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'dispatch' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dispatch
          </button>
          <button
            onClick={() => { setMode('return'); handleReset() }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'return' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Return
          </button>
        </div>
      </div>

      {/* Idle State — Waiting for scan */}
      {(state === 'idle' || state === 'loading') && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            {state === 'loading' ? (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                <p className="text-lg font-medium text-gray-600">Looking up...</p>
              </>
            ) : (
              <>
                <ScanLine className="h-16 w-16 text-gray-400" />
                <p className="text-center text-lg font-medium text-gray-600">
                  Scan a barcode or enter it manually
                </p>
                <p className="text-sm text-gray-400">
                  Mode: <Badge variant={mode === 'dispatch' ? 'default' : 'secondary'}>{mode}</Badge>
                </p>
              </>
            )}

            <form onSubmit={handleManualSubmit} className="mt-4 flex w-full gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="CAM-00042-7"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                autoFocus
              />
              <Button type="submit" size="sm" disabled={!manualBarcode.trim() || state === 'loading'}>
                Lookup
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {state === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="text-center text-lg font-medium text-red-700">{errorMessage}</p>
            {scanResult?.equipment && (
              <div className="w-full rounded-lg bg-white p-3 text-sm">
                <p><strong>Equipment:</strong> {scanResult.equipment.name}</p>
                <p><strong>SKU:</strong> {scanResult.equipment.sku}</p>
              </div>
            )}
            <Button onClick={handleReset} variant="outline" className="mt-2">
              Scan Another
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Found State — Show details + confirm */}
      {state === 'found' && scanResult?.booking && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                {scanResult.equipment.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">SKU</span>
                  <p className="font-medium">{scanResult.equipment.sku}</p>
                </div>
                <div>
                  <span className="text-gray-500">Condition</span>
                  <p className="font-medium">{scanResult.equipment.condition}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="h-5 w-5" />
                Booking #{scanResult.booking.bookingNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Customer</span>
                  <p className="font-medium">{scanResult.booking.customerName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium">{scanResult.booking.customerPhone || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Start</span>
                  <p className="font-medium">{new Date(scanResult.booking.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">End</span>
                  <p className="font-medium">{new Date(scanResult.booking.endDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="conditionNotes" className="text-sm">
                  Condition Notes (optional)
                </Label>
                <Textarea
                  id="conditionNotes"
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Note any damage, missing parts, etc."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`flex-1 ${mode === 'dispatch' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isConfirming && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {scanResult.label}
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Cancel
                </Button>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center text-lg font-medium text-green-700">
              {mode === 'dispatch' ? 'Equipment Dispatched!' : 'Equipment Returned!'}
            </p>
            {scanResult?.booking && (
              <p className="text-sm text-green-600">
                Booking #{scanResult.booking.bookingNumber} — {scanResult.equipment.name}
              </p>
            )}
            <Button onClick={handleReset} className="mt-2">
              <Camera className="me-2 h-4 w-4" />
              Scan Another
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Back to dashboard */}
      <div className="mt-6 text-center">
        <Button variant="ghost" onClick={() => router.push('/warehouse')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
