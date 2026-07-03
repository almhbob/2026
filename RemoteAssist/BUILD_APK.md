# بناء APK لتطبيق RemoteAssist

## من Android Studio

1. افتح مجلد `android` داخل Android Studio.
2. انتظر اكتمال Gradle Sync.
3. من القائمة اختر: `Build > Build APK(s)`.
4. ستجد الملف هنا:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## من GitHub Actions

1. ارفع محتوى هذا المجلد إلى مستودع GitHub.
2. افتح تبويب Actions.
3. اختر Workflow باسم `Build RemoteAssist APK`.
4. اضغط `Run workflow`.
5. بعد انتهاء البناء، حمّل Artifact باسم `RemoteAssist-debug-apk`.

## من جهاز فيه Gradle و Android SDK

```bash
cd android
gradle :app:assembleDebug
```

الناتج:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```
