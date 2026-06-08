import { prisma } from '@/lib/db/prisma'

export type TriggerType = 
  | 'abandoned_cart'
  | 'post_booking_thanks'
  | 'review_followup'
  | 'win_back'
  | 'birthday_offer'
  | 'low_stock_alert'
  | 'deposit_reminder'
  | 'loyalty_reward'
  | 'vip_welcome'
  | 'maintenance_alert'
  | 'referral_earned'
  | 'inactive_30d'
  | 'inactive_90d'
  | 'high_value_lead'
  | 'late_return_warning'
  | 'upsell_suggestion'
  | 'payment_failed'
  | 'new_equipment_launch'
  | 'seasonal_offer'
  | 'insurance_reminder'

export interface AutomationRule {
  id: string
  name: string
  triggerType: TriggerType
  isActive: boolean
  template: string
  channel: 'whatsapp' | 'email' | 'internal'
  delayMinutes: number
  executionCount: number
  lastRunAt: string | null
  createdAt: string
  conditions?: any // Added for ANTIGRAVITY standard
}

const TRIGGER_DEFAULTS: Record<TriggerType, { name: string; template: string; channel: AutomationRule['channel']; delayMinutes: number }> = {
  abandoned_cart: {
    name: 'تذكير السلة المهجورة',
    template: 'مرحباً {name}! لاحظنا أنك تركت بعض المعدات في سلتك 🛒\nلا تفوّت الفرصة — أكمل حجزك الآن واستمتع بأفضل الأسعار!\n{cartLink}',
    channel: 'whatsapp',
    delayMinutes: 120
  },
  post_booking_thanks: {
    name: 'شكر بعد الحجز',
    template: 'شكراً لحجزك معنا يا {name}! 🎬\nنتمنى لك تجربة رائعة مع معدات FlixCam.\nرقم الحجز: {bookingNumber}',
    channel: 'whatsapp',
    delayMinutes: 5
  },
  review_followup: {
    name: 'متابعة التقييم',
    template: 'مرحباً {name}!\nكيف كانت تجربتك مع معدات FlixCam؟ ⭐\nرأيك يهمنا جداً — شاركنا تقييمك:\n{reviewLink}',
    channel: 'whatsapp',
    delayMinutes: 4320
  },
  win_back: {
    name: 'استعادة العميل',
    template: 'اشتقنا لك يا {name}! 💫\nمر وقت طويل على آخر حجز لك.\nجهّزنا لك عرض حصري — خصم {discount}% على حجزك القادم!\nالكود: {discountCode}',
    channel: 'whatsapp',
    delayMinutes: 0
  },
  birthday_offer: {
    name: 'عرض عيد الميلاد',
    template: 'كل عام وأنت بخير يا {name}! 🎂🎉\nبمناسبة عيد ميلادك، نقدم لك خصم 20% على أي حجز خلال هذا الأسبوع.\nالكود: BDAY{year}',
    channel: 'whatsapp',
    delayMinutes: 0
  },
  low_stock_alert: {
    name: 'تنبيه نفاد المخزون',
    template: '⚠️ تنبيه مخزون: المعدة "{equipmentName}" أصبح توفرها أقل من 20%.\nالكمية المتبقية: {available}/{total}\nيرجى مراجعة الحجوزات القادمة.',
    channel: 'internal',
    delayMinutes: 0
  },
  deposit_reminder: {
    name: 'تذكير بمبلغ التأمين',
    template: 'مرحباً {name}، نذكرك بضرورة دفع مبلغ التأمين {amount} ر.س لتأكيد حجزك رقم {bookingNumber}.',
    channel: 'whatsapp',
    delayMinutes: 1440
  },
  loyalty_reward: {
    name: 'مكافأة العملاء الأوفياء',
    template: 'أنت من نخبة عملائنا يا {name}! 🏆 تقديراً لولائك، أضفنا رصيد {points} نقطة إلى محفظتك.',
    channel: 'email',
    delayMinutes: 0
  },
  vip_welcome: {
    name: 'ترحيب VIP',
    template: 'أهلاً بك في نادي النخبة (VIP Shield). استمتع بخصومات حصرية وتوصيل سريع مجاني بدءاً من اليوم!',
    channel: 'whatsapp',
    delayMinutes: 5
  },
  maintenance_alert: {
    name: 'تنبيه صيانة دورية',
    template: '⚠️ إشعار صيانة: المعدة {equipmentName} تجاوزت عدد ساعات التشغيل المسموح بها وتطلب فحصاً حالياً.',
    channel: 'internal',
    delayMinutes: 0
  },
  referral_earned: {
    name: 'مكافأة إحالة مكتسبة',
    template: 'خبر رائع يا {name}! صديقك أكمل حجزه الأول باستخدام كودك. تم إضافة خصم 15% لحسابك!',
    channel: 'whatsapp',
    delayMinutes: 0
  },
  inactive_30d: {
    name: 'متابعة بعد 30 يوم',
    template: 'مرحباً {name}، لقد مر شهر على آخر حجز لك. هل تخطط لعملك القادم؟ تفقّد أحدث المعدات المضافة لدينا.',
    channel: 'email',
    delayMinutes: 43200
  },
  inactive_90d: {
    name: 'عرض استعادة (90 يوم)',
    template: 'افتقدناك يا {name}! نود رؤيتك مجدداً. استخدم هذا العرض الخاص (خصم 25%) صالح لمدة 48 ساعة فقط.',
    channel: 'whatsapp',
    delayMinutes: 129600
  },
  high_value_lead: {
    name: 'تنبيه عميل عالي الأهمية',
    template: '🚀 عميل جديد عالي الأهمية (LTV > 5000) سجل اهتماماً بـ {categoryName}. تواصل معه فوراً!',
    channel: 'internal',
    delayMinutes: 0
  },
  late_return_warning: {
    name: 'تنبيه تأخير الإرجاع',
    template: 'عزيزي {name}، معدلات FlixCam تنتظر عودتها! نذكرك بأن موعد الإرجاع كان قبل {hours} ساعة. لتجنب الرسوم الإضافية يرجى التواصل معنا.',
    channel: 'whatsapp',
    delayMinutes: 60
  },
  upsell_suggestion: {
    name: 'توصية معدات مكملة',
    template: 'رحلة تصوير ممتعة! بما أنك حجزت {camera}، فقد تحتاج إلى {lens} أو فلاتر ND لتحسين النتائج. أضفها الآن بخصم 10%!',
    channel: 'whatsapp',
    delayMinutes: 10
  },
  payment_failed: {
    name: 'فشل عملية الدفع',
    template: 'مرحباً {name}، يبدو أن هناك مشكلة في عملية الدفع الأخيرة. لا تقلق، حجزك محمي لمدة ساعة واحدة. حاول مجدداً هنا: {link}',
    channel: 'whatsapp',
    delayMinutes: 0
  },
  new_equipment_launch: {
    name: 'إطلاق معدات جديدة',
    template: 'وصل حديثاً! 🎥 المعدة {equipmentName} أصبحت متاحة الآن للإيجار. كن أول من يجربها في مشروعك القادم.',
    channel: 'email',
    delayMinutes: 0
  },
  seasonal_offer: {
    name: 'عرض موسمي للسينمائيين',
    template: 'موسم الرياض بدأ! 🎬 استعد بأفضل المعدات بأسعار خاصة للمشاريع الموسمية.',
    channel: 'whatsapp',
    delayMinutes: 0
  },
  insurance_reminder: {
    name: 'تذكير بتجديد التأمين',
    template: '⚠️ تذكير: ملفك الشخصي يتطلب تحديث وثيقة التأمين لمتابعة الحجوزات القادمة.',
    channel: 'internal',
    delayMinutes: 0
  }
}

