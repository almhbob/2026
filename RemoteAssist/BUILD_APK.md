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

## بناء Release موقّع (لتقليل حظر Google Play Protect)

APK Debug (أعلاه) موقّع بشهادة Debug المشتركة نفسها في كل مثبّتات Android Studio في العالم، وهذا أحد أكبر أسباب تصنيف أنظمة الحماية له كخطر. لبناء نسخة Release موقّعة بمفتاحك الخاص:

1. أضف 4 أسرار (Secrets) في المستودع من `Settings > Secrets and variables > Actions`:
   - `RELEASE_KEYSTORE_BASE64` — محتوى ملف الـ keystore مُرمّز بصيغة base64 (`base64 -w0 your.jks`).
   - `RELEASE_KEYSTORE_PASSWORD`
   - `RELEASE_KEY_ALIAS`
   - `RELEASE_KEY_PASSWORD`
2. شغّل وركفلو `Build RemoteAssist APK` — سيضيف تلقائياً خطوتين إضافيتين لبناء ورفع `RemoteAssist-release-apk` بمجرد توفر هذه الأسرار الأربعة.
3. **احتفظ بملف الـ keystore وكلمات المرور في مكان آمن دائم.** فقدانه يعني عدم القدرة على إصدار أي تحديث مستقبلي بنفس التوقيع أبداً — لا يمكن استرجاعه أو توليد بديل متوافق معه.

للبناء محلياً بنفس الطريقة دون CI:

```bash
export RELEASE_KEYSTORE_PATH=/path/to/your.jks
export RELEASE_KEYSTORE_PASSWORD=...
export RELEASE_KEY_ALIAS=...
export RELEASE_KEY_PASSWORD=...
cd android
gradle :app:assembleRelease
```
