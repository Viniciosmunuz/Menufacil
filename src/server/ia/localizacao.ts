import "server-only";

// O mapa que o cliente manda, virando endereço.
//
// Perguntado "qual seu endereço?", muita gente responde com o mapa em vez
// de escrever. São dois jeitos, e para o sistema eles chegam diferentes:
//
// - **o pin** -- o anexo de localização do WhatsApp. Chega como uma
//   mensagem de tipo `location`, com latitude e longitude dentro dela.
// - **o link** -- a pessoa abre o Google Maps, acha a casa, toca em
//   compartilhar e cola o link na conversa. Chega como mensagem de texto
//   comum, e por isso passava direto: a IA via "https://maps.app.goo.gl/
//   AbC123" no meio da frase e não tinha o que fazer com aquilo.
//
// Os dois acabam em duas coisas: um ponto no mundo e, quando dá, o nome
// da rua e do bairro. O nome é o que importa na conversa -- é dele que
// sai a taxa de entrega, cobrada por bairro. O ponto vai junto no pedido,
// e é o que leva a moto até a porta em vez da quadra.
//
// Nada disso fecha pedido sozinho. O que sai daqui é oferecido ao cliente
// para ele confirmar, porque mapa erra: o pin cai no vizinho, o endereço
// do OpenStreetMap está a uma quadra de distância. Quem sabe onde mora é
// quem mora. A regra de como oferecer está no prompt, em responder.ts.

/**
 * Os hosts cujo link a gente aceita abrir.
 *
 * Abrir endereço que um desconhecido mandou é se oferecer de ponte: o
 * link poderia apontar para dentro da própria rede. Então a regra é
 * fechada por host, a resposta nunca é lida (só o cabeçalho de
 * redirecionamento) e o encurtado é seguido no máximo três vezes.
 */
const HOSTS_DE_MAPA = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "www.google.com.br",
  "google.com.br",
]);

const NOMINATIM_REVERSO = "https://nominatim.openstreetmap.org/reverse";

const AGENTE = "MenuFacil/1.0 (https://menufacildelivery.com.br)";

export type Ponto = { lat: number; lng: number };

export type DoMapa = {
  ponto: Ponto | null;
  /** o que o Google escreveu no link: nome do lugar, ou o endereço dele */
  lugar: string | null;
  /** o que o OpenStreetMap diz que existe naquele ponto */
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
};

