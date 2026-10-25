plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "br.com.menufacil.garcom"
  compileSdk = 35

  defaultConfig {
    applicationId = "br.com.menufacil.garcom.salao"
    // Android 7 em diante: cobre as maquininhas Android em uso hoje e os
    // celulares baratos que o garçom leva no bolso do avental.
    minSdk = 24
    targetSdk = 35
    versionCode = 1
    versionName = "1.0.0"
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
  // o voltar do Android dentro da página (OnBackPressedDispatcher.addCallback)
  implementation("androidx.activity:activity-ktx:1.9.3")
}
