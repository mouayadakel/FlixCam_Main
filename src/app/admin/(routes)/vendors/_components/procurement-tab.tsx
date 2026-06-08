/**
 * @file procurement-tab.tsx
 * @description Smart Purchase Order Builder and New Gear Intake Barcode scanner tab.
 * @module app/admin/(routes)/vendors/_components
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FileText, 
  Scan, 
  Sparkles, 
  DollarSign, 
  CheckCircle2, 
  ChevronRight, 
  Building,
  Wrench,
  Check
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PurchaseOrder {
  id: string
  poNumber: string
  supplierName: string
  orderDate: string
  status: 'DRAFT' | 'SENT' | 'RECEIVED'
  totalAmount: number
  itemsCount: number
}

export default function ProcurementTab() {
  const { toast } = useToast()
  
  // Smart Purchase Orders dataset
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-1',
      poNumber: 'PO-2026-004',
      supplierName: 'Sony Middle East FZCO',
      orderDate: '2026-05-18',
      status: 'SENT',
      totalAmount: 18500,
      itemsCount: 3
    },
    {
      id: 'po-2',
      poNumber: 'PO-2026-005',
      supplierName: 'RED Digital Cinema LLC',
      orderDate: '2026-05-19',
      status: 'DRAFT',
      totalAmount: 42000,
      itemsCount: 1
    }
  ])

  // PO builder state
  const [newPo, setNewPo] = useState({
    supplier: 'Sony Middle East FZCO',
    itemModel: 'Sony FX3',
    quantity: 1,
    unitPrice: 14000
  })

  // Intake Scanner input
  const [intakeBarcode, setIntakeBarcode] = useState('')
  const [intakeSerial, setIntakeSerial] = useState('')
  const [intakeModel, setIntakeModel] = useState('Sony A7S III')

  // Show PO builder modal
  const [showPoModal, setShowPoModal] = useState(false)

  // Submit Purchase Order draft
  const draftPurchaseOrder = () => {
    const totalAmount = newPo.quantity * newPo.unitPrice
    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-00${purchaseOrders.length + 4}`,
      supplierName: newPo.supplier,
      orderDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      totalAmount,
      itemsCount: newPo.quantity
    }

    setPurchaseOrders([newOrder, ...purchaseOrders])
    setShowPoModal(false)

    toast({
      title: 'تم إنشاء مسودة طلب الشراء! 📄',
      description: `تم إعداد النموذج رقم ${newOrder.poNumber} بنجاح لحين المزامنة مع دفترة.`,
    })
  }

  // Register New physical Asset intake
  const registerNewAsset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!intakeBarcode.trim() || !intakeSerial.trim()) {
      toast({
        title: 'عقول مفقودة ⚠️',
        description: 'الرجاء إدخال الرمز الشريطي والرقم التسلسلي معاً.',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'تم تسجيل العهدة الجديدة بالمستودع! 📦',
      description: `المعدة "${intakeModel}" برقم تسلسلي ${intakeSerial} مضافة لقاعدة البيانات بنشاط.`,
    })

    setIntakeBarcode('')
    setIntakeSerial('')
  }

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">تم الاستلام (Received)</Badge>
      case 'SENT':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300">مرسل للمورد (Sent)</Badge>
      case 'DRAFT':
      default:
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">مسودة (Draft)</Badge>
    }
  }

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Sourcing Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">طلبات الشراء الجارية</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {purchaseOrders.length} طلبات
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">إجمالي تكلفة المشتريات</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {purchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0).toLocaleString()} ر.س
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">موردين معتمدين بالكتالوج</span>
              <span className="text-2xl font-black text-primary">6 موردين</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center">
              <Building className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Purchase Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-lg">
            <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  بيانات طلبات الشراء وتكاليف الأصول (Purchase Orders)
                </CardTitle>
                <CardDescription>إنشاء طلبات الشراء للقطع الجديدة وربط الفواتير</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowPoModal(true)} className="font-bold gap-1">
                <Plus className="h-4 w-4" />
                طلب جديد (Draft PO)
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="p-4 border rounded-xl bg-white dark:bg-slate-950 flex flex-col sm:flex-row justify-between gap-4 items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{po.poNumber}</span>
                        {getStatusBadge(po.status)}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold space-x-reverse space-x-3 pt-0.5">
                        <span>المورد: {po.supplierName}</span>
                        <span>•</span>
                        <span>التاريخ: {po.orderDate}</span>
                      </div>
                      <span className="text-xs text-slate-400 block font-bold">مجموع القطع المطلوبة: {po.itemsCount} عهدة</span>
                    </div>

                    <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
                      <span className="text-base font-black text-slate-800 dark:text-slate-200">
                        {po.totalAmount.toLocaleString()} ر.س
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toast({ title: 'المزامنة مع دفترة ⚡', description: 'تم إقران فاتورة المورد بدفترة بنجاح.' })}
                        className="font-bold text-[10px]"
                      >
                        مزامنة Daftra PO
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: New Asset Intake Barcode scanner */}
        <div className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary animate-pulse" />
                تسجيل العهد الجديدة (Asset Intake Scanner)
              </CardTitle>
              <CardDescription>مسح وتسجيل الباركود والأرقام التسلسلية للقطع المستوردة</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={registerNewAsset} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">المعدة / الموديل المدخل</label>
                  <select
                    value={intakeModel}
                    onChange={(e) => setIntakeModel(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                  >
                    <option value="Sony A7S III">Sony A7S III (Camera)</option>
                    <option value="Sony FX6">Sony FX6 Cinema</option>
                    <option value="DJI Ronin RS3">DJI Ronin RS3 (Grip)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">الرمز الشريطي المقترح (Barcode)</label>
                  <Input
                    type="text"
                    value={intakeBarcode}
                    onChange={(e) => setIntakeBarcode(e.target.value)}
                    placeholder="امسح باركود الشحنة..."
                    className="h-10 text-center font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">الرقم التسلسلي الفريد (Serial Number)</label>
                  <Input
                    type="text"
                    value={intakeSerial}
                    onChange={(e) => setIntakeSerial(e.target.value)}
                    placeholder="رقم SN الفريد المكتوب..."
                    className="h-10 text-center font-mono font-bold"
                  />
                </div>

                <Button type="submit" className="w-full font-bold gap-1.5 h-11 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  تسجيل العهدة فورياً بالمستودع
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PO Draft Builder Modal */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 border-2 border-primary/20">
            <CardHeader className="bg-slate-50 border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تجهيز مسودة طلب الشراء (PO Builder)
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPoModal(false)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              <CardDescription className="text-xs">إصدار عروض مشتريات رسمية للموردين</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">حدد شركة التوريد</label>
                <select
                  value={newPo.supplier}
                  onChange={(e) => setNewPo({ ...newPo, supplier: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                >
                  <option value="Sony Middle East FZCO">Sony Middle East FZCO</option>
                  <option value="RED Digital Cinema LLC">RED Digital Cinema LLC</option>
                  <option value="ARRI Rental Middle East">ARRI Rental Middle East</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">الكمية</label>
                  <Input
                    type="number"
                    value={newPo.quantity}
                    onChange={(e) => setNewPo({ ...newPo, quantity: Number(e.target.value) })}
                    className="h-10 text-center font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">سعر الوحدة (ر.س)</label>
                  <Input
                    type="number"
                    value={newPo.unitPrice}
                    onChange={(e) => setNewPo({ ...newPo, unitPrice: Number(e.target.value) })}
                    className="h-10 text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  onClick={draftPurchaseOrder}
                >
                  <Check className="h-4 w-4" />
                  حفظ مسودة الطلب
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPoModal(false)}
                  className="font-bold text-xs"
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
