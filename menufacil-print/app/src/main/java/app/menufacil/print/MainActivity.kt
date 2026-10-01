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
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * A única tela do aplicativo, e ela quase não é usada: depois de parear, o
 * balcão nunca mais precisa abrir isto.
 *
 * Ela serve para três coisas: mostrar o código de pareamento na primeira
 * vez, dizer em que pé está a impressão, e deixar imprimir uma via de teste
 * antes do primeiro cliente.
 *
 * A tela é montada em código, sem arquivo de layout: são poucos elementos e
 * assim fica tudo num lugar só.
 */
class MainActivity : AppCompatActivity() {

  private lateinit var config: Config
  private lateinit var estado: TextView
  private lateinit var codigo: TextView
  private lateinit var servidor: EditText

  private val relogio = Handler(Looper.getMainLooper())
  private val atualizar = object : Runnable {
    override fun run() {
      mostrarEstado()
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

    raiz.addView(texto("Menu Fácil Print", 30f, TINTA, negrito = true))
    raiz.addView(texto("A ponte entre o Menu Fácil e a impressora do balcão.", 15f, APAGADO))

    estado = texto("", 17f, LARANJA, negrito = true).also { it.setPadding(0, 48, 0, 0) }
    raiz.addView(estado)

    codigo = texto("", 34f, TINTA, negrito = true).also { it.setPadding(0, 24, 0, 0) }
    raiz.addView(codigo)

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
        "Depois de parear, pode fechar esta tela: a impressão continua sozinha, " +
          "em segundo plano. O aviso na barra do Android mostra que está ligada.",
        13f,
        APAGADO,
      ).also { it.setPadding(0, 48, 0, 0) },
    )

    setContentView(raiz, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

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
