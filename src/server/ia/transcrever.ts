import "server-only";

/**
 * Áudio do cliente virando texto.
 *
 * Metade das pessoas pede por áudio no WhatsApp -- com a mão na direção,
 * com a criança no colo, ou porque é mais rápido do que digitar. Até aqui
 * a Lia respondia pedindo para escrever, o que funciona e irrita: quem
 * mandou áudio mandou áudio de propósito.
 *
 * **Por que não é a Anthropic que faz isto:** o Claude lê texto e imagem,
 * não ouve. Então a transcrição é de outro fornecedor, e por isso ela
 * vive num arquivo só -- trocar de serviço é mexer aqui e em nenhum outro
 * lugar.
 *
 * **Por que o Groq:** ele roda o Whisper numa camada gratuita que aguenta
 * de sobra o movimento de um restaurante (20 pedidos por minuto, 2 mil
 * por dia, duas horas de áudio por hora), e fala a mesma língua da API da
 * OpenAI -- se um dia a conta gratuita apertar, é trocar o endereço e a
 * chave, sem reescrever nada.
 *
 * **Sem chave, nada disso acontece** e o sistema volta ao que fazia
 * antes: pedir por escrito. É de propósito -- um restaurante que não
 * configurou nada não pode quebrar por causa de um recurso novo.
 */

const ENDERECO = "https://api.groq.com/openai/v1/audio/transcriptions";

/** o Whisper rápido; o nome vem do ambiente para trocar sem deploy */
const MODELO = process.env.GROQ_TRANSCRICAO_MODELO?.trim() || "whisper-large-v3-turbo";

/**
 * Teto do arquivo, em bytes.
 *
 * O Groq recusa acima de 25 MB, mas o limite aqui é bem menor e por outro
 * motivo: um áudio de dez minutos num pedido de hambúrguer não é um
 * pedido, é outra coisa -- e transcrevê-lo gasta a cota do dia que os
 * outros clientes vão precisar. Acima disto ela pede por escrito, como
 * fazia antes.
 */
const TAMANHO_MAX = 6 * 1024 * 1024;

/** quanto esperar pelo download e pela transcrição, cada um */
const ESPERA_MS = 20_000;

export function transcricaoLigada() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

/**
 * Transcreve o áudio de uma URL. Devolve `null` quando não deu.
 *
 * Nunca levanta erro: isto roda no caminho de uma mensagem de cliente, e
 * uma falha de transcrição não pode derrubar o atendimento. Quando volta
 * `null`, quem chamou segue com o comportamento de sempre.
 */
export async function transcrever(url: string): Promise<string | null> {
  const chave = process.env.GROQ_API_KEY?.trim();
  if (!chave) return null;

  try {
    const baixado = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MS) });
    if (!baixado.ok) {
      console.error(`[transcrever] não consegui baixar o áudio (${baixado.status})`);
      return null;
    }

    const audio = await baixado.blob();
    if (audio.size > TAMANHO_MAX) {
      console.info(`[transcrever] áudio de ${Math.round(audio.size / 1024)}KB, grande demais`);
      return null;
    }

    const corpo = new FormData();
    // o nome do arquivo importa: o serviço decide o formato pela extensão
    corpo.append("file", audio, "audio.mp3");
    corpo.append("model", MODELO);
    // Português declarado, e não adivinhado. Sem isto o Whisper às vezes
    // decide que "oi, quero dois x-burger" é espanhol e devolve o texto
    // com a grafia errada, o que estraga o nome dos pratos.
    corpo.append("language", "pt");
    corpo.append("response_format", "text");

    const resposta = await fetch(ENDERECO, {
      method: "POST",
      headers: { authorization: `Bearer ${chave}` },
      body: corpo,
      signal: AbortSignal.timeout(ESPERA_MS),
    });

    if (!resposta.ok) {
      console.error(`[transcrever] recusado (${resposta.status}): ${(await resposta.text()).slice(0, 200)}`);
      return null;
    }

    const texto = (await resposta.text()).trim();
    if (!texto) return null;

    console.info(`[transcrever] ${texto.length} caracteres de ${Math.round(audio.size / 1024)}KB`);
    return texto;
  } catch (erro) {
    console.error("[transcrever] falhou:", erro);
    return null;
  }
}
