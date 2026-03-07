# تدقيق مسارات السيرفر وبنية FlixCam VPS
# FlixCam VPS Paths & Structure Audit

## 1. الحالة الحالية (Current State)

### 1.1 ملخص قبل/بعد (Previously vs Now)
| العنصر | Previously | Now (standard) |
|--------|------------|----------------|
| مسار التطبيق الافتراضي | متضارب (legacy paths) | `/home/flixcam/public_html/app` |
| مصدر المسارات | hardcoded في ملفات متعددة | `paths.config.sh` + `PRODUCTION_APP_PATH` |
| deploy-to-hostinger | افتراضي `apps/production/flixcam` | افتراضي `public_html/app` |
| push-to-vps | افتراضي legacy غير موحّد | افتراضي `public_html/app` |
| first-time/deploy/backup scripts | تعتمد غالباً على `apps/...` | تقرأ `paths.config.sh` أو fallback آمن |

### 1.2 المرجع المعتمد (Canonical Source)
- المرجع المعتمد للبنية والمسارات: `app/.cursorrules`
- المسار القياسي للإنتاج: `/home/flixcam/public_html/app`
- المسار متعدد البيئات (`apps/...`) يبقى **اختياري** فقط عبر `PRODUCTION_APP_PATH`.

---

## 2. الإصلاحات المطبقة (Fixes Applied)

### 2.1 ملف مسارات موحّد (Single paths config)
- **الملف:** `scripts/vps-migration/paths.config.sh`
- **المتغير الرئيسي:** `PRODUCTION_APP_PATH` (الافتراضي: `/home/flixcam/public_html/app`)
- يمكن إعادة الضبط عبر متغير `PRODUCTION_APP_PATH` عند الحاجة.

### 2.2 المسار الافتراضي الموحّد (Unified default path)
- **المسار الافتراضي:** `/home/flixcam/public_html/app` (تطبيق واحد = نفس مكان الريبو على السيرفر)
- المسار القياسي الافتراضي في هذا المشروع هو `public_html/app`.

### 2.3 الملفات المحدّثة (Updated files)
- `scripts/vps-migration/ecosystem.config.js` — يستخدم مسار production واحد واضح مع تعليق للتعديل
- `scripts/deploy-to-hostinger.sh` — الافتراضي `SERVER_APP_PATH=/home/flixcam/public_html/app`
- `scripts/vps-migration/first-time-setup.sh` — يقرأ من paths.config.sh أو يستخدم `PRODUCTION_APP_PATH`
- `scripts/vps-migration/backup.sh` — يقرأ من paths.config.sh
- `scripts/vps-migration/backup-db.sh` — يقرأ من paths.config.sh
- `scripts/vps-migration/post-receive` — يستخدم `PRODUCTION_APP_PATH` مع تعليمات في التعليقات
- `scripts/vps-migration/deploy.sh` — يدعم المسار الموحّد (production = PRODUCTION_APP_PATH إن وُجد)
- `push-to-vps.sh` — الافتراضي `REMOTE_DIR=/home/flixcam/public_html/app` مع تعليق

### 2.4 التوثيق (Documentation)
- هذا الملف يوثق الحالة الحالية بعد الإصلاحات.
- أي تحديث لاحق للمسارات يجب أن يطابق `app/.cursorrules`.

---

## 3. الهيكلة القياسية الافتراضية (Standard Default Structure)

### 3.1 تطبيق واحد (Single app) — الافتراضي
```
/home/flixcam/
├── public_html/
│   └── app/                    ← التطبيق (نفس مصدر الريبو)
│       ├── .env
│       ├── package.json
│       ├── scripts/
│       │   └── build-with-uploads-workaround.sh
│       └── storage/uploads     ← يمكن أن يكون symlink → shared/uploads
├── shared/
│   ├── uploads/
│   └── backups/
├── logs/
├── pm2/
│   └── ecosystem.config.js
└── scripts/                    ← نسخ من app/scripts/vps-migration/*.sh
```

### 3.2 بيئات متعددة (Multi-env) — اختياري
```
/home/flixcam/
├── apps/
│   ├── production/flixcam/
│   ├── staging/flixcam/
│   └── dev/flixcam/
├── config/
├── shared/
├── logs/
├── pm2/
└── scripts/
```
استخدام: `export PRODUCTION_APP_PATH=/home/flixcam/public_html/app` قبل تشغيل السكربتات عند الحاجة لإجبار المسار.

---

## 4. خطوات التحقق بعد التطبيق (Post-fix verification)

1. **على السيرفر:** نسخ أو تحديث `paths.config.sh` وملفات السكربتات المحدّثة من الريبو.
2. **ضبط المسار إن لزم:**  
   `export PRODUCTION_APP_PATH=/home/flixcam/public_html/app` (الافتراضي)  
   أو مسار مخصص إن كانت بيئتك مختلفة.
3. **تحديث PM2:** نسخ `ecosystem.config.js` إلى `~/pm2/` وتعديل `cwd` إن لزم، ثم `pm2 restart flixcam-production --update-env`.
4. **الديبلوي:** استخدم الخطوات القياسية (ci → prisma generate → migrate deploy → build → `pm2 reload flixcam-production`) كما هي في `app/.cursorrules`.