export class AutomationService {
  /**
   * Get all automation rules, seeding defaults if none exist.
   */
  static async getRules(): Promise<AutomationRule[]> {
    const existing = await prisma.marketingEvent.findMany({
      where: { eventType: 'AutomationRule' },
      orderBy: { createdAt: 'asc' }
    })

    if (existing.length === 0) {
      // Seed default rules
      const seeded: AutomationRule[] = []
      for (const [triggerType, defaults] of Object.entries(TRIGGER_DEFAULTS)) {
        const event = await prisma.marketingEvent.create({
          data: {
            sessionId: `automation_${triggerType}`,
            eventType: 'AutomationRule',
            source: 'system',
            metadata: {
              name: defaults.name,
              triggerType,
              isActive: false,
              template: defaults.template,
              channel: defaults.channel,
              delayMinutes: defaults.delayMinutes,
              executionCount: 0,
              lastRunAt: null
            }
          }
        })
        seeded.push(this.eventToRule(event))
      }
      return seeded
    }

    return existing.map(e => this.eventToRule(e))
  }

  /**
   * Create a new automation rule.
   */
  static async createRule(data: {
    name: string
    triggerType: TriggerType
    template: string
    channel: AutomationRule['channel']
    delayMinutes: number
    conditions?: any
  }): Promise<AutomationRule> {
    const event = await prisma.marketingEvent.create({
      data: {
        sessionId: `automation_${data.triggerType}_${Date.now()}`,
        eventType: 'AutomationRule',
        source: 'admin',
        metadata: {
          name: data.name,
          triggerType: data.triggerType,
          isActive: false,
          template: data.template,
          channel: data.channel,
          delayMinutes: data.delayMinutes,
          conditions: data.conditions || [],
          executionCount: 0,
          lastRunAt: null
        }
      }
    })
    return this.eventToRule(event)
  }

