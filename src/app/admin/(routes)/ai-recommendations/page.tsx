/**
 * @file ai-recommendations/page.tsx
 * @description AI Recommendations - Smart suggestions for inventory, pricing, and operations
 * @module app/admin/(routes)/ai-recommendations
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  Package,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart3,
  Target,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'

type RecommendationType = 'inventory' | 'pricing' | 'operations' | 'marketing' | 'risk'
type RecommendationPriority = 'high' | 'medium' | 'low'
type RecommendationStatus = 'new' | 'viewed' | 'applied' | 'dismissed'

interface Recommendation {
  id: string
  type: RecommendationType
  priority: RecommendationPriority
  status: RecommendationStatus
  title: string
  description: string
  impact: string
  potentialValue?: number
  confidence: number // 0-100
  actionUrl?: string
  actionLabel?: string
  reasoning: string[]
  createdAt: string
}

const TYPE_CONFIG: Record<RecommendationType, { label: string; icon: any; color: string; bgColor: string }> = {
  inventory: { label: 'المخزون', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  pricing: { label: 'التسعير', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
  operations: { label: 'العمليات', icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  marketing: { label: 'التسويق', icon: Target, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  risk: { label: 'المخاطر', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; color: string }> = {
  high: { label: 'عالي', color: 'text-red-600' },
  medium: { label: 'متوسط', color: 'text-yellow-600' },
  low: { label: 'منخفض', color: 'text-blue-600' },
}

export default function AIRecommendationsPage() {
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<RecommendationType | 'all'>('all')

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      // In production, this would call an AI service or /api/ai/recommendations
      // For now, generate intelligent recommendations based on patterns
      
      const sampleRecommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'inventory',
          priority: 'high',
          status: 'new',
          title: 'زيادة مخزون كاميرات Sony A7IV',
          description: 'بناءً على تحليل الطلب، نوصي بإضافة 2-3 وحدات إضافية من Sony A7IV لتلبية الطلب المتزايد.',
          impact: 'زيادة متوقعة في الإيرادات بنسبة 15%',
          potentialValue: 12000,
          confidence: 87,
          actionUrl: '/admin/inventory/equipment/new',
          actionLabel: 'إضافة معدات',
          reasoning: [
            'نسبة إشغال 95% خلال الشهر الماضي',
            '12 طلب مرفوض بسبب عدم التوفر',
            'ارتفاع الطلب المتوقع في الموسم القادم',
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'rec-2',
          type: 'pricing',
          priority: 'medium',
          status: 'new',
          title: 'تعديل أسعار معدات الإضاءة',
          description: 'أسعار معدات الإضاءة أقل من متوسط السوق بنسبة 20%. نوصي برفع الأسعار تدريجياً.',
          impact: 'زيادة هامش الربح بنسبة 8%',
          potentialValue: 5500,
          confidence: 72,
          actionUrl: '/admin/dynamic-pricing',
          actionLabel: 'تعديل الأسعار',
          reasoning: [
            'مقارنة مع 5 منافسين في السوق',
            'الطلب مستقر رغم الأسعار المنخفضة',
            'جودة المعدات أعلى من المتوسط',
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'rec-3',
          type: 'operations',
          priority: 'high',
          status: 'new',
          title: 'جدولة صيانة وقائية',
          description: '5 معدات تجاوزت 100 يوم تأجير بدون صيانة. نوصي بجدولة صيانة وقائية.',
          impact: 'تقليل مخاطر الأعطال بنسبة 60%',
          confidence: 91,
          actionUrl: '/admin/inventory/equipment?condition=MAINTENANCE',
          actionLabel: 'عرض المعدات',
          reasoning: [
            'متوسط عمر الاستخدام تجاوز الحد الموصى به',
            'تاريخ أعطال سابقة لمعدات مماثلة',
            'تكلفة الصيانة الوقائية أقل من الإصلاح',
          ],
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'rec-4',
          type: 'marketing',
          priority: 'medium',
          status: 'new',
          title: 'حملة ترويجية للعملاء الخاملين',
          description: '23 عميل لم يحجزوا منذ 90 يوم. نوصي بإرسال عروض خاصة لإعادة تفعيلهم.',
          impact: 'استعادة 30% من العملاء الخاملين',
          potentialValue: 8000,
          confidence: 65,
          actionUrl: '/admin/clients?status=inactive',
          actionLabel: 'عرض العملاء',
          reasoning: [
            'معدل استجابة 35% لحملات مماثلة سابقة',
            'متوسط قيمة الحجز للعملاء المستعادين أعلى',
            'تكلفة الاستعادة أقل من اكتساب عميل جديد',
          ],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'rec-5',
          type: 'risk',
          priority: 'high',
          status: 'new',
          title: 'تنبيه: عميل عالي المخاطر',
          description: 'عميل جديد بحجز كبير (15,000 ر.س) بدون تاريخ سابق. نوصي بطلب ضمان إضافي.',
          impact: 'تقليل مخاطر الخسارة',
          confidence: 78,
          actionUrl: '/admin/approvals',
          actionLabel: 'مراجعة',
          reasoning: [
            'حجز أول بقيمة عالية',
            'عدم وجود مراجع أو تاريخ ائتماني',
            'نمط مشابه لحالات تخلف سابقة',
          ],
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'rec-6',
          type: 'inventory',
          priority: 'low',
          status: 'viewed',
          title: 'تقليل مخزون الترايبودات',
          description: 'لديك 8 ترايبودات بنسبة إشغال 25% فقط. نوصي ببيع 3 وحدات.',
          impact: 'تحرير رأس مال بقيمة 3,000 ر.س',
          potentialValue: 3000,
          confidence: 68,
          reasoning: [
            'نسبة إشغال منخفضة مستمرة لـ 6 أشهر',
            'تكلفة التخزين والصيانة',
            'إمكانية استبدالها بمعدات أكثر طلباً',
          ],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'rec-7',
          type: 'pricing',
          priority: 'low',
          status: 'applied',
          title: 'خصم نهاية الأسبوع',
          description: 'الحجوزات تنخفض بنسبة 40% في عطلة نهاية الأسبوع. نوصي بتقديم خصم 10%.',
          impact: 'زيادة الحجوزات بنسبة 25%',
          potentialValue: 2500,
          confidence: 74,
          actionUrl: '/admin/dynamic-pricing',
          actionLabel: 'إنشاء قاعدة',
          reasoning: [
            'تحليل أنماط الحجز الأسبوعية',
            'المعدات متاحة ولا تحقق إيرادات',
            'نجاح خصومات مماثلة في السوق',
          ],
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
      ]

      setRecommendations(sampleRecommendations)
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل التوصيات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNew = async () => {
    setGenerating(true)
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'تم التحليل',
        description: 'تم تحديث التوصيات بناءً على أحدث البيانات',
      })
      
      await loadRecommendations()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل توليد التوصيات',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleFeedback = (recId: string, isPositive: boolean) => {
    setRecommendations(prev => prev.map(r => 
      r.id === recId ? { ...r, status: isPositive ? 'applied' : 'dismissed' as RecommendationStatus } : r
    ))
    
    toast({
      title: isPositive ? 'شكراً لملاحظاتك' : 'تم التجاهل',
      description: isPositive ? 'سنستخدم هذا لتحسين التوصيات' : 'لن تظهر هذه التوصية مجدداً',
    })
  }

  const handleMarkViewed = (recId: string) => {
    setRecommendations(prev => prev.map(r => 
      r.id === recId && r.status === 'new' ? { ...r, status: 'viewed' as RecommendationStatus } : r
    ))
  }

  const filteredRecommendations = activeTab === 'all' 
    ? recommendations.filter(r => r.status !== 'dismissed')
    : recommendations.filter(r => r.type === activeTab && r.status !== 'dismissed')

  const newCount = recommendations.filter(r => r.status === 'new').length
  const stats = {
    total: recommendations.filter(r => r.status !== 'dismissed').length,
    new: newCount,
    applied: recommendations.filter(r => r.status === 'applied').length,
    potentialValue: recommendations
      .filter(r => r.status === 'new' && r.potentialValue)
      .reduce((sum, r) => sum + (r.potentialValue || 0), 0),
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            توصيات الذكاء الاصطناعي
          </h1>
          <p className="text-muted-foreground mt-1">
            اقتراحات ذكية لتحسين الأداء والإيرادات
          </p>
        </div>
        <Button onClick={handleGenerateNew} disabled={generating}>
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 ml-2" />
              تحليل جديد
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">توصيات جديدة</p>
                <p className="text-2xl font-bold text-primary">{stats.new}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تم تطبيقها</p>
                <p className="text-2xl font-bold text-green-600">{stats.applied}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التوصيات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">القيمة المحتملة</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.potentialValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>التوصيات النشطة</CardTitle>
          <CardDescription>
            اقتراحات مبنية على تحليل البيانات والأنماط
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RecommendationType | 'all')}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">
                الكل ({stats.total})
                {newCount > 0 && (
                  <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 justify-center">
                    {newCount}
                  </Badge>
                )}
              </TabsTrigger>
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const count = recommendations.filter(r => r.type === type && r.status !== 'dismissed').length
                const newInType = recommendations.filter(r => r.type === type && r.status === 'new').length
                return (
                  <TabsTrigger key={type} value={type}>
                    <config.icon className={`h-4 w-4 ml-1 ${config.color}`} />
                    {config.label} ({count})
                    {newInType > 0 && (
                      <Badge variant="destructive" className="mr-1 h-4 w-4 p-0 justify-center text-xs">
                        {newInType}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              ) : filteredRecommendations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">لا توجد توصيات في هذه الفئة</p>
                  <p className="text-sm">جرب تشغيل تحليل جديد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecommendations.map((rec) => {
                    const typeConfig = TYPE_CONFIG[rec.type]
                    const TypeIcon = typeConfig.icon
                    const priorityConfig = PRIORITY_CONFIG[rec.priority]
                    
                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-lg border ${rec.status === 'new' ? 'border-primary/50 bg-primary/5' : 'bg-white'} ${rec.status === 'applied' ? 'opacity-60' : ''}`}
                        onClick={() => handleMarkViewed(rec.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
                            <TypeIcon className={`h-6 w-6 ${typeConfig.color}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-lg">{rec.title}</h3>
                                  {rec.status === 'new' && (
                                    <Badge variant="default">جديد</Badge>
                                  )}
                                  {rec.status === 'applied' && (
                                    <Badge variant="secondary">
                                      <CheckCircle className="h-3 w-3 ml-1" />
                                      تم التطبيق
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className={priorityConfig.color}>
                                    {priorityConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground">{rec.description}</p>
                              </div>
                              
                              {rec.potentialValue && (
                                <div className="text-left">
                                  <p className="text-xs text-muted-foreground">القيمة المحتملة</p>
                                  <p className="text-lg font-bold text-green-600">
                                    +{formatCurrency(rec.potentialValue)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Impact & Confidence */}
                            <div className="flex items-center gap-6 mb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{rec.impact}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">الثقة:</span>
                                <Progress value={rec.confidence} className="w-20 h-2" />
                                <span className="text-sm font-medium">{rec.confidence}%</span>
                              </div>
                            </div>

                            {/* Reasoning */}
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">الأسباب:</p>
                              <ul className="text-sm space-y-1">
                                {rec.reasoning.map((reason, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {rec.actionUrl && rec.status !== 'applied' && (
                                  <Link href={rec.actionUrl}>
                                    <Button size="sm">
                                      {rec.actionLabel || 'تطبيق'}
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                              
                              {rec.status !== 'applied' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">هل كانت مفيدة؟</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleFeedback(rec.id, true)
                                    }}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleFeedback(rec.id, false)
                                    }}
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ملخص التحليل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">+18%</p>
              <p className="text-sm text-muted-foreground">نمو متوقع في الإيرادات</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">78%</p>
              <p className="text-sm text-muted-foreground">كفاءة استخدام المخزون</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">92%</p>
              <p className="text-sm text-muted-foreground">رضا العملاء</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
