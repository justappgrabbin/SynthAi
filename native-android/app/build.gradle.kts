plugins {
    id("com.android.application")
}

android {
    namespace = "org.synthai.computer"
    compileSdk = 35

    defaultConfig {
        applicationId = "org.synthai.computer"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-native-seed"
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

    androidResources {
        noCompress += listOf("bin", "tgz", "synthimg")
    }
}


dependencies {
    implementation("org.apache.commons:commons-compress:1.27.1")
}
