# FlixCam Control Panel — Install as App

## English

Install the FlixCam control panel on your phone so it opens fullscreen like a native app. Same URL, same login — no App Store required.

### iPhone (Safari)

1. Open the control panel URL in **Safari** (not Chrome).
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.
5. Launch **FlixCam** from your home screen — it opens fullscreen.

**Note:** Full PWA support on iPhone requires **iOS 16.4 or newer**.

### Android (Chrome)

1. Open the control panel URL in **Chrome**.
2. Tap the **menu** (three dots).
3. Tap **Install app** or **Add to Home screen**.
4. Confirm installation.
5. Open **FlixCam** from your home screen or app drawer.

### After updates

When the team deploys a new version, the app updates automatically on next launch. If something looks stale, remove the home screen icon and add it again.

### Push notifications (optional)

1. Install the app to your home screen first (required on iPhone).
2. Log in to the admin panel.
3. Tap **تفعيل الإشعارات** in the top bar and allow notifications when prompted.
4. Requires **iOS 16.4+** on iPhone for PWA push.

Server setup (once per environment): run `npx tsx scripts/generate-vapid-keys.ts`, add keys to `.env`, run `npx prisma migrate deploy`, then redeploy.

---

## العربية

ثبّت لوحة تحكم FlixCam على هاتفك لتفتح بملء الشاشة مثل تطبيق أصلي. نفس الرابط، نفس تسجيل الدخول — بدون App Store.

### آيفون (Safari)

1. افتح رابط لوحة التحكم في **Safari** (وليس Chrome).
2. اضغط زر **المشاركة** (مربع مع سهم).
3. مرّر للأسفل واضغط **إضافة إلى الشاشة الرئيسية**.
4. اضغط **إضافة**.
5. افتح **FlixCam** من الشاشة الرئيسية — يفتح بملء الشاشة.

**ملاحظة:** دعم PWA الكامل على الآيفون يتطلب **iOS 16.4 أو أحدث**.

### أندرويد (Chrome)

1. افتح رابط لوحة التحكم في **Chrome**.
2. اضغط **القائمة** (ثلاث نقاط).
3. اضغط **تثبيت التطبيق** أو **إضافة إلى الشاشة الرئيسية**.
4. أكّد التثبيت.
5. افتح **FlixCam** من الشاشة الرئيسية أو درج التطبيقات.

### بعد التحديثات

عند نشر إصدار جديد، يتحدّث التطبيق تلقائياً عند فتحه التالي. إذا بدا قديماً، احذف الأيقونة من الشاشة الرئيسية وأضفها من جديد.

### الإشعارات الفورية (اختياري)

1. ثبّت التطبيق على الشاشة الرئيسية أولاً (مطلوب على الآيفون).
2. سجّل الدخول إلى لوحة التحكم.
3. اضغط **تفعيل الإشعارات** في الشريط العلوي واسمح بالإشعارات.
4. يتطلب **iOS 16.4+** على الآيفون لإشعارات PWA.

إعداد الخادم (مرة لكل بيئة): نفّذ `npx tsx scripts/generate-vapid-keys.ts`، أضف المفاتيح إلى `.env`، ثم `npx prisma migrate deploy` وأعد النشر.
