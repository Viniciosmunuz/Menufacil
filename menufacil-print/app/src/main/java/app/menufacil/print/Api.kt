package app.menufacil.print

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Conversa com o MenuFácil.
 *
 * São exatamente as mesmas portas que o Menu Fácil para PC usa há meses --
 * não há nada novo no servidor para este aplicativo:
 *
 *   POST /api/impressao/dispositivos          registra e devolve o código
 *   GET  /api/impressao/pedidos               a fila do que falta imprimir
 *   GET  /api/impressao/pedidos/{id}          a via pronta
 *   POST /api/impressao/pedidos/{id}/impresso marca impresso
 *
 * A trava contra imprimir duas vezes mora no servidor: "impresso" só vale
 * uma vez por pedido, então dois aparelhos ligados na mesma conta nunca
 * imprimem a mesma comanda.
 */
class Api(private val servidor: String, private val token: String?) {

  data class Resposta(val ok: Boolean, val status: Int, val corpo: JSONObject?)

  private fun chamar(caminho: String, metodo: String = "GET", corpo: JSONObject? = null): Resposta {
    val conexao = URL(servidor.trimEnd('/') + caminho).openConnection() as HttpURLConnection
    return try {
      conexao.requestMethod = metodo
      conexao.connectTimeout = 15_000
      conexao.readTimeout = 20_000
      conexao.setRequestProperty("content-type", "application/json")
      token?.let { conexao.setRequestProperty("authorization", "Bearer $it") }

      if (corpo != null) {
        conexao.doOutput = true
        conexao.outputStream.use { it.write(corpo.toString().toByteArray()) }
      }

      val codigo = conexao.responseCode
      val fluxo = if (codigo in 200..299) conexao.inputStream else conexao.errorStream
      val texto = fluxo?.bufferedReader()?.use { it.readText() }.orEmpty()
      val json = if (texto.isBlank()) null else JSONObject(texto)
      Resposta(codigo in 200..299, codigo, json)
    } catch (e: Exception) {
      Resposta(false, 0, null)
    } finally {
      conexao.disconnect()
    }
  }

  /** primeira vez que o aplicativo roda: ganha um token e um código para ditar */
  fun registrar(nome: String): Resposta =
    chamar("/api/impressao/dispositivos", "POST", JSONObject().put("nome", nome))

  /** o que está esperando impressão; vazio quando não há nada */
  fun fila(): Resposta = chamar("/api/impressao/pedidos")

  /** a via de um pedido: texto pronto e os dados soltos para o ESC/POS */
  fun via(pedidoId: String): Resposta = chamar("/api/impressao/pedidos/$pedidoId")

  /** avisa que saiu no papel; o servidor ignora a segunda vez */
  fun marcarImpresso(pedidoId: String): Resposta =
    chamar("/api/impressao/pedidos/$pedidoId/impresso", "POST", JSONObject())

  companion object {
    /** lista de ids de pedido dentro da resposta da fila */
    fun pedidosDaFila(corpo: JSONObject?): List<String> {
      val lista = corpo?.optJSONArray("pedidos") ?: JSONArray()
      return (0 until lista.length()).mapNotNull { lista.optJSONObject(it)?.optString("id") }.filter { it.isNotBlank() }
    }
  }
}
