/**
 * @file portal/contracts/[id]/sign/page.tsx
 * @description Client portal - Contract e-signature page
 * @module app/portal/contracts
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { use, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from '@/hooks/use-toast'
import { FileText, X, Check } from 'lucide-react'
import Link from 'next/link'
import DOMPurify from 'dompurify'

const ALLOWED_CONTRACT_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'strong', 'em', 'u', 'br', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'span', 'div', 'blockquote',
]

function sanitizeContractHtml(html: string): string {
  if (typeof window === 'undefined') return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_CONTRACT_TAGS,
    ALLOWED_ATTR: ['class', 'style', 'align'],
  })
}

interface ContractSignPageProps {
  params: Promise<{ id: string }>
}

export default function ContractSignPage({ params }: ContractSignPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const signatureRef = useRef<SignatureCanvas>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contractContent, setContractContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${id}`)
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
  }, [id])

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

      const response = await fetch(`/api/contracts/${id}/sign`, {
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

      router.push(`/portal/contracts/${id}`)
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">توقيع العقد</h1>
        <p className="mt-2 text-muted-foreground">يرجى قراءة العقد والتوقيع عليه</p>
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
          <div className="max-h-96 overflow-y-auto rounded-lg border bg-neutral-50 p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">جاري تحميل العقد...</p>
            ) : contractContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeContractHtml(contractContent) }}
                className="prose prose-sm max-w-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground">لا يوجد محتوى للعقد</p>
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
          <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-white">
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
              <X className="ms-2 h-4 w-4" />
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
            <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
              أوافق على جميع الشروط والأحكام المذكورة في هذا العقد. أقر بأنني قرأت وفهمت جميع البنود
              وأوافق على الالتزام بها.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Link href={`/portal/contracts/${id}`}>
          <Button variant="outline">إلغاء</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting || !acceptedTerms}>
          {isSubmitting ? (
            'جاري التوقيع...'
          ) : (
            <>
              <Check className="ms-2 h-4 w-4" />
              تأكيد التوقيع
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
