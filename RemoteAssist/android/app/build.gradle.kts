plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.asim.remoteassist"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.asim.remoteassist"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
