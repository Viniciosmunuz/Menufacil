package app.menufacil.print

import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * A via em ESC/POS, a língua que a impressora térmica entende.
 *
 * É a mesma montagem do Print Fácil do computador (totem-app/src/escpos.js),
 * traduzida para Kotlin: mesma tabela de acentos, mesmos destaques, mesmo
 * corte no fim. A comanda sai igual, venha do tablet ou do balcão.
 */
object EscPos {

  private const val ESC = 0x1b
  private const val GS = 0x1d

  /** a térmica não fala UTF-8: usa a tabela 860, que é a do português */
  private const val CODEPAGE_PT = 3

  private val ACENTOS = mapOf(
    'Ç' to 0x80, 'ü' to 0x81, 'é' to 0x82, 'â' to 0x83, 'ã' to 0x84, 'à' to 0x85, 'Á' to 0x86, 'ç' to 0x87,
    'ê' to 0x88, 'Ê' to 0x89, 'è' to 0x8a, 'Í' to 0x8b, 'Ô' to 0x8c, 'ì' to 0x8d, 'Ã' to 0x8e, 'Â' to 0x8f,
    'É' to 0x90, 'À' to 0x91, 'È' to 0x92, 'ô' to 0x93, 'õ' to 0x94, 'ò' to 0x95, 'Ú' to 0x96, 'ù' to 0x97,
    'Ì' to 0x98, 'Õ' to 0x99, 'Ü' to 0x9a, '¢' to 0x9b, '£' to 0x9c, 'Ù' to 0x9d, 'Ó' to 0x9f,
    'á' to 0xa0, 'í' to 0xa1, 'ó' to 0xa2, 'ú' to 0xa3, 'ñ' to 0xa4, 'Ñ' to 0xa5, 'ª' to 0xa6, 'º' to 0xa7,
    'Ò' to 0xa9, '·' to 0xfa,
  )

  private val TROCAS = mapOf('—' to "-", '–' to "-", '“' to "\"", '”' to "\"", '‘' to "'", '’' to "'", '…' to "...")

  private fun bytesDeTexto(texto: String): ByteArray {
    val saida = ByteArrayOutputStream()
    for (letra in texto) {
      val trocado = TROCAS[letra]
      if (trocado != null) {
        trocado.forEach { saida.write(it.code) }
        continue
      }
      val mapeado = ACENTOS[letra]
      when {
        mapeado != null -> saida.write(mapeado)
        letra.code < 128 -> saida.write(letra.code)
        // acento fora da tabela entra sem o acento, nunca como lixo
        else -> saida.write('?'.code)
      }
    }
    return saida.toByteArray()
  }

  private class Via {
    val bytes = ByteArrayOutputStream()

    init {
      // liga a impressora e escolhe a tabela de caracteres do português
      bytes.write(byteArrayOf(ESC.toByte(), 0x40, ESC.toByte(), 0x74, CODEPAGE_PT.toByte()))
    }

    fun alinhar(modo: Int) = apply { bytes.write(byteArrayOf(ESC.toByte(), 0x61, modo.toByte())) }
    fun negrito(ligado: Boolean) = apply { bytes.write(byteArrayOf(ESC.toByte(), 0x45, if (ligado) 1 else 0)) }

    /** 0 normal, 1 dobrada na altura, 2 dobrada nos dois lados */
    fun tamanho(nivel: Int) = apply {
      val valor = when (nivel) { 2 -> 0x11; 1 -> 0x01; else -> 0x00 }
      bytes.write(byteArrayOf(GS.toByte(), 0x21, valor.toByte()))
    }

    fun linha(texto: String = "") = apply {
      bytes.write(bytesDeTexto(texto))
      bytes.write(0x0a)
    }

    fun separador(largura: Int, forte: Boolean = false) = linha((if (forte) "=" else "-").repeat(largura))

    fun cortar() = apply {
      bytes.write(byteArrayOf(0x0a, 0x0a, 0x0a, 0x0a, GS.toByte(), 0x56, 0x42, 0x00))
    }

    fun paraBytes(): ByteArray = bytes.toByteArray()
  }

  private fun dinheiro(centavos: Int) = "R$ %.2f".format(centavos / 100.0).replace('.', ',')

  private fun entre(esquerda: String, direita: String, largura: Int): String {
    val sobra = maxOf(1, largura - esquerda.length - direita.length)
    return esquerda + " ".repeat(sobra) + direita
  }

  private fun quebrar(texto: String, largura: Int, recuo: Int = 0): List<String> {
    val linhas = mutableListOf<String>()
    var atual = ""
    for (palavra in texto.split(Regex("\\s+")).filter { it.isNotBlank() }) {
      if (atual.isNotEmpty() && (" ".repeat(recuo) + atual + " " + palavra).length > largura) {
        linhas.add(" ".repeat(recuo) + atual)
        atual = palavra
      } else {
        atual = if (atual.isEmpty()) palavra else "$atual $palavra"
      }
    }
    if (atual.isNotEmpty()) linhas.add(" ".repeat(recuo) + atual)
    return linhas
  }

  private val FORMA = mapOf("PIX" to "Pix", "CARD" to "Cartão", "CASH" to "Dinheiro")

