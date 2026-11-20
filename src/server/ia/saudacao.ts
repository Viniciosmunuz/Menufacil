import "server-only";

/**
 * A resposta ao "oi", sem gastar IA.
 *
 * A maioria das conversas no WhatsApp do restaurante é um cumprimento e
 * nada mais: o cliente escreve "oi", recebe o link e vai pedir por lá.
 * Até aqui, cada um desses "oi" disparava uma chamada ao modelo
 * carregando as regras e o cardápio inteiro -- 17.800 tokens para montar
 * uma mensagem que é sempre a mesma. Medido no Papaléguas, isso era
 * metade da conta do mês.
 *
 * Agora o código responde esses casos com o mesmo texto, sem chamar
 * ninguém. O cliente recebe exatamente o que receberia antes.
 *
 * **A detecção é conservadora de propósito.** O risco aqui não é gastar
 * um pouco mais: é responder com um texto pronto para quem já disse o
 * que quer, que é o oposto de tudo o que foi ajustado no prompt dela.
 * Então só passa por aqui quem escreveu um cumprimento e **nada além**:
 * qualquer palavra fora da lista manda a conversa para a IA.
 */

/** as palavras que, sozinhas ou juntas, ainda são só um cumprimento */
const CUMPRIMENTOS = new Set([
  "oi",
  "ola",
  "opa",
  "eai",
  "eae",
  "alo",
  "hey",
  "hi",
  "bom",
  "boa",
  "dia",
  "tarde",
  "noite",
  "tudo",
  "bem",
  "blz",
  "beleza",
  "boas",
  "vindas",
  "e",
  "ai",
  "pessoal",
  "amigo",
  "amiga",
  "gente",
  "moço",
  "moca",
  "por",
  "favor",
  "pfv",
  "pf",
]);

/** tira acento, emoji e pontuação -- sobra só a palavra */
function limpar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * É só um cumprimento?
 *
 * Mensagem longa não passa nem que só tenha cumprimento: "oi oi oi oi
 * oi, tem entrega?" com a pergunta cortada no meio ainda é alguém
 * querendo saber de entrega. Quarenta letras é um "oi, boa noite, tudo
 * bem?" com folga.
 */
export function soUmCumprimento(texto: string) {
  const bruto = texto.trim();
  if (!bruto || bruto.length > 40) return false;
  const palavras = limpar(bruto);
  // sem palavra nenhuma é emoji solto, figurinha ou pontuação: também é
  // um "oi" -- mas só quando é curto mesmo
  if (palavras.length === 0) return bruto.length <= 8;
  if (palavras.length > 6) return false;
  return palavras.every((p) => CUMPRIMENTOS.has(p));
}

/**
 * O emoji que abre a mensagem.
 *
 * O prompt pede para trocar o 🍔 por um que combine com a comida da
 * casa, e o modelo fazia isso lendo o cardápio. Aqui a escolha é pelo
 * que o cardápio tem mais: é menos esperto que o modelo e acerta o
 * suficiente -- numa pizzaria sai 🍕, numa hamburgueria 🍔.
 */
export function emojiDaCasa(cardapio: string) {
  const texto = cardapio.toLowerCase();
  const conta = (termo: string) => (texto.match(new RegExp(termo, "g")) ?? []).length;
  const candidatos: [string, number][] = [
    ["🍕", conta("pizza")],
    ["🍔", conta("burger|x-|hamburg")],
    ["🍣", conta("sushi|temaki|yakisoba")],
    ["🍨", conta("acai|sorvete|milk")],
    ["🍗", conta("frango|galeto|asinha")],
    ["🥘", conta("massa|lasanha|macarr")],
  ];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : "🍽️";
}

/**
 * O texto da boas-vindas.
 *
 * É o mesmo modelo que está no prompt dela, palavra por palavra -- se um
 * mudar, o outro muda junto, senão o cliente recebe uma mensagem
 * diferente conforme o caminho que a conversa tomou.
 *
 * O link vai sozinho na linha dele, inteiro e sem formatação em volta,
 * para o WhatsApp mostrar a prévia do cardápio.
 */
export function textoDaSaudacao({
  nome,
  link,
  emoji,
}: {
  nome: string;
  link: string;
  emoji: string;
}) {
  return [
    `${emoji} Olá! Seja bem-vindo(a) ao *${nome}*! 😊`,
    "",
    "Aqui é a Lia, assistente virtual do restaurante.",
    "",
    "*É pelo nosso cardápio digital que você faz o pedido:*",
    "",
    link,
    "",
    "📲 Escolha e finalize por lá mesmo. O pedido cai direto aqui pra gente ✅",
  ].join("\n");
}
