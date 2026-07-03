# 2026

This repository contains two independent projects:

## RemoteAssist

A consent-based, AnyDesk-style remote support MVP for Android (native Kotlin app + a small WebSocket signaling server). One phone shares its screen via Android's official screen-capture prompt, the other phone views it and can send taps back, but only after the host manually enables an Accessibility service. See [`RemoteAssist/README_AR.md`](RemoteAssist/README_AR.md) for full setup instructions (Arabic) and [`RemoteAssist/BUILD_APK.md`](RemoteAssist/BUILD_APK.md) for build instructions.

Quick build via GitHub Actions: run the **Build RemoteAssist APK** workflow (Actions tab → *Run workflow*), then download the `RemoteAssist-debug-apk` artifact. The APK lands at:

```text
RemoteAssist/android/app/build/outputs/apk/debug/app-debug.apk
```

## app

A default Expo Router scaffold (`create-expo-app`). See [`app/README.md`](app/README.md).
