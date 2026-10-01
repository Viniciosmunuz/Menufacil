package app.menufacil.print

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import android.os.Build

/**
 * A impressora térmica ligada no tablet pela porta USB.
 *
 * O Android não tem "driver de impressora" como o Windows: a gente abre a
 * porta e escreve os bytes do ESC/POS direto nela. É menos código que no
 * Windows, onde foi preciso falar com a fila de impressão do sistema.
 *
 * A primeira vez que o tablet vê a impressora, o Android pergunta ao dono se
 * libera. Marcando "sempre permitir", ele não pergunta de novo -- é o que
 * faz a impressão continuar automática depois de um reinício.
 */
class Impressora(private val contexto: Context) {

  private val usb = contexto.getSystemService(Context.USB_SERVICE) as UsbManager

  /** impressoras ligadas agora; quase sempre é uma só */
  fun aparelhos(): List<UsbDevice> = usb.deviceList.values.filter { aparelho ->
    (0 until aparelho.interfaceCount).any { i ->
      aparelho.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER
    } || aparelho.interfaceCount > 0
  }

  fun primeira(): UsbDevice? = aparelhos().firstOrNull()

  fun temPermissao(aparelho: UsbDevice): Boolean = usb.hasPermission(aparelho)

  /** pede ao dono a liberação da porta; ele marca "sempre permitir" uma vez */
  fun pedirPermissao(aparelho: UsbDevice) {
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
    val intencao = PendingIntent.getBroadcast(contexto, 0, Intent(ACAO_PERMISSAO).setPackage(contexto.packageName), flags)
    usb.requestPermission(aparelho, intencao)
  }

  /**
   * Manda os bytes para a impressora. Devolve null quando deu certo, ou o
   * motivo em português quando não deu -- é o que o balcão vê na tela.
   */
  fun imprimir(bytes: ByteArray): String? {
    val aparelho = primeira() ?: return "Nenhuma impressora encontrada no cabo USB."
    if (!temPermissao(aparelho)) {
      pedirPermissao(aparelho)
      return "Falta liberar a impressora. Toque em permitir no aviso do Android."
    }

    // a interface de impressora tem uma saída "bulk"; é por ela que vai tudo
    val interfaceDaImpressora = (0 until aparelho.interfaceCount)
      .map { aparelho.getInterface(it) }
      .firstOrNull { itf ->
        (0 until itf.endpointCount).any { e ->
          itf.getEndpoint(e).direction == UsbConstants.USB_DIR_OUT &&
            itf.getEndpoint(e).type == UsbConstants.USB_ENDPOINT_XFER_BULK
        }
      } ?: return "Esse aparelho USB não parece uma impressora."

    val saida = (0 until interfaceDaImpressora.endpointCount)
      .map { interfaceDaImpressora.getEndpoint(it) }
      .first { it.direction == UsbConstants.USB_DIR_OUT && it.type == UsbConstants.USB_ENDPOINT_XFER_BULK }

    var conexao: UsbDeviceConnection? = null
    return try {
      conexao = usb.openDevice(aparelho) ?: return "Não consegui abrir a impressora."
      if (!conexao.claimInterface(interfaceDaImpressora, true)) return "A impressora está ocupada por outro programa."

      // em pedaços: via comprida de uma vez só costuma travar a térmica
      var enviado = 0
      while (enviado < bytes.size) {
        val pedaco = minOf(PEDACO, bytes.size - enviado)
        val escritos = conexao.bulkTransfer(saida, bytes, enviado, pedaco, TEMPO_LIMITE)
        if (escritos <= 0) return "A impressora parou de responder no meio da via."
        enviado += escritos
      }
      null
    } catch (e: Exception) {
      "Erro ao imprimir: ${e.message ?: "desconhecido"}"
    } finally {
      conexao?.releaseInterface(interfaceDaImpressora)
      conexao?.close()
    }
  }

  companion object {
    const val ACAO_PERMISSAO = "app.menufacil.print.PERMISSAO_USB"
    private const val PEDACO = 2048
    private const val TEMPO_LIMITE = 5_000
  }
}
