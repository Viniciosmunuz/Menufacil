plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "app.menufacil.print"
  compileSdk = 35

  defaultConfig {
    applicationId = "app.menufacil.print"
    // Android 7 em diante: cobre tablet barato sem abrir mão do que o
    // aplicativo precisa (USB host, serviço em primeiro plano).
    minSdk = 24
    targetSdk = 35
    versionCode = 2
    versionName = "0.2.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  // o voltar do Android no totem (OnBackPressedDispatcher.addCallback)
  implementation("androidx.activity:activity-ktx:1.9.3")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
