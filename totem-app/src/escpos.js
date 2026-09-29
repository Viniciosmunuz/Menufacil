// Modo térmica: em vez de mandar texto pelo driver do Windows, fala a
// língua da impressora (ESC/POS). É isso que libera número do pedido em
// letra dobrada, TOTAL em negrito e o corte automático do papel.
//
// Só funciona em impressora térmica de verdade. Por isso fica como opção
// no programa: se sair torto, é só desligar e voltar ao modo comum.

const ESC = 0x1b;
const GS = 0x1d;

// a térmica não fala UTF-8: usa uma tabela de caracteres antiga, e a 860
// é a de português (á, ã, ç, õ...)
const CODEPAGE_PT = 3; // 860
const ACENTOS = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ã": 0x84, "à": 0x85, "Á": 0x86, "ç": 0x87,
  "ê": 0x88, "Ê": 0x89, "è": 0x8a, "Í": 0x8b, "Ô": 0x8c, "ì": 0x8d, "Ã": 0x8e, "Â": 0x8f,
  "É": 0x90, "À": 0x91, "È": 0x92, "ô": 0x93, "õ": 0x94, "ò": 0x95, "Ú": 0x96, "ù": 0x97,
  "Ì": 0x98, "Õ": 0x99, "Ü": 0x9a, "¢": 0x9b, "£": 0x9c, "Ù": 0x9d, "Ó": 0x9f,
  "á": 0xa0, "í": 0xa1, "ó": 0xa2, "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5, "ª": 0xa6, "º": 0xa7,
  "Ò": 0xa9, "·": 0xfa,
};

/** sinais que o teclado do celular manda e a térmica não conhece */
const TROCAS = { "—": "-", "–": "-", "“": '"', "”": '"', "‘": "'", "’": "'", "…": "...", "\t": "  " };

/** texto na tabela da impressora; o que não existir vira o mais parecido */
function bytesDeTexto(texto) {
  const saida = [];
  const limpo = texto.normalize("NFC").replace(/[—–“”‘’…\t]/g, (c) => TROCAS[c]);
  for (const letra of limpo) {
    const mapeado = ACENTOS[letra];
    if (mapeado !== undefined) {
      saida.push(mapeado);
      continue;
    }
    const codigo = letra.charCodeAt(0);
    if (codigo < 128) {
      saida.push(codigo);
      continue;
    }
    // acento fora da tabela: entra sem o acento, nunca como lixo
    const semAcento = letra.normalize("NFD").replace(/[̀-ͯ]/g, "");
    saida.push(...[...semAcento].map((c) => (c.charCodeAt(0) < 128 ? c.charCodeAt(0) : 0x3f)));
  }
  return saida;
}

class Via {
  constructor() {
    this.bytes = [ESC, 0x40, ESC, 0x74, CODEPAGE_PT]; // liga e escolhe a tabela
  }
  /** 0 = esquerda, 1 = centro, 2 = direita */
  alinhar(modo) {
    this.bytes.push(ESC, 0x61, modo);
    return this;
  }
  negrito(ligado) {
    this.bytes.push(ESC, 0x45, ligado ? 1 : 0);
    return this;
  }
  /** tamanho da letra: 0 normal, 1 dobrada na altura, 2 dobrada nos dois lados */
  tamanho(nivel) {
    const valor = nivel === 2 ? 0x11 : nivel === 1 ? 0x01 : 0x00;
    this.bytes.push(GS, 0x21, valor);
    return this;
  }
  linha(texto = "") {
    this.bytes.push(...bytesDeTexto(texto), 0x0a);
    return this;
  }
  separador(largura, forte = false) {
    return this.linha((forte ? "=" : "-").repeat(largura));
  }
  pular(quantas = 1) {
    this.bytes.push(...Array(quantas).fill(0x0a));
    return this;
  }
  cortar() {
    this.bytes.push(0x0a, 0x0a, 0x0a, 0x0a, GS, 0x56, 0x42, 0x00); // avança e corta
    return this;
  }
  paraBuffer() {
    return Buffer.from(this.bytes);
  }
}

const dinheiro = (centavos) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

const relogio = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const telefone = (digitos) => {
  const numero = String(digitos ?? "").replace(/\D/g, "").replace(/^55/, "");
  if (numero.length < 10) return digitos ?? "";
  return `(${numero.slice(0, 2)}) ${numero.slice(2, -4)}-${numero.slice(-4)}`;
};

/** rótulo à esquerda e valor à direita, na largura da bobina */
const entre = (esquerda, direita, largura) => {
  const sobra = Math.max(1, largura - esquerda.length - direita.length);
  return esquerda + " ".repeat(sobra) + direita;
};

