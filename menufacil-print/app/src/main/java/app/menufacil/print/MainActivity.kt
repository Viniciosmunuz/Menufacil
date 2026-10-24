package app.menufacil.print

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * O aplicativo tem duas telas, e o cliente só vê uma.
 *
 * - **O totem**: o cardápio do restaurante em tela cheia (ver TelaDoTotem).
 *   Abre sozinho assim que a impressora está pareada e o admin liberou o
 *   totem para o restaurante.
 * - **Os ajustes**: o código de pareamento na primeira vez, em que pé está
 *   a impressão e a via de teste. Do totem se chega aqui apertando o botão
 *   de voltar do Android cinco vezes seguidas; sem mexer, ela volta
 *   sozinha para o totem em dois minutos.
 *
 * Sem totem liberado, o aplicativo é o Menu Fácil Print de sempre: fica nos
 * ajustes e imprime em segundo plano.
 *
 * A tela é montada em código, sem arquivo de layout: são poucos elementos e
 * assim fica tudo num lugar só.
 */
class MainActivity : AppCompatActivity() {

  private lateinit var config: Config
  private lateinit var estado: TextView
  private lateinit var codigo: TextView
  private lateinit var servidor: EditText
  private lateinit var avisoDoTotem: TextView
  private lateinit var ajustes: View

  private var tela: TelaDoTotem? = null
  private var totemAberto = false
  private var abrindo = false
  /** quando pode tentar abrir o totem de novo, sozinho */
  private var proximaTentativa = 0L
  /** os últimos toques no voltar, para a saída dos cinco toques */
  private val toques = ArrayDeque<Long>()

  private val relogio = Handler(Looper.getMainLooper())
  private val atualizar = object : Runnable {
    override fun run() {
      mostrarEstado()
      if (config.pareado && !totemAberto && !abrindo && System.currentTimeMillis() >= proximaTentativa) abrirTotem()
      relogio.postDelayed(this, 2_000)
    }
  }

  override fun onCreate(salvo: Bundle?) {
    super.onCreate(salvo)
    config = Config(this)

    val raiz = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(FUNDO)
      setPadding(48, 64, 48, 48)
    }

    raiz.addView(texto("Menu Fácil Totem", 30f, TINTA, negrito = true))
    raiz.addView(texto("O totem do restaurante e a impressora do balcão, num aplicativo só.", 15f, APAGADO))

    estado = texto("", 17f, LARANJA, negrito = true).also { it.setPadding(0, 48, 0, 0) }
    raiz.addView(estado)

    codigo = texto("", 34f, TINTA, negrito = true).also { it.setPadding(0, 24, 0, 0) }
    raiz.addView(codigo)

    avisoDoTotem = texto("", 15f, APAGADO).also { it.setPadding(0, 24, 0, 0) }
    raiz.addView(avisoDoTotem)
    raiz.addView(botao("Abrir o totem") { abrirTotem() })

    raiz.addView(texto("Endereço do servidor", 13f, APAGADO).also { it.setPadding(0, 48, 0, 8) })
    servidor = EditText(this).apply {
      setText(config.servidor)
      setTextColor(TINTA)
      setHintTextColor(APAGADO)
      inputType = InputType.TYPE_TEXT_VARIATION_URI
      textSize = 15f
    }
    raiz.addView(servidor)

    raiz.addView(botao("Salvar endereço") {
      config.servidor = servidor.text.toString().trim()
      estado.text = "Endereço salvo."
    })

    raiz.addView(botao("Imprimir via de teste") { imprimirTeste() })

    raiz.addView(
      texto(
        "Depois de parear, o totem abre sozinho e a impressão continua em segundo plano. " +
          "Para voltar a esta tela, aperte o voltar do Android cinco vezes seguidas.",
        13f,
        APAGADO,
      ).also { it.setPadding(0, 48, 0, 0) },
    )

    ajustes = raiz
    setContentView(raiz, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

    onBackPressedDispatcher.addCallback(this) {
      when {
        // no totem o voltar navega dentro dele; no começo, conta os toques
        totemAberto -> if (tela?.voltar() != true) contarToque()
        config.pareado -> abrirTotem()
        else -> moveTaskToBack(true)
      }
    }

    pedirPermissaoDeAviso()
    registrarSePreciso()
    ServicoDeImpressao.ligar(this)
  }

  override fun onResume() {
    super.onResume()
    relogio.post(atualizar)
  }

  override fun onPause() {
    relogio.removeCallbacks(atualizar)
    super.onPause()
  }

  /** a primeira abertura ganha token e código; as outras não fazem nada */
  private fun registrarSePreciso() {
    if (config.registrado) return
    estado.text = "Registrando este aparelho..."

    CoroutineScope(Dispatchers.IO).launch {
      val resposta = Api(config.servidor, null).registrar(nomeDoAparelho())
      withContext(Dispatchers.Main) {
        val corpo = resposta.corpo
        if (!resposta.ok || corpo == null) {
          estado.text = "Não consegui falar com o Menu Fácil. Confira a internet e o endereço."
          return@withContext
        }
        config.token = corpo.optString("token")
        config.codigo = corpo.optString("codigo_pareamento")
        mostrarEstado()
        ServicoDeImpressao.ligar(this@MainActivity)
      }
    }
  }