  /**
   * Toggle a rule on/off or update its template.
   */
  static async updateRule(id: string, updates: Partial<{ isActive: boolean; template: string; name: string }>) {
    const event = await prisma.marketingEvent.findUnique({ where: { id } })
    if (!event || event.eventType !== 'AutomationRule') throw new Error('Rule not found')

    const meta = event.metadata as any
    const merged = { ...meta, ...updates }

    await prisma.marketingEvent.update({
      where: { id },
      data: { metadata: merged }
    })

    return { success: true }
  }

  /**
   * Manually trigger a test execution of a rule.
   */
  static async testExecution(ruleId: string, testData: any) {
    const rule = await this.getRules().then(rules => rules.find(r => r.id === ruleId))
    if (!rule) throw new Error('Rule not found')

    const logId = `test_${ruleId}_${Date.now()}`
    
    // Log as a test execution
    await prisma.marketingEvent.create({
      data: {
        sessionId: logId,
        eventType: 'AutomationExecution',
        source: 'ADMIN_TEST',
        metadata: {
          ruleId,
          triggerType: rule.triggerType,
          recipientName: testData.recipientName || 'Test User',
          executedAt: new Date().toISOString(),
          status: 'success',
          isTest: true,
          inputData: testData
        }
      }
    })

    return { success: true, logId }
  }

  /**
   * Log an automation execution.
   */
  static async logExecution(ruleId: string, triggerType: string, recipientName: string) {
    // Increment execution count on the rule
    const rule = await prisma.marketingEvent.findUnique({ where: { id: ruleId } })
    if (rule) {
      const meta = rule.metadata as any
      await prisma.marketingEvent.update({
        where: { id: ruleId },
        data: {
          metadata: {
            ...meta,
            executionCount: (meta.executionCount || 0) + 1,
            lastRunAt: new Date().toISOString()
          }
        }
      })
    }

    // Create execution log event
    await prisma.marketingEvent.create({
      data: {
        sessionId: `exec_${ruleId}_${Date.now()}`,
        eventType: 'AutomationExecution',
        source: triggerType,
        metadata: {
          ruleId,
          triggerType,
          recipientName,
          executedAt: new Date().toISOString(),
          status: 'sent'
        }
      }
    })
  }

  /**
   * Get recent execution logs.
   */
  static async getExecutionLog(limit = 20) {
    const logs = await prisma.marketingEvent.findMany({
      where: { eventType: 'AutomationExecution' },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return logs.map(l => {
      const meta = l.metadata as any
      return {
        id: l.id,
        ruleId: meta.ruleId,
        triggerType: meta.triggerType,
        recipientName: meta.recipientName,
        executedAt: meta.executedAt,
        status: meta.status,
        createdAt: l.createdAt
      }
    })
  }

  private static eventToRule(event: any): AutomationRule {
    const meta = event.metadata as any
    return {
      id: event.id,
      name: meta.name || 'Unnamed',
      triggerType: meta.triggerType,
      isActive: meta.isActive ?? false,
      template: meta.template || '',
      channel: meta.channel || 'whatsapp',
      delayMinutes: meta.delayMinutes || 0,
      executionCount: meta.executionCount || 0,
      lastRunAt: meta.lastRunAt || null,
      conditions: meta.conditions || [],
      createdAt: event.createdAt?.toISOString?.() || event.createdAt
    }
  }
}
