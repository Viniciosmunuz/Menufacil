import "server-only";

import { enviarTexto as enviarTextoKapso } from "./kapso";
import {
  enviarImagem as enviarImagemUazapi,
  enviarTexto as enviarTextoUazapi,
  type ContaUazapi,
} from "./uazapi";
import {
  canalConfigurado,
  enviarImagem as enviarImagemZapi,
  enviarTexto as enviarTextoZapi,
} from "./zapi";

/**
 * Por onde a conversa chegou, e por onde ela responde.
 *
 * O sistema fala com o WhatsApp por três caminhos: a Kapso (oficial,
 * pela Meta), a Z-API e a uazapi (as duas por QR code). Cada restaurante
 * usa **um**, e é sempre o mesmo dos dois lados: responder por outro
 * seria falar com o cliente pelo WhatsApp de outro restaurante.
 *
 * Este arquivo existe para que só ele saiba disso. Antes a escolha
 * estava espalhada -- um `if` no webhook, outro no envio, outro na busca
 * do restaurante --, o que com dois provedores ainda dava para
 * acompanhar. Com três vira o lugar onde nasce o bug que só aparece num
 * deles e leva dois dias para ser achado.
 *
 * Daqui para dentro, o atendimento não sabe de onde veio a mensagem. As
 * travas, o histórico e os pedidos continuam num lugar só.
 */
export type Canal =
  | { tipo: "kapso"; phoneNumberId: string }
  | { tipo: "zapi"; channelId: string }
  | { tipo: "uazapi"; conta: ContaUazapi };

/** o nome curto do provedor, para log e para a tela do admin */
export function nomeDoCanal(canal: Canal) {
  return canal.tipo;
}

/**
 * Os campos que identificam o canal, como chegam no aviso.
 *
 * Um deles vem preenchido; os outros, não. Quem monta isto é o webhook
 * de cada provedor.
 */
export type MarcaDoCanal = {
  phone_number_id?: string;
  zapi_channel_id?: string;
  /** o token da instância na uazapi, que ela manda no corpo de cada aviso */
  uazapi_token?: string;
};

/**
 * Onde procurar o restaurante, a partir do que o aviso trouxe.
 *
 * Devolve `null` quando o aviso não traz canal nenhum -- e essa saída
 * engana: ela acontece antes de qualquer consulta ao banco, então a
 * mensagem morre em milissegundos sem deixar rastro. Em 11/11/2026 isso
 * custou uma investigação inteira. Quem chama **registra** o caso.
 */
export function ondeAchar(marca: MarcaDoCanal) {
  if (marca.uazapi_token) return { uazapiToken: marca.uazapi_token };
  if (marca.zapi_channel_id) return { zapiChannelId: marca.zapi_channel_id };
  if (marca.phone_number_id) return { phoneNumberId: marca.phone_number_id };
  return null;
}

/** os campos do `AtendenteIa` que este arquivo precisa para montar o canal */
export type DadosDoCanal = {
  phoneNumberId: string | null;
  zapiChannelId: string | null;
  uazapiBaseUrl: string | null;
  uazapiToken: string | null;
};

/**
 * O canal do restaurante, montado do que está guardado.
 *
 * A marca do aviso manda: a mensagem responde por onde entrou. Só se ela
 * não disser nada é que vale o que o restaurante tem configurado --
 * caminho dos avisos que o sistema manda por conta própria (pagamento
 * caiu, pedido aceito), que não nascem de uma conversa.
 */
export function canalDo(dados: DadosDoCanal, marca?: MarcaDoCanal): Canal | null {
  const quer = marca ? ondeAchar(marca) : null;

  if ((!quer || "uazapiToken" in quer) && dados.uazapiToken && dados.uazapiBaseUrl) {
    return {
      tipo: "uazapi",
      conta: { baseUrl: dados.uazapiBaseUrl, token: dados.uazapiToken },
    };
  }
  if ((!quer || "zapiChannelId" in quer) && dados.zapiChannelId) {
    // A Z-API envia sempre pelo `ZAPI_CHANNEL_ID` do ambiente, que é um
    // por instalação e não um por restaurante. Enquanto só existir um
    // número a pergunta é sempre sim; no dia em que um segundo
    // restaurante conectar o dele, esta conferência é o que impede a
    // mensagem de um sair pelo WhatsApp do outro -- falha visível e
    // registrada, em vez de conversa na casa errada.
    //
    // A uazapi não precisa disto: lá a credencial é da instância do
    // restaurante e vem do banco, então o canal é o certo por
    // construção.
    const nosso = canalConfigurado();
    if (nosso && dados.zapiChannelId === nosso) {
      return { tipo: "zapi", channelId: dados.zapiChannelId };
    }
    console.warn(
      `[ia] o canal Z-API do restaurante (…${dados.zapiChannelId.slice(-6)}) não é o deste servidor`,
    );
    return null;
  }
  if ((!quer || "phoneNumberId" in quer) && dados.phoneNumberId) {
    return { tipo: "kapso", phoneNumberId: dados.phoneNumberId };
  }
  return null;
}

/**
 * Manda um texto pelo canal.
 *
 * O `usuario` só serve à Kapso: os avisos novos da Meta às vezes vêm sem
 * telefone, só com o id do usuário dentro da conta. Nos caminhos por QR
 * code sem telefone não há para onde mandar.
 *
 * Devolve `false` quando faltou o que era preciso para falar -- e não
 * levanta erro, porque o atendimento trata isso como "não deu para
 * responder", não como falha do sistema.
 */
export async function enviarTexto(
  canal: Canal,
  params: { telefone: string | null; usuario?: string | null; texto: string },
): Promise<boolean> {
  const { telefone, texto } = params;

  if (canal.tipo === "uazapi") {
    if (!telefone) return false;
    await enviarTextoUazapi({ conta: canal.conta, telefone, texto });
    return true;
  }
  if (canal.tipo === "zapi") {
    if (!telefone) return false;
    await enviarTextoZapi({ telefone, texto });
    return true;
  }
  await enviarTextoKapso({
    phoneNumberId: canal.phoneNumberId,
    telefone,
    usuario: params.usuario ?? null,
    texto,
  });
  return true;
}

/**
 * Manda uma imagem pelo canal, se ele souber mandar.
 *
 * A Kapso não tem envio de imagem montado aqui, e não vale a pena: por
 * ela o cliente recebe o código copia e cola do Pix, que resolve
 * sozinho. Melhor do que falhar.
 */
export async function enviarImagem(
  canal: Canal,
  params: { telefone: string | null; url: string; legenda?: string },
): Promise<boolean> {
  const { telefone, url, legenda } = params;
  if (!telefone) return false;

  if (canal.tipo === "uazapi") {
    await enviarImagemUazapi({ conta: canal.conta, telefone, url, legenda });
    return true;
  }
  if (canal.tipo === "zapi") {
    await enviarImagemZapi({ telefone, url, legenda });
    return true;
  }
  return false;
}
