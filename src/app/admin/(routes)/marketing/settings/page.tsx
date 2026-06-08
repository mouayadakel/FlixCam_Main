'use client'

import { useState, useEffect } from 'react'
import { 
  Save, 
  Loader2, 
  Globe, 
  Search, 
  Share2, 
  ShieldCheck,
  Smartphone,
  Building2,
} from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/forms/image-upload'

export default function MarketingSettingsPage() {
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/settings')
      const data = await res.json()
      setSettings(data.settings || [])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  const handleSaveCategory = async (category: string) => {
    try {
      setSaving(true)
      const categorySettings = settings.filter(s => s.category === category)
      
      await fetch('/api/admin/marketing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: categorySettings.map(s => ({ key: s.key, value: s.value })) })
      })

      toast({ title: 'تم الحفظ', description: `تم تحديث إعدادات ${category} بنجاح` })
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل حفظ الإعدادات', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const renderSettingRow = (s: any) => {
    if (s.key === 'business_logo') {
      return (
        <div key={s.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={s.key} className="text-sm font-medium">{s.label}</Label>
            <span className="text-[10px] text-muted-foreground font-mono">{s.key}</span>
          </div>
          <ImageUpload
            value={s.value ? [s.value] : []}
            onChange={(url) => handleUpdateValue(s.key, Array.isArray(url) ? url[0] || '' : url)}
            onDelete={(url) => handleUpdateValue(s.key, '')}
            multiple={false}
            cmsFolder="settings"
          />
        </div>
      )
    }

    return (
      <div key={s.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={s.key} className="text-sm font-medium">{s.label}</Label>
          <span className="text-[10px] text-muted-foreground font-mono">{s.key}</span>
        </div>
        <Input 
          id={s.key}
          value={s.masked ? '••••••••' : s.value} 
          onChange={(e) => handleUpdateValue(s.key, e.target.value)}
          className="bg-white/50 focus:bg-white transition-colors"
          dir="ltr"
          placeholder={s.masked ? '••••••••' : `Enter ${s.label}`}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/40" />
      </div>
    )
  }

  const categories = [
    { id: 'google', label: 'إعدادات جوجل', icon: Search, desc: 'GTM, GA4, Ads, GSC' },
    { id: 'meta', label: 'إعدادات ميتا', icon: Share2, desc: 'Pixel, CAPI, Test Code' },
    { id: 'social', label: 'التواصل الاجتماعي', icon: Smartphone, desc: 'TikTok, Snapchat, X, WhatsApp' },
    { id: 'business', label: 'هوية العمل', icon: Building2, desc: 'Logo, Phone, Email, Address' },
    { id: 'seo', label: 'إعدادات SEO', icon: Globe, desc: 'OG Images, Business Names' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">إعدادات التسويق العالمية</h1>
        <p className="text-sm text-muted-foreground">إدارة جميع بكسلات التتبع وهُوية المتجر الرقمية</p>
      </div>

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50 border">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <cat.icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6 space-y-4">
            <Card className="border-brand-primary/10 shadow-sm overflow-hidden border-t-4 border-t-brand-primary">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                       <cat.icon className="h-5 w-5 text-brand-primary" />
                       {cat.label}
                    </CardTitle>
                    <CardDescription>{cat.desc}</CardDescription>
                  </div>
                  <Button 
                    onClick={() => handleSaveCategory(cat.id)} 
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ الكل
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {settings
                    .filter(s => s.category === cat.id)
                    .map(s => renderSettingRow(s))
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      <Card className="bg-brand-primary/[0.02] border-dashed border-brand-primary/20">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 rounded-full bg-brand-primary/10 text-brand-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-brand-primary">حماية البيانات والخصوصية</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              يتم تشفير الرموز الحساسة (مثل CAPI Token و Mailchimp API Key) وإخفاؤها تلقائياً عند العرض. في حال تركت الحقل "••••••••"، فلن يتم تحديث القيمة في قاعدة البيانات.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
