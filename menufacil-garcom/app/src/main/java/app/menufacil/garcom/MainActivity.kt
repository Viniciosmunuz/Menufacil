package app.menufacil.garcom

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * O Menu Fácil na mão do garçom, dentro da maquininha.
 *
 * O aplicativo não desenha nenhuma tela do salão: ele mostra a mesma
 * página do site (`/entrar` e, depois do login, `/garcom/<restaurante>`)
 * em tela cheia, sem barra de endereço. Tudo que melhorar no site aparece
 * aqui sem precisar atualizar o aplicativo -- que é o mesmo acordo do
 * aplicativo do totem.
 *
 * Não há pareamento nem token: quem prova quem é, é o próprio garçom, com
 * o CPF e a senha que o dono cadastrou. A sessão fica no cookie, que
 * sobrevive a fechar e abrir o aplicativo, e dura trinta dias -- então ele
 * digita a senha uma vez e, no dia a dia, encontra as mesas já abertas.
 */
class MainActivity : AppCompatActivity() {

  private lateinit var visao: WebView
  private lateinit var semRede: View

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(estadoSalvo: Bundle?) {
    super.onCreate(estadoSalvo)

    visao = WebView(this).apply {
      setBackgroundColor(Color.WHITE)
      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        // a maquininha tem tela pequena: a página é responsiva e se vira
        // sozinha, e o zoom só atrapalharia quem toca com o dedo no salão
        builtInZoomControls = false
        displayZoomControls = false
        setSupportZoom(false)
        useWideViewPort = false
        loadWithOverviewMode = false
      }
      // segurar o dedo num botão não deve abrir menu de copiar
      isLongClickable = false
      setOnLongClickListener { true }
      webViewClient = Cliente()
    }

    // o cookie da sessão precisa atravessar o fechar e abrir: é ele que
    // poupa o garçom de digitar a senha todo dia
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(visao, false)

    semRede = telaSemRede()

    val raiz = FrameLayout(this)
    raiz.addView(visao, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    raiz.addView(semRede, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    setContentView(raiz)

    // o voltar do Android anda na página, como num navegador; na primeira
    // tela ele não fecha o aplicativo por acidente no meio do salão
    onBackPressedDispatcher.addCallback(this) {
      if (visao.canGoBack()) visao.goBack()
    }

    abrir()
  }

  private fun abrir() {
    if (temRede()) {
      semRede.visibility = View.GONE
      visao.visibility = View.VISIBLE
      // sempre pela porta da frente: o site decide se mostra o login ou
      // manda direto para as mesas, conforme a sessão guardada
      visao.loadUrl(ENDERECO)
    } else {
      visao.visibility = View.GONE
      semRede.visibility = View.VISIBLE
    }
  }

  private fun temRede(): Boolean {
    val gerente = getSystemService(ConnectivityManager::class.java) ?: return false
    val rede = gerente.activeNetwork ?: return false
    val capacidades = gerente.getNetworkCapabilities(rede) ?: return false
    return capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
  }

  /**
   * O recado de quando a maquininha está sem internet.
   *
   * Vem do aplicativo, e não do site, porque é justamente quando o site
   * não carrega: sem isto o garçom veria a página de erro do navegador, em
   * inglês, no meio do movimento.
   */
  private fun telaSemRede(): View {
    val coluna = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = android.view.Gravity.CENTER
      setBackgroundColor(Color.WHITE)
      setPadding(48, 48, 48, 48)
      visibility = View.GONE
    }
    coluna.addView(TextView(this).apply {
      text = "Sem internet"
      textSize = 22f
      setTextColor(Color.parseColor("#1d2026"))
      gravity = android.view.Gravity.CENTER
    })
    coluna.addView(TextView(this).apply {
      text = "A maquininha precisa estar no wi-fi ou no chip para abrir as mesas."
      textSize = 15f
      setTextColor(Color.parseColor("#5b6168"))
      gravity = android.view.Gravity.CENTER
      setPadding(0, 16, 0, 32)
    })
    coluna.addView(Button(this).apply {
      text = "Tentar de novo"
      setOnClickListener { abrir() }
    })
    return coluna
  }

  private inner class Cliente : WebViewClient() {
    // tudo que for do Menu Fácil abre aqui dentro; o resto não abre
    override fun shouldOverrideUrlLoading(visao: WebView, pedido: WebResourceRequest): Boolean {
      val endereco = pedido.url.host ?: return true
      return !endereco.endsWith("menufacildelivery.com.br")
    }

    override fun onReceivedError(visao: WebView, pedido: WebResourceRequest, erro: WebResourceError) {
      // só a página principal derruba a tela: um ícone que não baixou não é
      // motivo para o garçom perder o que estava fazendo
      if (pedido.isForMainFrame) {
        this@MainActivity.visao.visibility = View.GONE
        semRede.visibility = View.VISIBLE
      }
    }
  }

  private companion object {
    const val ENDERECO = "https://menufacildelivery.com.br/entrar"
  }
}