  /**
   * Monta a via a partir do "dados" que o servidor manda em
   * /api/impressao/pedidos/{id} -- a mesma estrutura que o aplicativo do
   * computador recebe.
   */
  fun montar(dados: JSONObject, papelMm: Int): ByteArray {
    val largura = if (papelMm == 58) 32 else 48
    val entrega = dados.optString("tipo") == "DELIVERY"
    val noTotem = dados.optString("origem") == "TOTEM"
    val via = Via()

    // a via inteira sai com a letra dobrada na altura: quem lê a comanda
    // pendurada, de longe, agradece, e as colunas continuam alinhadas
    via.tamanho(1)

    via.alinhar(1).negrito(true).linha(dados.optString("restaurante").uppercase()).negrito(false)
    via.negrito(true).linha("PEDIDO #${dados.optInt("numero")}").negrito(false)

    val comoSai = when {
      entrega -> "ENTREGA"
      noTotem && dados.optBoolean("comer_aqui") -> "COMER NO LOCAL"
      noTotem -> "PARA VIAGEM"
      else -> "RETIRADA NO LOCAL"
    }
    via.negrito(true).linha(comoSai).negrito(false)
    if (noTotem) via.negrito(true).linha("TOTEM - JA PAGO").negrito(false)
    via.alinhar(0).separador(largura, true)

    val itens = dados.optJSONArray("itens")
    for (i in 0 until (itens?.length() ?: 0)) {
      val item = itens!!.optJSONObject(i) ?: continue
      val quantidade = "${item.optInt("quantidade")}x".padEnd(4)
      val nome = item.optString("nome")
      val valor = dinheiro(item.optInt("total_centavos"))
      via.negrito(true)
      if (quantidade.length + nome.length + valor.length + 2 <= largura) {
        via.linha(entre(quantidade + nome, valor, largura))
      } else {
        quebrar(nome, largura - 4).forEachIndexed { indice, l -> via.linha((if (indice == 0) quantidade else "    ") + l) }
        via.linha(entre("", valor, largura))
      }
      via.negrito(false)

      val opcoes = item.optJSONArray("opcoes")
      for (o in 0 until (opcoes?.length() ?: 0)) {
        quebrar(opcoes!!.optString(o), largura - 4).forEach { via.linha("    $it") }
      }
      val observacao = item.optString("observacao")
      if (observacao.isNotBlank() && observacao != "null") {
        quebrar("Obs.: $observacao", largura - 4).forEach { via.linha("    $it") }
      }
    }

    via.separador(largura)
    via.linha(entre("Subtotal", dinheiro(dados.optInt("subtotal_centavos")), largura))
    if (entrega) {
      val taxa = dados.optInt("entrega_centavos")
      via.linha(entre("Entrega", if (taxa > 0) dinheiro(taxa) else "Grátis", largura))
    }
    via.negrito(true).linha(entre("TOTAL", dinheiro(dados.optInt("total_centavos")), largura)).negrito(false)
    via.separador(largura, true)

    val pagamento = dados.optJSONObject("pagamento")
    val forma = pagamento?.optString("forma").orEmpty()
    via.negrito(true).linha("PAGAMENTO").negrito(false)
    via.linha(FORMA[forma] ?: forma)
    when {
      noTotem && forma == "CARD" -> via.linha("Pago na maquininha do totem")
      noTotem && forma == "PIX" -> via.linha("Pago por Pix no totem")
      forma == "CARD" -> via.linha(if (entrega) "Levar a maquininha" else "Pagar no balcão")
      forma == "PIX" -> via.linha("Conferir o comprovante no WhatsApp")
    }

    val cliente = dados.optJSONObject("cliente")
    via.separador(largura).negrito(true).linha("CLIENTE").negrito(false)
    quebrar(cliente?.optString("nome").orEmpty(), largura).forEach { via.linha(it) }
    val whatsapp = cliente?.optString("whatsapp").orEmpty()
    // no totem ninguém digita telefone
    if (whatsapp.isNotBlank() && whatsapp != "null") via.linha(whatsapp)

    if (entrega) {
      val endereco = dados.optJSONObject("endereco")
      via.separador(largura).negrito(true).linha("ENTREGAR EM").negrito(false)
      val rua = "${endereco?.optString("rua").orEmpty()}, ${endereco?.optString("numero").orEmpty()}".trim()
      quebrar(rua, largura).forEach { via.linha(it) }
      listOf("bairro", "complemento").forEach { campo ->
        val valor = endereco?.optString(campo).orEmpty()
        if (valor.isNotBlank() && valor != "null") quebrar(valor, largura).forEach { via.linha(it) }
      }
    }

    val observacao = dados.optString("observacao")
    if (observacao.isNotBlank() && observacao != "null") {
      via.separador(largura).negrito(true).linha("OBSERVAÇÃO DO PEDIDO")
      quebrar(observacao, largura).forEach { via.linha(it) }
      via.negrito(false)
    }

    return via.cortar().paraBytes()
  }

  /** via de teste, para conferir a impressora antes do primeiro pedido */
  fun teste(restaurante: String?, papelMm: Int): ByteArray {
    val largura = if (papelMm == 58) 32 else 48
    val via = Via()
    via.alinhar(1).tamanho(1).negrito(true).linha("MENU FACIL PRINT").negrito(false)
    via.linha("via de teste").alinhar(0).separador(largura, true)
    via.linha("Restaurante: ${restaurante ?: "ainda não pareado"}")
    via.linha("Papel: $papelMm mm ($largura colunas)")
    via.separador(largura)
    via.negrito(true).linha("Negrito funcionando").negrito(false)
    via.linha("Acentos: ação, café, pão, José")
    via.separador(largura, true)
    via.alinhar(1).linha("Se leu tudo isso, está pronto.").alinhar(0)
    return via.cortar().paraBytes()
  }
}
