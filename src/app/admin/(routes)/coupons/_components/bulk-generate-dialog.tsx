/**
 * @file bulk-generate-dialog.tsx
 * @description Premium, bilingual, responsive modal for bulk generating and exporting promotional codes
 * @module app/admin/coupons/_components/bulk-generate-dialog
 */

'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  ArrowRightLeft, 
  Info,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BulkGenerateDialogProps {
  onSuccess?: () => void
}

export function BulkGenerateDialog({ onSuccess }: BulkGenerateDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Fields state
  const [prefix, setPrefix] = useState('PROMO')
  const [count, setCount] = useState(25)
  const [codeLength, setCodeLength] = useState(6)
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState(15)
  const [usageLimit, setUsageLimit] = useState(1)
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [canCombine, setCanCombine] = useState(true)
  const [description, setDescription] = useState('توليد تلقائي لحملة تسويقية | Auto-bulk generated campaign')
  
  // Generated Results State
  const [generatedCodes, setGeneratedCodes] = useState<{ code: string }[] | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneratedCodes(null)
    
    try {
      const res = await fetch('/api/coupons/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix,
          count: Number(count),
          codeLength: Number(codeLength),
          type,
          value: Number(value),
          usageLimit: Number(usageLimit),
          validFrom: new Date(validFrom).toISOString(),
          validUntil: new Date(validUntil).toISOString(),
          description,
          canCombineWithOtherOffers: canCombine,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to bulk generate')

      setGeneratedCodes(data.data)
      toast({
        title: 'تم التوليد بنجاح ✅',
        description: `تم إنشاء ${data.count} كود خصم فريد وإضافتهم لقاعدة البيانات`,
      })
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: 'خطأ أثناء التوليد',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!generatedCodes) return
    const text = generatedCodes.map((c) => c.code).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: 'تم النسخ ✅', description: 'تم نسخ جميع الأكواد للحافظة بنجاح' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setGeneratedCodes(null); }}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-950/20">
          <Sparkles className="h-4.5 w-4.5 text-emerald-100" />
          <span>توليد كود خصم دفعات | Bulk Generator</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            توليد كود خصم دفعات ذكي
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            توليد مئات الأكواد التسويقية العشوائية والفريدة بضغطة زر واحدة.
          </DialogDescription>
        </DialogHeader>

        {generatedCodes ? (
          /* SUCCESS DISPLAY BOX */
          <div className="space-y-6 py-4">
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4 text-center">
              <p className="text-emerald-400 font-bold text-lg mb-1">🎉 تم توليد {generatedCodes.length} كوبون بنجاح!</p>
              <p className="text-slate-400 text-xs">تم حفظ كافة الأكواد تلقائياً في قاعدة البيانات وهي جاهزة للاستخدام الفوري.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300">أكواد الكوبونات المولّدة:</Label>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs gap-1.5"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>نسخ جميع الأكواد | Copy All</span>
                </Button>
              </div>
              <textarea
                readOnly
                value={generatedCodes.map((c) => c.code).join('\n')}
                className="w-full h-44 rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-emerald-400 select-all focus:outline-none focus:ring-1 focus:ring-slate-700"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => { setOpen(false); setGeneratedCodes(null); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                إغلاق النافذة
              </Button>
            </div>
          </div>
        ) : (
          /* FORM INPUTS */
          <form onSubmit={handleGenerate} className="space-y-5 py-2">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Prefix */}
              <div className="space-y-1.5">
                <Label htmlFor="prefix" className="text-slate-300 font-semibold">بادئة الكود / Prefix</Label>
                <Input 
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="مثال: SUMMER"
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-600"
                  required
                />
              </div>

              {/* Count */}
              <div className="space-y-1.5">
                <Label htmlFor="count" className="text-slate-300 font-semibold">عدد الأكواد المطلوبة / Count</Label>
                <Input 
                  id="count"
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-600"
                  required
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 font-semibold">نوع الخصم / Discount Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={type === 'percent' ? 'default' : 'outline'}
                    className={type === 'percent' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-slate-800 text-slate-300 hover:bg-slate-900'}
                    onClick={() => setType('percent')}
                  >
                    نسبة مئوية (%)
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'fixed' ? 'default' : 'outline'}
                    className={type === 'fixed' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-slate-800 text-slate-300 hover:bg-slate-900'}
                    onClick={() => setType('fixed')}
                  >
                    مبلغ ثابت (ريال)
                  </Button>
                </div>
              </div>

              {/* Discount Value */}
              <div className="space-y-1.5">
                <Label htmlFor="value" className="text-slate-300 font-semibold">قيمة الخصم / Discount Value</Label>
                <Input 
                  id="value"
                  type="number"
                  min={1}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-600"
                  required
                />
              </div>

              {/* Valid From */}
              <div className="space-y-1.5">
                <Label htmlFor="validFrom" className="text-slate-300 font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  صلاحية من / Valid From
                </Label>
                <Input 
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-600"
                  required
                />
              </div>

              {/* Valid Until */}
              <div className="space-y-1.5">
                <Label htmlFor="validUntil" className="text-slate-300 font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  صلاحية إلى / Valid Until
                </Label>
                <Input 
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-600"
                  required
                />
              </div>

            </div>

            <div className="space-y-1.5 border-t border-slate-800/60 pt-4">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition-all cursor-pointer">
                <Checkbox 
                  checked={canCombine} 
                  onCheckedChange={(v) => setCanCombine(!!v)}
                  className="mt-1 border-slate-600 data-[state=checked]:bg-emerald-600"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-white">قابلة للدمج مع العروض الباقات الحالية / Combine with Other Offers</span>
                  <p className="text-xs text-slate-500">في حال إلغاء التفعيل، سيقوم النظام تلقائياً بإلغاء أي خصومات باقة نشطة في السلة بمجرد إدخال هذا الكود.</p>
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300">وصف الحملة / Description</Label>
              <Input 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-850">
              <div className="text-[11px] text-slate-500 flex gap-1 items-center">
                <Info className="h-3.5 w-3.5 text-slate-650" />
                <span>سيتم توليد كود بطول {codeLength} أرقام عشوائية بعد البادئة.</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-slate-400 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري التوليد...
                    </>
                  ) : (
                    'توليد الأكواد وحفظها'
                  )}
                </Button>
              </div>
            </div>

          </form>
        )}

      </DialogContent>
    </Dialog>
  )
}
