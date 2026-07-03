# 2026

يحتوي هذا المستودع على مشروعين مستقلين:

## RemoteAssist

تطبيق دعم فني عن بُعد (يشبه AnyDesk) بين هاتفين أندرويد، مبني بالكامل على موافقة صريحة من صاحب الهاتف: تطبيق أندرويد Kotlin أصلي + خادم WebSocket بسيط للربط بين الهاتفين. هاتف يشارك شاشته عبر نافذة أندرويد الرسمية لالتقاط الشاشة، والهاتف الآخر يشاهد ويرسل لمسات، لكن التحكم باللمس لا يعمل إلا بعد أن يفعّل صاحب الهاتف خدمة Accessibility يدويًا.

راجع [`RemoteAssist/README_AR.md`](RemoteAssist/README_AR.md) لتعليمات التشغيل الكاملة، و[`RemoteAssist/BUILD_APK.md`](RemoteAssist/BUILD_APK.md) لطرق بناء ملف APK.

**بناء سريع عبر GitHub Actions:** من تبويب Actions شغّل وركفلو **Build RemoteAssist APK** (زر *Run workflow*)، ثم حمّل الـ artifact باسم `RemoteAssist-debug-apk`. مسار الملف الناتج:

```text
RemoteAssist/android/app/build/outputs/apk/debug/app-debug.apk
```

## app

قالب أساسي من Expo Router (`create-expo-app`)، غير مرتبط بمشروع RemoteAssist. راجع [`app/README.md`](app/README.md).