/** latitude e longitude que fazem sentido, e que não são campo vazio */
function pontoValido(lat: unknown, lng: unknown): Ponto | null {
  const la = typeof lat === "string" ? Number(lat) : lat;
  const ln = typeof lng === "string" ? Number(lng) : lng;
  if (typeof la !== "number" || typeof ln !== "number") return null;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  // 0,0 é no meio do Atlântico: isso é campo em branco, não localização
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

/**
 * O link de mapa que está no meio do texto, se tiver algum.
 *
 * Quem compartilha do Google Maps quase nunca manda só o link: vem com
 * um "é aqui ó" na frente, ou com o nome do lugar que o próprio app cola
 * junto. Por isso é busca dentro da frase, e não comparação da frase
 * inteira.
 */
export function acharLinkDeMapa(texto: string): string | null {
  const achados = texto.match(/https?:\/\/[^\s"'<>]+/gi);
  if (!achados) return null;
  for (const bruto of achados) {
    // pontuação de fim de frase não faz parte do endereço
    const url = bruto.replace(/[.,;:!?)\]]+$/, "");
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (!HOSTS_DE_MAPA.has(host)) continue;
    // google.com é grande demais para valer inteiro.
    //
    // O que é mapa tem /maps no caminho, ou traz uma coordenada na
    // consulta -- e é essa segunda parte que precisa ser estreita: um
    // "?q=" solto também é o da busca comum, e "google.com/search?q=pizza"
    // chegou a ser lido como localização de cliente.
    if (host.includes("google.com") && !host.startsWith("maps.")) {
      const ehMapa =
        /\/maps(\/|$|\?)/i.test(url) || /[?&](q|query|ll)=-?\d+\.\d+(,|%2C)/i.test(url);
      if (!ehMapa) continue;
    }
    return url;
  }
  return null;
}

/**
 * O endereço longo por trás de um encurtado.
 *
 * O `maps.app.goo.gl` não carrega nada dentro de si: é uma chave que o
 * Google troca pelo endereço de verdade, e é esse que tem as coordenadas
 * e, com sorte, o nome da rua. Só o cabeçalho é lido; o corpo da resposta
 * nunca é tocado.
 */
async function abrirEncurtado(url: string): Promise<string> {
  let atual = url;
  for (let salto = 0; salto < 3; salto++) {
    let host: string;
    try {
      host = new URL(atual).hostname.toLowerCase();
    } catch {
      return atual;
    }
    if (!HOSTS_DE_MAPA.has(host)) return atual;
    // endereço longo já tem dentro dele o que precisamos: nada a seguir
    if (/\/maps\/(place|search|dir)\//i.test(atual)) return atual;
    if (/[?&](q|query)=/i.test(atual)) return atual;

    let resposta: Response;
    try {
      resposta = await fetch(atual, {
        redirect: "manual",
        headers: { "User-Agent": AGENTE },
        signal: AbortSignal.timeout(4500),
      });
    } catch {
      return atual;
    }
    const proximo = resposta.headers.get("location");
    if (!proximo) return atual;
    try {
      atual = new URL(proximo, atual).toString();
    } catch {
      return atual;
    }
  }
  return atual;
}

/** as coordenadas escondidas num endereço do Google Maps, nos formatos dele */
export function pontoDaUrl(url: string): Ponto | null {
  // !3d-2.03!4d-60.02 -- o ponto exato do lugar, dentro do parâmetro `data`
  const dados = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  // ?q=-2.03,-60.02, ?query=... ou ?ll=... -- pin solto, sem lugar com nome
  const consulta = url.match(/[?&](?:q|query|ll|daddr)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  // /maps/place/-2.03,-60.02 -- o mesmo pin, no caminho em vez da consulta
  const caminho = url.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  // /@-2.030000,-60.025000,17z -- o centro da tela na hora de compartilhar
  const arroba = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  // a ordem é a da precisão: o do `data` aponta a casa, o do @ aponta o
  // meio do mapa que estava aberto, que pode estar a uma rua de distância
  for (const achado of [dados, consulta, caminho, arroba]) {
    if (!achado) continue;
    const ponto = pontoValido(achado[1], achado[2]);
    if (ponto) return ponto;
  }
  return null;
}

/**
 * O nome que o Google pôs no link, quando o ponto é um lugar conhecido dele.
 *
 * Dois formatos, e o segundo é o que mais aparece. Medido em 24/11/2026
 * com o link do próprio Papaléguas:
 *
 * - `/maps/place/<Nome>/@...` -- o que eu esperava.
 * - `maps.google.com/?q=<endereço inteiro em texto>` -- **sem coordenada
 *   nenhuma**, e foi o que veio. Eu só lia o primeiro, então o endereço
 *   completo que o Google tinha escrito ali era jogado fora e a IA dizia
 *   que não conseguiu abrir o mapa.
 *
 * O segundo formato é o melhor dos dois: o texto do Google traz rua **e
 * bairro**, que é justamente o que o mapa aberto não sabe desta cidade.
 */
export function lugarDaUrl(url: string): string | null {
  const limpar = (bruto: string) => {
    let nome: string;
    try {
      nome = decodeURIComponent(bruto.replace(/\+/g, " ")).trim();
    } catch {
      return null;
    }
    // coordenada não é nome de lugar: isso é o pin solto, e quem o lê é
    // o `pontoDaUrl`
    if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(nome)) return null;
    return nome.slice(0, 160) || null;
  };

  const noCaminho = url.match(/\/maps\/place\/([^/@?]+)/);
  if (noCaminho) {
    const nome = limpar(noCaminho[1]);
    if (nome) return nome;
  }

  const naConsulta = url.match(/[?&](?:q|query)=([^&]+)/i);
  return naConsulta ? limpar(naConsulta[1]) : null;
}

/**
 * Que endereço existe naquele ponto, segundo o OpenStreetMap.
 *
 * O mesmo serviço que o mapa do entregador já usa, agora ao contrário:
 * dois números entram, rua e bairro saem.
 *
 * **Medido em Presidente Figueiredo em 23/11/2026, com coordenadas de lá:**
 *
 * - a rua volta certa, e volta certa até uns 30 m fora dela -- o serviço
 *   encosta no caminho mais perto, que é o que se quer de um pin.
 * - o bairro **não volta**: os bairros da cidade não estão no mapa aberto,
 *   só as ruas. Como é o bairro que diz a taxa de entrega, ele continua
 *   sendo pergunta para o cliente, mesmo quando a rua já veio daqui.
 * - o número da casa também não existe no mapa (medido em 03/11/2026, na
 *   tradução do outro lado, em `entregadores/geocodificar.ts`).
 *
 * Fora da cidade, num ponto só de rodovia, o que volta é o nome da
 * rodovia. É verdade, e é pouco: por isso o que sai daqui é oferecido ao
 * cliente para confirmar, nunca usado direto.
 *
 * Nunca lança. Sem isto a IA ainda pede o endereço escrito, que é o que
 * ela faria se este arquivo não existisse.
 */
async function ondeFica(ponto: Ponto): Promise<Pick<DoMapa, "rua" | "bairro" | "cidade">> {
  const vazio = { rua: null, bairro: null, cidade: null };
  const url =
    `${NOMINATIM_REVERSO}?format=jsonv2&zoom=18&addressdetails=1` +
    `&lat=${ponto.lat}&lon=${ponto.lng}`;
  try {
    const resposta = await fetch(url, {
      headers: { "User-Agent": AGENTE, "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(4500),
    });
    if (!resposta.ok) return vazio;
    const corpo = (await resposta.json()) as {
      address?: Record<string, string | undefined>;
    };
    const e = corpo.address ?? {};
    return {
      rua: e.road ?? e.pedestrian ?? e.residential ?? null,
      // `city_district` ficou de fora de propósito: em Presidente
      // Figueiredo ele volta com o nome da **cidade**, não de um bairro
      // (medido em 23/11/2026, num ponto do Honório Roldão). Aceitá-lo
      // poria "Presidente Figueiredo" no campo do bairro, e o bairro é o
      // que cobra a taxa de entrega.
      bairro: e.suburb ?? e.neighbourhood ?? e.quarter ?? null,
      cidade: e.city ?? e.town ?? e.village ?? e.municipality ?? null,
    };
  } catch {
    return vazio;
  }
}

/**
 * As coordenadas dentro do aviso cru de uma mensagem de localização.
 *
 * Varre o objeto em vez de ler um campo de nome fixo, de propósito: o
 * formato da uazapi para `location` não está documentado, e a doc dela já
 * divergiu do que chega de verdade em dois pontos (ver o webhook). Um
 * campo com "lat" no nome e um número de latitude dentro é latitude, seja
 * ele `latitude`, `lat` ou `degreesLatitude`.
 */
export function pontoDoAviso(aviso: unknown): Ponto | null {
  let lat: unknown;
  let lng: unknown;

  const varrer = (valor: unknown, fundo: number) => {
    if (fundo > 4 || valor === null || typeof valor !== "object") return;
    for (const [chave, dentro] of Object.entries(valor as Record<string, unknown>)) {
      const nome = chave.toLowerCase();
      if (typeof dentro === "number" || typeof dentro === "string") {
        // "longitude" vai testado primeiro porque "lat" não casa com ele,
        // mas um dia casaria: nome de campo de mapa é imprevisível
        if (lng === undefined && /^(lng|lon|long|longitude|degreeslongitude)$/.test(nome)) {
          lng = dentro;
        } else if (lat === undefined && /^(lat|latitude|degreeslatitude)$/.test(nome)) {
          lat = dentro;
        }
        continue;
      }
      varrer(dentro, fundo + 1);
    }
  };
  varrer(aviso, 0);
  return pontoValido(lat, lng);
}

/**
 * Tudo o que se consegue saber do mapa que o cliente mandou.
 *
 * `null` quando não havia mapa nenhum ali -- quem chama segue tratando a
 * mensagem como o texto comum que ela é.
 */
export async function lerMapa(de: {
  ponto?: Ponto | null;
  texto?: string | null;
  /**
   * Que já se sabe ser uma mensagem de localização, mesmo sem link dentro.
   *
   * É o caso dos canais que mandam o pin cru, sem coordenada que a gente
   * saiba achar. Não há mapa para ler, e ainda assim a IA precisa saber
   * que o cliente respondeu com o mapa -- senão ela pede o endereço de
   * quem acabou de mandá-lo.
   */
  ehPin?: boolean;
}): Promise<DoMapa | null> {
  const nada: DoMapa = { ponto: null, lugar: null, rua: null, bairro: null, cidade: null };
  let ponto = de.ponto ?? null;
  let lugar: string | null = null;

  if (!ponto && de.texto) {
    const link = acharLinkDeMapa(de.texto);
    if (!link) return de.ehPin ? nada : null;
    const longo = await abrirEncurtado(link);
    ponto = pontoDaUrl(longo);
    lugar = lugarDaUrl(longo);
    // link de mapa que não se deixa ler ainda é um link de mapa: a IA
    // precisa saber que o cliente respondeu, para pedir escrito
    if (!ponto) return { ...nada, lugar };
  }
  if (!ponto) return de.ehPin || lugar ? { ...nada, lugar } : null;

  return { ponto, lugar, ...(await ondeFica(ponto)) };
}

/**
 * A marca de que a mensagem era um pin de localização.
 *
 * Não chega ao modelo: é só o bilhete que o webhook deixa para o
 * `lerMapa` saber que aquilo era um mapa, e não texto. O que o modelo lê
 * é o `[MAPA]` que sai do `mapaEmTexto`, e a regra de como responder a
 * ele está no prompt, no bloco FAZ_PEDIDOS.
 *
 * Mandar o pin é o jeito mais natural de responder "qual seu endereço?",
 * e foi o que uma cliente fez no primeiro fim de semana da Lia -- sem
 * ninguém tratar isso, a conversa morria e o atendente tinha de entrar.
 */
export const MARCA_LOCALIZACAO =
  "[o cliente mandou a localização pelo mapa, em vez de escrever o endereço]";

/**
 * O mapa escrito do jeito que a IA lê.
 *
 * Entra no lugar da mensagem do cliente, e marcado: é o aviso de que ele
 * mandou o mapa, mais o que o mapa diz. As coordenadas vão escritas
 * porque é delas que a IA copia para o pedido -- é o que faz a moto
 * chegar na porta, e não na quadra.
 */
export function mapaEmTexto(mapa: DoMapa, pin: boolean, original?: string | null): string {
  const como = pin ? "mandou a localização pelo mapa" : "mandou um link do Google Maps";
  const linhas = [`[MAPA] O cliente ${como}, em vez de escrever o endereço.`];

  if (mapa.lugar) linhas.push(`No link, o mapa aponta para: "${mapa.lugar}".`);
  if (mapa.rua || mapa.bairro) {
    const achado = [mapa.rua, mapa.bairro, mapa.cidade].filter(Boolean).join(", ");
    linhas.push(
      `Naquele ponto existe, segundo o mapa aberto: ${achado}.` +
        " É aproximado, e não tem o número da casa.",
    );
  }
  if (mapa.ponto) {
    linhas.push(
      `Coordenadas: latitude ${mapa.ponto.lat.toFixed(6)},` +
        ` longitude ${mapa.ponto.lng.toFixed(6)}.`,
    );
  }
  if (!mapa.lugar && !mapa.rua && !mapa.ponto) {
    linhas.push("Não deu para abrir: você não sabe onde é.");
  }

  // O que ele escreveu junto do link, se escreveu alguma coisa.
  //
  // Este texto SUBSTITUI a mensagem do cliente no histórico, então o que
  // não vier para cá se perde. E muita gente manda o mapa no meio de uma
  // frase: "é aqui ó <link> e manda mais uma coca". Sem esta parte, a
  // coca sumia -- a IA leria só o mapa e seguiria sem o item.
  const resto = (original ?? "")
    // o marcador e o que o webhook anexa ao pin são bilhetes nossos, não
    // fala dele: ecoá-los como "ele escreveu junto" seria a IA lendo a
    // própria anotação como se fosse mensagem do cliente
    .replaceAll(MARCA_LOCALIZACAO, " ")
    .replace(/\(o mapa veio com:[^)]*\)/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // dois caracteres não são frase: é o "ó" ou o ":" que sobrou do link
  if (resto.length > 2) linhas.push(`Ele escreveu junto: "${resto}".`);

  return linhas.join(" ");
}
