import { formatPhone } from "./format";

// Os campos de endereço que o pedido anotado pela IA precisa completar
// sozinho -- aqueles em que a frase certa depende de um dado que ela não
// deve digitar (o telefone do cliente) ou de como o endereço chegou (o
// mapa). Em todos, quem escreve é o código: a IA erraria um dígito ou
// variaria a frase, e os dois saem impressos na comanda.

/** o teto do campo de observações do pedido, igual ao do checkout */
const OBSERVACOES_MAX = 300;

/**
 * A referência do pedido, com o telefone quando não houve referência.
 *
 * Quando o cliente diz que não tem ponto de referência nenhum, a IA
 * escreve "cliente não informou a localização" no campo -- é o que
 * destrava o pedido, porque o sistema recusa referência vazia (a regra
 * inteira está no prompt, em `responder.ts`). Só que, para quem vai
 * entregar, essa frase sozinha não serve de nada: ele chega na rua e não
 * sabe qual é a casa.
 *
 * **Então o número do cliente entra aqui, e entra pelo código.** A IA não
 * escreve os dígitos: ela veria o telefone no contexto e poderia errar um
 * deles, e telefone errado na comanda é pior que telefone nenhum -- o
 * entregador liga para um estranho e a casa continua perdida. Aqui o
 * número é o mesmo da conversa de onde o pedido nasceu.
 *
 * Reconhece por "nao informou" sem acento, porque a frase dela varia:
 * "cliente não informou a localização", "não informou referência", "o
 * cliente não informou". Todas querem dizer a mesma coisa, e uma
 * comparação exata deixaria passar as outras duas.
 *
 * Vale só para o pedido anotado pela IA. Quem pede pelo cardápio do link
 * preenche o campo no formulário, onde ele é obrigatório.
 */
export function referenciaComTelefone(referencia: string | undefined, telefone: string | null | undefined) {
  if (!referencia) return referencia;
  const cru = referencia
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!cru.includes("nao informou")) return referencia;
  const numero = formatPhone(telefone);
  // sem número legível não há o que acrescentar: fica a frase dela, que
  // ao menos diz ao entregador que ninguém esqueceu de perguntar
  if (!numero) return referencia;
  return `cliente não informou a localização - chamar no ${numero}`;
}

/**
 * O aviso, nas observações, de que o endereço veio do mapa.
 *
 * Quando o cliente responde "qual seu endereço?" com o pino ou com um
 * link do Google Maps, a única coisa que o mapa entrega é **a rua** -- e
 * ela é aproximada, porque o pino cai no vizinho e o mapa aberto não tem
 * os números das casas daqui. O bairro nem isso: os bairros de Presidente
 * Figueiredo não existem no mapa aberto, então ele vem da boca do cliente.
 *
 * Quem lê a comanda não tem como saber nada disso. Para ele, "Rua Mirás,
 * 45" é um endereço digitado como outro qualquer -- e se a moto não achar
 * a casa, ninguém sabe que dá para checar com o cliente. **Então a
 * comanda diz de onde veio o endereço e por onde falar com ele.**
 *
 * Escrito aqui e não pela IA, pela mesma razão do telefone: a frase não
 * pode variar de pedido para pedido nem errar um dígito.
 *
 * A observação do cliente vem primeiro e nunca é cortada -- "sem cebola"
 * é instrução de cozinha. Se o aviso não couber no campo, ele fica de
 * fora: o link do mapa continua no painel de qualquer jeito.
 */
export function observacoesComMapa(
  observacoes: string | undefined,
  veioDoMapa: boolean,
  telefone: string | null | undefined,
) {
  if (!veioDoMapa) return observacoes;
  const numero = formatPhone(telefone);
  const aviso =
    "📍 Endereço pelo mapa que o cliente mandou: a rua é a que o mapa deu, e é aproximada." +
    (numero ? ` O resto é com ele no WhatsApp ${numero}.` : "");

  const doCliente = observacoes?.trim();
  if (!doCliente) return aviso.slice(0, OBSERVACOES_MAX);
  const junto = `${doCliente} — ${aviso}`;
  // não cabendo, fica só o que o cliente pediu
  return junto.length > OBSERVACOES_MAX ? doCliente : junto;
}
