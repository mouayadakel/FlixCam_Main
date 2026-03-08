/**
 * Seed only policy items (6 defaults + full Terms). Run: npx tsx scripts/seed-policies.ts
 * Use when the admin policies page shows empty and full seed already ran.
 */

import { PrismaClient } from '@prisma/client'
import {
  TERMS_TITLE_AR,
  TERMS_TITLE_EN,
  TERMS_BODY_AR,
  TERMS_BODY_EN,
} from './data/terms-policy-body'

const prisma = new PrismaClient()

const DEFAULT_POLICIES = [
  {
    titleAr: 'التأمين',
    titleEn: 'Insurance',
    titleZh: null as string | null,
    bodyAr:
      'المعدات مغطاة بتأمين التأجير القياسي خلال فترة التأجير. قد يتوفر تنازل عن الأضرار أو تغطية أعلى عند الدفع. تنطبق استثناءات؛ راجع الشروط للتفاصيل.',
    bodyEn:
      'Equipment is covered by our standard rental insurance during the rental period. Optional damage waiver or higher coverage may be available at checkout. Exclusions apply; see terms for details.',
    bodyZh: null as string | null,
    order: 0,
    isActive: true,
  },
  {
    titleAr: 'الوديعة',
    titleEn: 'Deposit',
    titleZh: null as string | null,
    bodyAr:
      'وديعة قابلة للاسترداد (عادة 30٪ من قيمة المعدات، حد أدنى 1000 ريال، حد أقصى 50000 ريال) مطلوبة. تُطلق بعد إرجاع المعدات وفحصها. قد تُخصم مبالغ عن الأضرار أو التأخير.',
    bodyEn:
      'A refundable deposit (typically 30% of equipment value, min 1,000 SAR, max 50,000 SAR) is required. It is released after equipment is returned and inspected. Deductions may apply for damage or late return.',
    bodyZh: null as string | null,
    order: 1,
    isActive: true,
  },
  {
    titleAr: 'متطلبات الهوية',
    titleEn: 'ID Requirements',
    titleZh: null as string | null,
    bodyAr:
      'قد يُطلب بطاقة هوية حكومية سارية (الهوية الوطنية أو جواز السفر)، وللشركات السجل التجاري. قد نتحقق من الهوية قبل تسليم المعدات.',
    bodyEn:
      'Valid government-issued ID (national ID or passport) and, for companies, commercial registration may be required. We may verify identity before releasing equipment.',
    bodyZh: null as string | null,
    order: 2,
    isActive: true,
  },
  {
    titleAr: 'رسوم التأخير',
    titleEn: 'Late Fees',
    titleZh: null as string | null,
    bodyAr:
      'الإرجاع المتأخر يُحتسب بمقدار 1.5× معدل اليوم عن كل يوم أو جزء من يوم بعد تاريخ الإرجاع المتفق عليه، ما لم يتم الموافقة على تمديد مسبقاً.',
    bodyEn:
      'Late returns are charged at 1.5× the daily rate for each day or part day after the agreed return date, unless an extension was approved in advance.',
    bodyZh: null as string | null,
    order: 3,
    isActive: true,
  },
  {
    titleAr: 'الأضرار والضياع',
    titleEn: 'Damage & Loss',
    titleZh: null as string | null,
    bodyAr:
      'أنت مسؤول عن المعدات من الاستلام حتى الإرجاع. يجب الإبلاغ عن أي ضرر أو ضياع فوراً. قد تُخصم تكاليف الإصلاح أو الاستبدال من الوديعة أو تُفوتر.',
    bodyEn:
      'You are responsible for equipment from pickup until return. Damage or loss must be reported immediately. Repair or replacement costs may be deducted from the deposit or invoiced.',
    bodyZh: null as string | null,
    order: 4,
    isActive: true,
  },
  {
    titleAr: 'الإلغاء',
    titleEn: 'Cancellation',
    titleZh: null as string | null,
    bodyAr:
      'الإلغاء قبل أكثر من 48 ساعة من الاستلام: استرداد كامل مخصوماً رسوم المعالجة. خلال 48 ساعة: قد تُحجز الوديعة. الغياب يفقد الوديعة. راجع الشروط لسياسة الإلغاء الكاملة.',
    bodyEn:
      'Cancellations more than 48 hours before pickup: full refund minus a processing fee. Within 48 hours: deposit may be retained. No-shows forfeit the deposit. See terms for full cancellation policy.',
    bodyZh: null as string | null,
    order: 5,
    isActive: true,
  },
  {
    titleAr: TERMS_TITLE_AR,
    titleEn: TERMS_TITLE_EN,
    titleZh: null,
    bodyAr: TERMS_BODY_AR,
    bodyEn: TERMS_BODY_EN,
    bodyZh: null,
    order: 6,
    isActive: true,
  },
]

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'active' },
  })
  if (!admin) {
    console.error('❌ No ADMIN user found. Run full seed first: npx prisma db seed')
    process.exit(1)
  }

  // Ensure settings.read and settings.update exist and are assigned to all ADMIN users
  for (const name of ['settings.read', 'settings.update']) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: name, createdBy: admin.id },
    })
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'active' },
    })
    for (const u of admins) {
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: { userId: u.id, permissionId: perm.id },
        },
        update: {},
        create: { userId: u.id, permissionId: perm.id, createdBy: admin.id },
      })
    }
  }
  console.log('✅ Permissions settings.read & settings.update ensured for ADMIN users')

  let added = 0
  for (const item of DEFAULT_POLICIES) {
    const existing = await prisma.policyItem.findFirst({
      where: { titleEn: item.titleEn, deletedAt: null },
    })
    if (!existing) {
      await prisma.policyItem.create({
        data: {
          ...item,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      })
      added++
      console.log('  +', item.titleEn)
    } else if (item.titleEn === TERMS_TITLE_EN) {
      await prisma.policyItem.update({
        where: { id: existing.id },
        data: {
          titleAr: item.titleAr,
          titleEn: item.titleEn,
          bodyAr: item.bodyAr,
          bodyEn: item.bodyEn,
          updatedBy: admin.id,
          updatedAt: new Date(),
        },
      })
      console.log('  ~', item.titleEn, '(updated)')
    }
  }

  const total = await prisma.policyItem.count({ where: { deletedAt: null } })
  if (added > 0) {
    console.log(`✅ Policy items added: ${added}. Total in DB: ${total}`)
  } else {
    console.log(`✅ Policies in DB: ${total}`)
  }
  console.log(
    '→ If the policies page is still empty, log out and log in again to refresh your session permissions.'
  )
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
