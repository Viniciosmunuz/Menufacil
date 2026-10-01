package app.menufacil.print

import android.content.Context

/**
 * O que o aplicativo guarda entre uma aberta e outra: o endereço do
 * servidor, o token deste aparelho e o código de pareamento enquanto o dono
 * ainda não digitou no painel.
 */
class Config(contexto: Context) {

  private val prefs = contexto.getSharedPreferences("menufacil-print", Context.MODE_PRIVATE)

  var servidor: String
    get() = prefs.getString("servidor", PADRAO) ?: PADRAO
    set(valor) = prefs.edit().putString("servidor", valor.trimEnd('/')).apply()

  var token: String?
    get() = prefs.getString("token", null)
    set(valor) = prefs.edit().putString("token", valor).apply()

  /** some depois que o dono parear pelo painel */
  var codigo: String?
    get() = prefs.getString("codigo", null)
    set(valor) = prefs.edit().putString("codigo", valor).apply()

  var restaurante: String?
    get() = prefs.getString("restaurante", null)
    set(valor) = prefs.edit().putString("restaurante", valor).apply()

  /** largura da bobina que o restaurante usa, como o servidor informou */
  var papelMm: Int
    get() = prefs.getInt("papel", 80)
    set(valor) = prefs.edit().putInt("papel", valor).apply()

  val registrado: Boolean get() = !token.isNullOrBlank()

  companion object {
    const val PADRAO = "https://menufacildelivery.com.br"
  }
}
