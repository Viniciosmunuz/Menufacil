package app.menufacil.print

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject

/**
 * O cardápio do totem, dentro do aplicativo.
 *
 * É a mesma página do link (`/totem/<restaurante>`), sem tirar nem pôr: o
 * aplicativo não desenha nada do totem, só mostra a página em tela cheia.
 * Tudo que melhorar no site aparece aqui sem atualizar o aplicativo.
 *
 * A única coisa que ele faz por fora é entregar à página o token do totem,
 * no mesmo lugar em que a tela de ativação guardaria
 * (`localStorage["mf_totem_aparelho"]`, ver src/app/totem/[slug]/ponte.ts).
 * A página lê esse lugar na hora de cobrar, então ela segue igual: cobra
 * pelo servidor e a senha sai pela fila de impressão, que o serviço deste
 * mesmo aplicativo já atende.
 */
@SuppressLint("SetJavaScriptEnabled")
class TelaDoTotem(contexto: Context) {

  val visao: WebView = WebView(contexto)

  private var endereco: String? = null
  private var aparelho: String? = null
  private val relogio = Handler(Looper.getMainLooper())

  init {
    visao.setBackgroundColor(Color.parseColor("#0a0e14"))
    visao.settings.apply {
      javaScriptEnabled = true
      // é onde a página guarda o token e a sacola
      domStorageEnabled = true
      mediaPlaybackRequiresUserGesture = false
      // o cliente não dá zoom no cardápio por acidente
      builtInZoomControls = false
      displayZoomControls = false
      setSupportZoom(false)
    }
    // segurar o dedo num botão não deve abrir menu de copiar
    visao.isLongClickable = false
    visao.setOnLongClickListener { true }
    visao.webViewClient = Cliente()
  }

  /** abre o totem com o token que o servidor acabou de entregar */
  fun abrir(endereco: String, token: String, restauranteId: String, restauranteNome: String) {
    this.endereco = endereco
    this.aparelho = JSONObject()
      .put("token", token)
      .put("restaurantId", restauranteId)
      .put("restauranteNome", restauranteNome)
      .toString()
    visao.loadUrl(endereco)
  }

  /** volta uma tela dentro do totem; false quando já está no começo */
  fun voltar(): Boolean {
    if (!visao.canGoBack()) return false
    visao.goBack()
    return true
  }

  private fun entregarToken() {
    val valor = aparelho ?: return
    // JSONObject.quote devolve a string já pronta para virar texto em JS
    visao.evaluateJavascript(
      "try{localStorage.setItem('mf_totem_aparelho',${JSONObject.quote(valor)})}catch(e){}",
      null,
    )
  }

  private inner class Cliente : WebViewClient() {

    override fun onPageFinished(view: WebView, url: String) {
      if (url.startsWith("http")) entregarToken()
    }

    /** só o Menu Fácil abre aqui dentro: link para fora não leva o cliente embora */
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
      val destino = endereco?.let { Uri.parse(it).host } ?: return false
      return request.url.host != destino
    }

    /** sem internet: avisa na tela e tenta de novo sozinho */
    override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
      if (!request.isForMainFrame) return
      view.loadDataWithBaseURL(null, SEM_CONEXAO, "text/html", "utf-8", null)
      relogio.removeCallbacksAndMessages(null)
      relogio.postDelayed({ endereco?.let { view.loadUrl(it) } }, 5_000)
    }
  }

  private companion object {
    const val SEM_CONEXAO =
      "<html><body style='margin:0;background:#0a0e14;color:#f2f5f9;font-family:sans-serif;" +
        "display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>" +
        "<div><p style='font-size:28px;font-weight:bold'>Sem conexão</p>" +
        "<p style='color:#9aa7b8;font-size:18px'>Tentando de novo...</p></div></body></html>"
  }
}
