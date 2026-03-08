# Documentation Index — FlixCam.rent

هذا هو الفهرس المركزي لجميع توثيق المشروع. الملفات منظمة حسب النوع والغرض.

---

## 📍 هيكل المجلدات (أماكن الملفات الصحيحة)

| المجلد                   | الغرض                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| **docs/**                | التوثيق الأساسي (PRD، هندسة، أمان، إلخ)                            |
| **docs/planning/**       | **الخطة الرئيسية** — خطط المشروع، سبرنتات، تقديرات، ملفات PDF/DOCX |
| **docs/audits/**         | تقارير التدقيق والتحليل                                            |
| **docs/phases/**         | تقارير إكمال المراحل (PHASE0–PHASE17)                              |
| **docs/setup/**          | إعداد البيئة، قاعدة البيانات، Redis، Supabase                      |
| **docs/reports/**        | تقارير الحالة، الاختبارات، التحسينات                               |
| **docs/features/**       | توثيق الميزات (مثل multi-language)                                 |
| **docs/public-website/** | مواصفات الموقع العام والواجهة                                      |
| **docs/admin/**          | توثيق لوحة التحكم والصلاحيات                                       |

---

## Core Documentation (في `docs/`)

- **[PRD.md](./PRD.md)** — متطلبات المنتج
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — هندسة النظام
- **[ROLES_AND_SECURITY.md](./ROLES_AND_SECURITY.md)** — الصلاحيات والأمان
- **[BOOKING_ENGINE.md](./BOOKING_ENGINE.md)** — محرك الحجز
- **[AI_BLUEPRINT.md](./AI_BLUEPRINT.md)** — استراتيجية الـ AI
- **[DATA_EVENTS.md](./DATA_EVENTS.md)** — نظام الأحداث
- **[TECH_STACK.md](./TECH_STACK.md)** — التقنيات المستخدمة
- **[ROADMAP.md](./ROADMAP.md)** — خارطة الطريق
- **[RESOURCES.md](./RESOURCES.md)** — مراجع خارجية

---

## Planning — الخطة الرئيسية (`docs/planning/`)

كل الخطط التالية تتبع الخطة الرئيسية:

- **ADMIN*PANEL*\*** — خطط لوحة التحكم والإنتاج
- **MILESTONES.md**, **SPRINTS.md**, **RISKS.md**, **ESTIMATES.md**
- **FLIXCAM_CURSOR_EXECUTION_PROMPT.md**, **IMPROVEMENT_BLUEPRINT.md**, **NEXT_IMPROVEMENTS.md**
- **FlixCam_AI_Strategy.pdf**, **Enterprise_Sidebar_Sitemap_Complete.docx**

---

## Audits (`docs/audits/`)

- تقارير تدقيق لوحة التحكم، الـ Control Panel، الـ Dashboard
- تقارير تحليل الكود والقواعد

---

## Phases (`docs/phases/`)

- **PHASE0_COMPLETE.md** … **PHASE17_COMPLETE.md**
- **PHASE**TEST**.md**, **PHASE_COMPLETION_REPORT.md**

---

## Setup (`docs/setup/`)

- **DATABASE_SETUP.md**, **INSTALL_POSTGRES.md**
- **QUICK_START.md**, **README_SETUP.md**, **SETUP\_\*.md**
- **REDIS_SETUP.md**, **SUPABASE_SETUP\*.md**, **PROJECT_LOCATION.md**

---

## Reports (`docs/reports/`)

- تقارير الحالة، الإكمال، الاختبارات
- **PROJECT_STATUS_REPORT.md**, **PRODUCTION_READINESS_CHECKLIST.md**
- **RBAC_IMPLEMENTATION_STATUS.md**, **TEST_RESULTS.md**, وغيرها

---

## Features (`docs/features/`)

- **multi-language/** — كل ملفات MULTI*LANGUAGE*\*.md

---

## جذر المشروع (Root)

يُفضّل أن يبقى في الجذر فقط:

- **README.md** — نظرة عامة وإقلاع سريع
- **CHANGELOG.md** — سجل التغييرات
- **CONTRIBUTING.md** — مساهمة في المشروع

---

**آخر تحديث:** فبراير 2025
