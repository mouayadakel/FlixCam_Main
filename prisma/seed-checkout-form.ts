/**
 * Seed default checkout form sections and fields (Step 1: Receiver & Fulfillment, etc.).
 * Idempotent: skips if sections already exist.
 * Run: npx tsx prisma/seed-checkout-form.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.checkoutFormSection.count()
  if (existing > 0) {
    console.log('Checkout form sections already exist. Skip seed.')
    return
  }

  const step1Who = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Who will receive?',
      nameAr: 'من سيستلم؟',
      step: 1,
      sortOrder: 0,
      isSystem: true,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
    data: [
      {
        sectionId: step1Who.id,
        fieldKey: 'receiver_type',
        labelEn: 'I will receive myself / Someone else will receive',
        labelAr: 'أنا سأستلم / شخص آخر سيستلم',
        fieldType: 'radio',
        isRequired: true,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        options: [
          { valueEn: 'myself', valueAr: 'أنا' },
          { valueEn: 'someone_else', valueAr: 'شخص آخر' },
        ],
      },
    ],
  })

  const step1Receiver = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Receiver info',
      nameAr: 'معلومات المستلم',
      step: 1,
      sortOrder: 1,
      isSystem: true,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
      data: [
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_saved_select',
          labelEn: 'Saved receivers',
          labelAr: 'المستلمين المحفوظين',
          fieldType: 'dropdown',
          isRequired: false,
          isSystem: true,
          isActive: true,
          sortOrder: 0,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_name',
          labelEn: 'Full name',
          labelAr: 'الاسم الكامل',
          fieldType: 'text',
          isRequired: true,
          isSystem: true,
          isActive: true,
          sortOrder: 1,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_id_number',
          labelEn: 'ID number',
          labelAr: 'رقم الهوية',
          fieldType: 'text',
          isRequired: true,
          isSystem: true,
          isActive: true,
          sortOrder: 2,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_phone',
          labelEn: 'Phone number',
          labelAr: 'رقم الجوال',
          fieldType: 'phone',
          isRequired: true,
          isSystem: true,
          isActive: true,
          sortOrder: 3,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_id_photo',
          labelEn: 'ID photo (front)',
          labelAr: 'صورة الهوية (أمامي)',
          fieldType: 'file',
          isRequired: true,
          isSystem: true,
          isActive: true,
          sortOrder: 4,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
        {
          sectionId: step1Receiver.id,
          fieldKey: 'receiver_save_for_later',
          labelEn: 'Save this receiver for next time',
          labelAr: 'حفظ هذا المستلم للاستخدام لاحقاً',
          fieldType: 'checkbox',
          isRequired: false,
          isSystem: true,
          isActive: true,
          sortOrder: 5,
          conditionFieldKey: 'receiver_type',
          conditionValue: 'someone_else',
        },
      ],
  })

  const step1Fulfillment = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Fulfillment method',
      nameAr: 'طريقة الاستلام',
      step: 1,
      sortOrder: 2,
      isSystem: true,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
    data: [
      {
        sectionId: step1Fulfillment.id,
        fieldKey: 'fulfillment_method',
        labelEn: 'Pickup / Delivery',
        labelAr: 'استلام من الفرع / توصيل',
        fieldType: 'radio',
        isRequired: true,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        options: [
          { valueEn: 'PICKUP', valueAr: 'استلام من الفرع' },
          { valueEn: 'DELIVERY', valueAr: 'توصيل' },
        ],
      },
      {
        sectionId: step1Fulfillment.id,
        fieldKey: 'delivery_address_map',
        labelEn: 'Delivery address (map)',
        labelAr: 'عنوان التوصيل (خريطة)',
        fieldType: 'map',
        isRequired: false,
        isSystem: true,
        isActive: true,
        sortOrder: 1,
        conditionFieldKey: 'fulfillment_method',
        conditionValue: 'DELIVERY',
      },
      {
        sectionId: step1Fulfillment.id,
        fieldKey: 'delivery_address_street',
        labelEn: 'Street',
        labelAr: 'الشارع',
        fieldType: 'text',
        isRequired: false,
        isSystem: true,
        isActive: true,
        sortOrder: 2,
        conditionFieldKey: 'fulfillment_method',
        conditionValue: 'DELIVERY',
      },
      {
        sectionId: step1Fulfillment.id,
        fieldKey: 'delivery_address_district',
        labelEn: 'District',
        labelAr: 'الحي',
        fieldType: 'text',
        isRequired: false,
        isSystem: true,
        isActive: true,
        sortOrder: 3,
        conditionFieldKey: 'fulfillment_method',
        conditionValue: 'DELIVERY',
      },
      {
        sectionId: step1Fulfillment.id,
        fieldKey: 'delivery_address_city',
        labelEn: 'City',
        labelAr: 'المدينة',
        fieldType: 'dropdown',
        isRequired: false,
        isSystem: true,
        isActive: true,
        sortOrder: 4,
        conditionFieldKey: 'fulfillment_method',
        conditionValue: 'DELIVERY',
        options: [
          { valueEn: 'Riyadh', valueAr: 'الرياض' },
          { valueEn: 'Jeddah', valueAr: 'جدة' },
          { valueEn: 'Dammam', valueAr: 'الدمام' },
        ],
      },
    ],
  })

  const step1Time = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Time preference',
      nameAr: 'وقت التوصيل المفضل',
      step: 1,
      sortOrder: 3,
      isSystem: true,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
    data: [
      {
        sectionId: step1Time.id,
        fieldKey: 'preferred_time_slot',
        labelEn: 'Preferred time',
        labelAr: 'الوقت المفضل',
        fieldType: 'radio',
        isRequired: true,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        options: [
          { valueEn: 'morning', valueAr: 'صباحاً 9-12' },
          { valueEn: 'afternoon', valueAr: 'ظهراً 12-5' },
          { valueEn: 'evening', valueAr: 'مساءً 5-9' },
        ],
      },
      {
        sectionId: step1Time.id,
        fieldKey: 'urgent_request',
        labelEn: 'Urgent? Contact us',
        labelAr: 'عاجل؟ تواصل معنا',
        fieldType: 'checkbox',
        isRequired: false,
        isSystem: true,
        isActive: true,
        sortOrder: 1,
      },
    ],
  })

  const step1Legal = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Legal agreement',
      nameAr: 'إقرارات والتزامات',
      step: 1,
      sortOrder: 4,
      isSystem: true,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
    data: [
      {
        sectionId: step1Legal.id,
        fieldKey: 'legal_agreement',
        labelEn:
          'I confirm the receiver is authorized, I accept full responsibility, I agree to the terms and damage policy, I agree to sign receipt and guarantee documents, I agree that damage/delay costs will be deducted, I will not rent to third parties, and I will return equipment in the same condition.',
        labelAr:
          'أقر بأن المستلم مفوض من قبلي، وأقبل المسؤولية الكاملة، أوافق على الشروط وسياسة الأضرار، أوافق على توقيع سند الاستلام والضمان، أوافق على خصم أي مبالغ مستحقة من التأمين، لن أؤجر المعدات لطرف ثالث، وسأُرجع المعدات بنفس الحالة.',
        fieldType: 'checkbox',
        isRequired: true,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
      },
    ],
  })

  const step1Emergency = await prisma.checkoutFormSection.create({
    data: {
      nameEn: 'Emergency contact',
      nameAr: 'جهة اتصال للطوارئ',
      step: 1,
      sortOrder: 5,
      isSystem: false,
      isActive: true,
    },
  })
  await prisma.checkoutFormField.createMany({
    data: [
      {
        sectionId: step1Emergency.id,
        fieldKey: 'emergency_name',
        labelEn: 'Name',
        labelAr: 'الاسم',
        fieldType: 'text',
        isRequired: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
      },
      {
        sectionId: step1Emergency.id,
        fieldKey: 'emergency_phone',
        labelEn: 'Phone',
        labelAr: 'الجوال',
        fieldType: 'phone',
        isRequired: false,
        isSystem: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        sectionId: step1Emergency.id,
        fieldKey: 'emergency_relation',
        labelEn: 'Relationship',
        labelAr: 'العلاقة',
        fieldType: 'dropdown',
        isRequired: false,
        isSystem: false,
        isActive: true,
        sortOrder: 2,
        options: [
          { valueEn: 'Friend', valueAr: 'صديق' },
          { valueEn: 'Family', valueAr: 'قريب' },
          { valueEn: 'Colleague', valueAr: 'زميل' },
        ],
      },
    ],
  })

  console.log('Checkout form default sections and fields created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
