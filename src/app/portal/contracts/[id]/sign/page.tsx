/**
 * @file portal/contracts/[id]/sign/page.tsx
 * @description Client portal - Contract e-signature page
 * @module app/portal/contracts
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from '@/hooks/use-toast'
import { FileText, X, Check } from 'lucide-react'
import Link from 'next/link'

interface ContractSignPageProps {
  params: { id: string }
}

export default function ContractSignPage({ params }: ContractSignPageProps) {
  const router = useRouter()
  const signatureRef = useRef<SignatureCanvas>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contractContent, setContractContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setContractContent(data.content || '')
        }
      } catch (error) {
        console.error('Failed to fetch contract:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContract()
  }, [params.id])

  const handleClear = () => {
    signatureRef.current?.clear()
  }

  const handleSubmit = async () => {
    if (!signatureRef.current) {
      toast({
        title: 'خطأ',
        description: 'يرجى التوقيع على العقد',
        variant: 'destructive',
      })
      return
    }

    if (signatureRef.current.isEmpty()) {
      toast({
        title: 'خطأ',
        description: 'يرجى التوقيع على العقد',
        variant: 'destructive',
      })
      return
    }

    if (!acceptedTerms) {
      toast({
        title: 'خطأ',
        description: 'يرجى الموافقة على الشروط والأحكام',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const signatureData = signatureRef.current.toDataURL()

      const response = await fetch(`/api/contracts/${params.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل في توقيع العقد')
      }

      toast({
        title: 'نجح',
        description: 'تم توقيع العقد بنجاح',
      })

      router.push(`/portal/contracts/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء توقيع العقد',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">توقيع العقد</h1>
        <p className="text-muted-foreground mt-2">
          يرجى قراءة العقد والتوقيع عليه
        </p>
      </div>

      {/* Contract Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            معاينة العقد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-neutral-50 max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">جاري تحميل العقد...</p>
            ) : contractContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: contractContent }}
                className="prose prose-sm max-w-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                لا يوجد محتوى للعقد
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature Canvas */}
      <Card>
        <CardHeader>
          <CardTitle>التوقيع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-neutral-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                width: 600,
                height: 200,
                className: 'w-full h-48 cursor-crosshair',
              }}
              backgroundColor="#ffffff"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClear} size="sm">
              <X className="h-4 w-4 ml-2" />
              مسح التوقيع
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Terms Acceptance */}
      <Card>
        <CardHeader>
          <CardTitle>الموافقة على الشروط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <Label
              htmlFor="terms"
              className="text-sm leading-relaxed cursor-pointer"
            >
              أوافق على جميع الشروط والأحكام المذكورة في هذا العقد. أقر بأنني
              قرأت وفهمت جميع البنود وأوافق على الالتزام بها.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Link href={`/portal/contracts/${params.id}`}>
          <Button variant="outline">إلغاء</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !acceptedTerms}
        >
          {isSubmitting ? (
            'جاري التوقيع...'
          ) : (
            <>
              <Check className="h-4 w-4 ml-2" />
              تأكيد التوقيع
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