/** quebra sem cortar palavra */
function quebrar(texto, largura, recuo = 0) {
  const linhas = [];
  let atual = "";
  for (const palavra of String(texto).split(/\s+/).filter(Boolean)) {
    if (atual && (" ".repeat(recuo) + atual + " " + palavra).length > largura) {
      linhas.push(" ".repeat(recuo) + atual);
      atual = palavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) linhas.push(" ".repeat(recuo) + atual);
  return linhas;
}

const FORMA = { PIX: "Pix", CARD: "Cartão", CASH: "Dinheiro" };
const CARTAO = { CREDIT: "crédito", DEBIT: "débito" };

/**
 * Monta a via em ESC/POS a partir dos dados do pedido. Mesma informação da
 * via de texto, com o que importa em destaque.
 */
export function viaEscPos(dados, papel = 80) {
  const largura = papel === 58 ? 32 : 48;
  const entrega = dados.tipo === "DELIVERY";
  const via = new Via();

  // A via inteira sai com o dobro da altura: a térmica só tem passos
  // inteiros de tamanho, e este é o único acima do normal que mantém a
  // largura da letra -- ou seja, as 48 colunas continuam alinhadas. Quem
  // lê a comanda pendurada, de longe, agradece; o papel rende um pouco
  // menos por pedido.
  const CORPO = 1;

  // a via inteira sai no mesmo tamanho: o que separa cabeçalho, número do
  // pedido e total do resto é o negrito, não o corpo da letra
  via.tamanho(CORPO);
  via.alinhar(1).negrito(true).linha(dados.restaurante.toUpperCase()).negrito(false);
  via.linha(relogio(dados.criado_em));
  via.negrito(true).linha(`PEDIDO #${dados.numero}`).negrito(false);
  via.negrito(true).linha(entrega ? "ENTREGA" : "RETIRADA NO LOCAL").negrito(false);
  // a via do totem sai marcada: no balcão, ninguém anotou este pedido
  if (dados.origem === "TOTEM") via.negrito(true).linha("TOTEM - JA PAGO").negrito(false);
  via.alinhar(0).separador(largura, true);

  // itens
  for (const item of dados.itens) {
    const quantidade = `${item.quantidade}x`.padEnd(4);
    const valor = dinheiro(item.total_centavos);
    via.negrito(true);
    if (quantidade.length + item.nome.length + valor.length + 2 <= largura) {
      via.linha(entre(quantidade + item.nome, valor, largura));
    } else {
      // nome comprido: a coluna da quantidade continua valendo embaixo
      quebrar(item.nome, largura - 4).forEach((l, i) => via.linha((i === 0 ? quantidade : "    ") + l));
      via.linha(entre("", valor, largura));
    }
    via.negrito(false);
    for (const opcao of item.opcoes) for (const l of quebrar(opcao, largura - 4, 0)) via.linha(`    ${l}`);
    if (item.observacao) for (const l of quebrar(`Obs.: ${item.observacao}`, largura - 4, 0)) via.linha(`    ${l}`);
  }

  // contas: só o total ganha letra maior
  via.separador(largura);
  via.linha(entre("Subtotal", dinheiro(dados.subtotal_centavos), largura));
  if (entrega) via.linha(entre("Entrega", dados.entrega_centavos > 0 ? dinheiro(dados.entrega_centavos) : "Grátis", largura));
  via.negrito(true);
  via.linha(entre("TOTAL", dinheiro(dados.total_centavos), largura));
  via.negrito(false);
  via.separador(largura, true);

  // pagamento
  const { forma, cartao, troco_para_centavos: trocoPara } = dados.pagamento;
  via.negrito(true).linha("PAGAMENTO").negrito(false);
  via.linha(forma === "CARD" ? `${FORMA.CARD}${cartao ? ` de ${CARTAO[cartao]}` : ""}` : FORMA[forma]);
  if (forma === "CASH") {
    via.linha(trocoPara ? `Troco para ${dinheiro(trocoPara)}` : "Sem troco");
    if (trocoPara) via.negrito(true).linha(entre("Levar de troco", dinheiro(trocoPara - dados.total_centavos), largura)).negrito(false);
  }
  if (forma === "CARD") {
    // no totem o cartão já passou: dizer "pagar no balcão" faria cobrar de novo
    via.linha(dados.origem === "TOTEM" ? "Pago na maquininha do totem" : entrega ? "Levar a maquininha" : "Pagar no balcão");
  }
  if (forma === "PIX") via.linha("Conferir o comprovante no WhatsApp");

  // cliente
  via.separador(largura).negrito(true).linha("CLIENTE").negrito(false);
  for (const l of quebrar(dados.cliente.nome, largura)) via.linha(l);
  // no totem ninguém digita telefone
  if (dados.cliente.whatsapp) via.linha(telefone(dados.cliente.whatsapp));

  // para onde vai
  if (entrega) {
    const e = dados.endereco;
    via.separador(largura).negrito(true).linha("ENTREGAR EM").negrito(false);
    for (const l of quebrar(`${e.rua ?? ""}, ${e.numero ?? ""}`.trim(), largura)) via.linha(l);
    if (e.bairro) for (const l of quebrar(e.bairro, largura)) via.linha(l);
    if (e.complemento) for (const l of quebrar(e.complemento, largura)) via.linha(l);
    if (e.referencia) for (const l of quebrar(`Ref.: ${e.referencia}`, largura)) via.linha(l);
  }

  // o que o cliente escreveu, em negrito: é o que mais se esquece
  if (dados.observacao) {
    via.separador(largura).negrito(true).linha("OBSERVAÇÃO DO PEDIDO");
    for (const l of quebrar(dados.observacao, largura)) via.linha(l);
    via.negrito(false);
  }

  return via.cortar().paraBuffer();
}

/** via de teste, para conferir a impressora antes do primeiro pedido */
export function testeEscPos(restaurante, papel = 80) {
  const largura = papel === 58 ? 32 : 48;
  const via = new Via();
  via.alinhar(1).tamanho(1).negrito(true).linha("MENU FACIL").negrito(false);
  via.linha("via de teste").alinhar(0).separador(largura, true);
  via.linha(`Restaurante: ${restaurante ?? "ainda não conectado"}`);
  via.linha(`Papel: ${papel} mm (${largura} colunas)`);
  via.linha(`Data: ${new Date().toLocaleString("pt-BR")}`);
  via.separador(largura);
  via.negrito(true).linha("Negrito funcionando").negrito(false);
  via.linha("Acentos: ação, café, pão, José");
  via.separador(largura, true);
  via.alinhar(1).linha("Se leu tudo isso, está pronto.").alinhar(0);
  return via.cortar().paraBuffer();
}
