plugins {
    id("com.android.application")
}

android {
    namespace = "org.synthai.computer"
    compileSdk = 35

    defaultConfig {
        applicationId = "org.synthai.computer.t7"
        minSdk = 28
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0-android-resident"
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
