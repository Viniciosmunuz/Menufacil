package app.menufacil.print

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * O serviço que fica de olho na fila e imprime sozinho.
 *
 * Roda em primeiro plano (com aviso fixo na barra do Android) de propósito:
 * é o que impede o sistema de matar o aplicativo quando o tablet fica horas
 * mostrando o cardápio. Sem isso, o balcão descobriria que parou de
 * imprimir só quando faltasse comanda.
 *
 * O ritmo é o mesmo do Print Fácil do computador: pergunta de poucos em
 * poucos segundos. Quando a internet cai, ele só erra a pergunta e tenta de
 * novo -- não precisa de ninguém para voltar.
 */
class ServicoDeImpressao : Service() {

  private var trabalho: Job? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    criarCanal()
    startForeground(AVISO_ID, aviso("Pronto para imprimir"))

    if (trabalho?.isActive != true) {
      trabalho = CoroutineScope(Dispatchers.IO).launch { rodar() }
    }
    // se o Android matar por falta de memória, ele volta sozinho
    return START_STICKY
  }

  override fun onDestroy() {
    trabalho?.cancel()
    super.onDestroy()
  }

  private suspend fun rodar() {
    val config = Config(this)
    val impressora = Impressora(this)

    while (CoroutineScope(Dispatchers.IO).isActive) {
      try {
        val token = config.token
        if (token.isNullOrBlank()) {
          atualizar("Aguardando ativação")
          delay(ESPERA_PARADO)
          continue
        }

        val api = Api(config.servidor, token)
        val fila = api.fila()

        if (!fila.ok) {
          atualizar(if (fila.status == 0) "Sem internet — tentando de novo" else "Servidor respondeu ${fila.status}")
          delay(ESPERA_ERRO)
          continue
        }

        // ainda não pareado: o painel do restaurante ainda não digitou o código
        if (fila.corpo?.optBoolean("pareado", true) == false) {
          config.codigo = fila.corpo?.optString("codigo_pareamento")
          atualizar("Falta parear: código ${config.codigo}")
          delay(ESPERA_PARADO)
          continue
        }

        val pedidos = Api.pedidosDaFila(fila.corpo)
        if (pedidos.isEmpty()) {
          atualizar("Pronto para imprimir")
          delay(ESPERA_NORMAL)
          continue
        }

        for (pedidoId in pedidos) {
          val via = api.via(pedidoId)
          val dados = via.corpo?.optJSONObject("dados")
          if (!via.ok || dados == null) continue

          val papel = via.corpo?.optInt("papel_mm", config.papelMm) ?: config.papelMm
          config.papelMm = papel

          val erro = impressora.imprimir(EscPos.montar(dados, papel))
          if (erro != null) {
            atualizar(erro)
            // não marca como impresso: o pedido continua na fila para a
            // próxima volta, e nada se perde
            delay(ESPERA_ERRO)
            continue
          }

          // só depois que o papel saiu. O servidor só aceita uma vez por
          // pedido, então dois aparelhos nunca imprimem a mesma comanda.
          api.marcarImpresso(pedidoId)
          // a impressora de senha tira o recibo do cliente; a de comanda, a
          // via da cozinha. O servidor diz qual, pelo papel do aparelho.
          atualizar(if (dados.optString("papel") == "senha") "Senha impressa" else "Comanda impressa")
        }

        delay(ESPERA_NORMAL)
      } catch (e: Exception) {
        atualizar("Erro: ${e.message ?: "desconhecido"}")
        delay(ESPERA_ERRO)
      }
    }
  }

  // ---- o aviso fixo na barra do Android ---------------------------------

  private fun criarCanal() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val canal = NotificationChannel(CANAL, "Impressão", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Mostra que a impressão está ligada"
      setShowBadge(false)
    }
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(canal)
  }

  private fun aviso(texto: String): Notification {
    val abrir = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0),
    )

    val construtor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CANAL)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    return construtor
      .setContentTitle("Menu Fácil Print")
      .setContentText(texto)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentIntent(abrir)
      .setOngoing(true)
      .build()
  }

  private fun atualizar(texto: String) {
    ultimoEstado = texto
    val gerente = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    gerente.notify(AVISO_ID, aviso(texto))
  }

  companion object {
    private const val CANAL = "impressao"
    private const val AVISO_ID = 1

    /** ritmo normal: a comanda sai poucos segundos depois do pedido */
    private const val ESPERA_NORMAL = 4_000L
    private const val ESPERA_ERRO = 10_000L
    private const val ESPERA_PARADO = 15_000L

    /** o que a tela do aplicativo mostra; só informação */
    @Volatile
    var ultimoEstado: String = "Parado"
      private set

    fun ligar(contexto: Context) {
      val intencao = Intent(contexto, ServicoDeImpressao::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) contexto.startForegroundService(intencao)
      else contexto.startService(intencao)
    }
  }
}