  // ---- o totem ----------------------------------------------------------

  /** pede ao servidor o token do totem e abre a página do restaurante */
  private fun abrirTotem() {
    val token = config.token
    if (abrindo || token.isNullOrBlank() || !config.pareado) return
    abrindo = true
    avisoDoTotem.text = "Abrindo o totem..."

    CoroutineScope(Dispatchers.IO).launch {
      val resposta = Api(config.servidor, token).totem(versao())
      withContext(Dispatchers.Main) {
        abrindo = false
        val corpo = resposta.corpo
        val restaurante = corpo?.optJSONObject("restaurante")
        val endereco = corpo?.optString("endereco").orEmpty()
        val tokenDoTotem = corpo?.optString("token").orEmpty()
        if (!resposta.ok || restaurante == null || endereco.isBlank() || tokenDoTotem.isBlank()) {
          // sem totem liberado ou sem internet: continua imprimindo e tenta
          // de novo daqui a um minuto
          val motivo = corpo?.optString("erro")?.takeIf { it.isNotBlank() }
            ?: if (resposta.status == 0) "Sem internet." else "Não consegui abrir o totem."
          avisoDoTotem.text = "$motivo A impressão continua funcionando."
          proximaTentativa = System.currentTimeMillis() + 60_000
          return@withContext
        }

        config.restaurante = restaurante.optString("nome")
        val atual = tela ?: TelaDoTotem(this@MainActivity).also { tela = it }
        atual.abrir(endereco, tokenDoTotem, restaurante.optString("id"), restaurante.optString("nome"))
        avisoDoTotem.text = ""
        setContentView(atual.visao)
        totemAberto = true
        telaCheia(true)
      }
    }
  }

  /** do totem para os ajustes; volta sozinho em dois minutos */
  private fun mostrarAjustes() {
    totemAberto = false
    telaCheia(false)
    setContentView(ajustes)
    proximaTentativa = System.currentTimeMillis() + 120_000
  }

  private fun contarToque() {
    val agora = System.currentTimeMillis()
    toques.addLast(agora)
    while (toques.isNotEmpty() && agora - toques.first() > 3_000) toques.removeFirst()
    if (toques.size >= 5) {
      toques.clear()
      mostrarAjustes()
    }
  }

  /** o totem sem barra do Android e sem a tela apagar */
  private fun telaCheia(ligar: Boolean) {
    val controle = WindowInsetsControllerCompat(window, window.decorView)
    if (ligar) {
      WindowCompat.setDecorFitsSystemWindows(window, false)
      controle.hide(WindowInsetsCompat.Type.systemBars())
      controle.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    } else {
      WindowCompat.setDecorFitsSystemWindows(window, true)
      controle.show(WindowInsetsCompat.Type.systemBars())
      window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }

  @Suppress("DEPRECATION")
  private fun versao() = try {
    packageManager.getPackageInfo(packageName, 0).versionName ?: "?"
  } catch (e: Exception) {
    "?"
  }

  private fun imprimirTeste() {
    estado.text = "Mandando a via de teste..."
    CoroutineScope(Dispatchers.IO).launch {
      val erro = Impressora(this@MainActivity).imprimir(EscPos.teste(config.restaurante, config.papelMm))
      withContext(Dispatchers.Main) {
        estado.text = erro ?: "Via de teste enviada. Confira o papel."
      }
    }
  }

  private fun mostrarEstado() {
    val pendente = config.codigo
    if (!config.registrado) {
      estado.text = "Registrando este aparelho..."
      codigo.text = ""
      return
    }
    if (!pendente.isNullOrBlank()) {
      estado.text = "Digite este código no painel do restaurante, na aba Totem:"
      codigo.text = pendente
      return
    }
    estado.text = ServicoDeImpressao.ultimoEstado
    codigo.text = ""
  }

  /** o Android 13+ pede autorização para mostrar o aviso fixo */
  private fun pedirPermissaoDeAviso() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val permissao = Manifest.permission.POST_NOTIFICATIONS
    if (ContextCompat.checkSelfPermission(this, permissao) != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(this, arrayOf(permissao), 1)
    }
  }

  private fun nomeDoAparelho() = listOf(Build.MANUFACTURER, Build.MODEL).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Tablet" }

  // ---- montagem da tela --------------------------------------------------

  private fun texto(conteudo: String, tamanho: Float, cor: Int, negrito: Boolean = false) = TextView(this).apply {
    text = conteudo
    textSize = tamanho
    setTextColor(cor)
    if (negrito) setTypeface(typeface, android.graphics.Typeface.BOLD)
  }

  private fun botao(rotulo: String, aoTocar: () -> Unit) = Button(this).apply {
    text = rotulo
    setBackgroundColor(LARANJA)
    setTextColor(Color.parseColor("#1a0f02"))
    gravity = Gravity.CENTER
    setOnClickListener { aoTocar() }
    (layoutParams as? LinearLayout.LayoutParams)?.topMargin = 24
  }

  private companion object {
    val FUNDO = Color.parseColor("#0a0e14")
    val TINTA = Color.parseColor("#f2f5f9")
    val APAGADO = Color.parseColor("#9aa7b8")
    val LARANJA = Color.parseColor("#ff8a1f")
  }
}
