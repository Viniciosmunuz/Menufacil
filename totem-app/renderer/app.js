// A tela do totem.
//
// Ela não fala com o servidor nem com a impressora: pede tudo pela ponte
// window.totem (ver src/preload.cjs). O preço mostrado aqui é só para o
// cliente ver — quem soma de verdade é o servidor, na hora de cobrar.

const $ = (id) => document.getElementById(id);
const TELAS = [
  "tela-entrar",
  "tela-inicio",
  "tela-cardapio",
  "tela-item",
  "tela-carrinho",
  "tela-pix",
  "tela-pagamento",
  "tela-pronto",
  "tela-ajustes",
];

/** volta sozinho para a tela de descanso quando ninguém mexe */
const OCIOSO_MS = 90_000;
/** de quanto em quanto tempo perguntamos à maquininha */
const PASSO_DO_PAGAMENTO_MS = 2000;
/** desiste de esperar o cartão depois disto */
const LIMITE_DO_PAGAMENTO_MS = 5 * 60 * 1000;

const estado = {
  restaurante: null,
  categorias: [],
  categoriaAtual: null,
  carrinho: [],
  item: null,
  pagamentoId: null,
  /** "cartao" ou "pix": muda onde o recado aparece e o que ele diz */
  forma: null,
  relogioDoPagamento: null,
  ocioso: null,
};

const dinheiro = (centavos) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

function mostrar(id) {
  for (const tela of TELAS) $(tela).hidden = tela !== id;
  reiniciarOcioso(id);
}

// ---- volta para o descanso sozinho -------------------------------------

function reiniciarOcioso(telaAtual) {
  clearTimeout(estado.ocioso);
  // nas telas em que o cliente não está decidindo nada, não faz sentido
  const espera = ["tela-cardapio", "tela-item", "tela-carrinho"].includes(telaAtual);
  if (!espera) return;
  estado.ocioso = setTimeout(() => {
    estado.carrinho = [];
    mostrar("tela-inicio");
  }, OCIOSO_MS);
}

document.addEventListener("pointerdown", () => {
  const aberta = TELAS.find((t) => !$(t).hidden);
  if (aberta) reiniciarOcioso(aberta);
});

// ---- entrar -------------------------------------------------------------

async function comecar() {
  const info = await window.totem.estado();
  $("servidor").value = info.servidor;
  $("ajustes-info").textContent = `Versão ${info.versao} · ${info.restaurante?.nome ?? "sem restaurante"} · impressora: ${info.impressora ?? "não escolhida"}`;

  if (!info.pareado) {
    mostrar("tela-entrar");
    return;
  }
  estado.restaurante = info.restaurante;
  await carregarCardapio();
}

$("botao-entrar").addEventListener("click", async () => {
  const botao = $("botao-entrar");
  botao.disabled = true;
  $("erro-entrar").textContent = "";

  const escolhido = $("escolha-restaurante").hidden ? null : $("restaurante").value;
  const resposta = await window.totem.entrar({
    email: $("email").value.trim(),
    senha: $("senha").value,
    restauranteId: escolhido,
  });
  botao.disabled = false;

  if (resposta.escolha) {
    $("escolha-restaurante").hidden = false;
    $("restaurante").innerHTML = resposta.escolha.map((r) => `<option value="${r.id}">${r.nome}</option>`).join("");
    $("erro-entrar").textContent = "Escolha o restaurante e entre de novo.";
    return;
  }
  if (resposta.erro) {
    $("erro-entrar").textContent = resposta.erro;
    return;
  }

  $("senha").value = "";
  estado.restaurante = resposta.restaurante;
  await carregarCardapio();
});

$("botao-parear").addEventListener("click", async () => {
  $("erro-entrar").textContent = "";
  const resposta = await window.totem.parear($("codigo").value.trim());
  if (resposta.erro) {
    $("erro-entrar").textContent = resposta.erro;
    return;
  }
  estado.restaurante = resposta.restaurante;
  await carregarCardapio();
});

$("botao-servidor").addEventListener("click", async () => {
  const resposta = await window.totem.servidor($("servidor").value);
  $("erro-entrar").textContent = resposta.erro ?? "Endereço salvo.";
});

// ---- cardápio -----------------------------------------------------------

async function carregarCardapio() {
  const dados = await window.totem.cardapio();
  if (dados.erro) {
    $("erro-entrar").textContent = dados.erro;
    mostrar("tela-entrar");
    return;
  }

  estado.restaurante = dados.restaurante;
  estado.categorias = dados.categorias;
  estado.categoriaAtual = dados.categorias[0]?.id ?? null;

  $("nome-do-restaurante").textContent = dados.restaurante.nome;
  $("aviso-fechado").hidden = dados.restaurante.aberto;
  $("botao-comecar").disabled = !dados.restaurante.aberto;

  desenharCategorias();
  mostrar("tela-inicio");
}

function desenharCategorias() {
  const nav = $("categorias");
  nav.innerHTML = "";
  for (const categoria of estado.categorias) {
    const botao = document.createElement("button");
    botao.textContent = categoria.nome;
    botao.setAttribute("aria-current", String(categoria.id === estado.categoriaAtual));
    botao.addEventListener("click", () => {
      estado.categoriaAtual = categoria.id;
      desenharCategorias();
      desenharProdutos();
    });
    nav.appendChild(botao);
  }
  desenharProdutos();
}

function desenharProdutos() {
  const alvo = $("produtos");
  alvo.innerHTML = "";
  const categoria = estado.categorias.find((c) => c.id === estado.categoriaAtual);
  for (const produto of categoria?.produtos ?? []) {
    const botao = document.createElement("button");
    botao.className = "produto";
    const nome = document.createElement("span");
    nome.className = "nome";
    nome.textContent = produto.nome;
    const preco = document.createElement("span");
    preco.className = "preco";
    preco.textContent = dinheiro(produto.preco_centavos);
    botao.append(nome, preco);
    if (produto.descricao) {
      const desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = produto.descricao;
      botao.appendChild(desc);
    }
    botao.addEventListener("click", () => abrirItem(produto));
    alvo.appendChild(botao);
  }
}

$("botao-comecar").addEventListener("click", () => mostrar("tela-cardapio"));
$("voltar-inicio").addEventListener("click", () => {
  estado.carrinho = [];
  atualizarBarra();
  mostrar("tela-inicio");
});

// ---- item ---------------------------------------------------------------

function abrirItem(produto) {
  estado.item = { produto, quantidade: 1 };
  $("item-nome").textContent = produto.nome;
  $("item-descricao").textContent = produto.descricao ?? "";
  $("item-obs").value = "";
  $("item-qtd").textContent = "1";
  $("erro-item").textContent = "";

  const alvo = $("item-grupos");
  alvo.innerHTML = "";
  for (const grupo of produto.grupos) {
    const bloco = document.createElement("div");
    bloco.className = "grupo";
    const titulo = document.createElement("h3");
    const obrigatorio = grupo.minimo > 0 ? " (obrigatório)" : "";
    titulo.textContent = `${grupo.nome}${obrigatorio}`;
    bloco.appendChild(titulo);

    const unico = grupo.maximo === 1;
    for (const opcao of grupo.opcoes) {
      const linha = document.createElement("label");
      linha.className = "opcao";
      const campo = document.createElement("input");
      campo.type = unico ? "radio" : "checkbox";
      campo.name = `grupo-${grupo.id}`;
      campo.value = opcao.id;
      campo.dataset.grupo = grupo.id;
      const texto = document.createElement("span");
      texto.textContent = opcao.preco_centavos > 0 ? `${opcao.nome} · +${dinheiro(opcao.preco_centavos)}` : opcao.nome;
      linha.append(campo, texto);
      bloco.appendChild(linha);
    }
    alvo.appendChild(bloco);
  }

  mostrar("tela-item");
}

$("mais").addEventListener("click", () => {
  estado.item.quantidade = Math.min(20, estado.item.quantidade + 1);
  $("item-qtd").textContent = String(estado.item.quantidade);
});

$("menos").addEventListener("click", () => {
  estado.item.quantidade = Math.max(1, estado.item.quantidade - 1);
  $("item-qtd").textContent = String(estado.item.quantidade);
});

$("item-cancelar").addEventListener("click", () => mostrar("tela-cardapio"));

$("item-adicionar").addEventListener("click", () => {
  const { produto, quantidade } = estado.item;
  const marcadas = [...$("item-grupos").querySelectorAll("input:checked")];
  const optionIds = marcadas.map((c) => c.value);

  // o mínimo de cada grupo é conferido de novo no servidor; aqui é só para
  // o cliente não chegar na maquininha e voltar
  for (const grupo of produto.grupos) {
    const nesteGrupo = marcadas.filter((c) => c.dataset.grupo === grupo.id).length;
    if (nesteGrupo < grupo.minimo) {
      $("erro-item").textContent = `Escolha ${grupo.minimo} em "${grupo.nome}".`;
      return;
    }
    if (grupo.maximo > 0 && nesteGrupo > grupo.maximo) {
      $("erro-item").textContent = `Em "${grupo.nome}" dá para escolher no máximo ${grupo.maximo}.`;
      return;
    }
  }

  const escolhidas = produto.grupos
    .flatMap((g) => g.opcoes)
    .filter((o) => optionIds.includes(o.id));
  const unitario = produto.preco_centavos + escolhidas.reduce((soma, o) => soma + o.preco_centavos, 0);

  estado.carrinho.push({
    productId: produto.id,
    nome: produto.nome,
    quantity: quantidade,
    optionIds,
    escolhas: escolhidas.map((o) => o.nome).join(" · "),
    notes: $("item-obs").value.trim(),
    totalCents: unitario * quantidade,
  });

  atualizarBarra();
  mostrar("tela-cardapio");
});

// ---- carrinho -----------------------------------------------------------

const totalDoCarrinho = () => estado.carrinho.reduce((soma, i) => soma + i.totalCents, 0);

function atualizarBarra() {
  const itens = estado.carrinho.reduce((soma, i) => soma + i.quantity, 0);
  $("barra-carrinho").hidden = itens === 0;
  $("resumo-carrinho").textContent = `${itens} ${itens === 1 ? "item" : "itens"} · ${dinheiro(totalDoCarrinho())}`;
}

$("botao-carrinho").addEventListener("click", () => {
  desenharCarrinho();
  $("erro-carrinho").textContent = "";
  mostrar("tela-carrinho");
});

$("carrinho-voltar").addEventListener("click", () => mostrar("tela-cardapio"));

function desenharCarrinho() {
  const lista = $("lista-carrinho");
  lista.innerHTML = "";
  estado.carrinho.forEach((item, indice) => {
    const linha = document.createElement("li");
    const texto = document.createElement("span");
    texto.innerHTML = "";
    const titulo = document.createElement("strong");
    titulo.textContent = `${item.quantity}x ${item.nome}`;
    texto.appendChild(titulo);
    if (item.escolhas) {
      const e = document.createElement("span");
      e.className = "escolhas";
      e.textContent = item.escolhas;
      texto.appendChild(e);
    }
    if (item.notes) {
      const o = document.createElement("span");
      o.className = "obs";
      o.textContent = `Obs.: ${item.notes}`;
      texto.appendChild(o);
    }

    const direita = document.createElement("span");
    direita.textContent = dinheiro(item.totalCents);

    const tirar = document.createElement("button");
    tirar.textContent = "Tirar";
    tirar.addEventListener("click", () => {
      estado.carrinho.splice(indice, 1);
      atualizarBarra();
      if (estado.carrinho.length === 0) {
        mostrar("tela-cardapio");
        return;
      }
      desenharCarrinho();
    });

    linha.append(texto, direita, tirar);
    lista.appendChild(linha);
  });
  $("total-carrinho").textContent = dinheiro(totalDoCarrinho());
}

// ---- pagamento ----------------------------------------------------------

// Duas formas, e só essas duas. Dinheiro não existe no totem: não há quem
// receba nem quem dê troco num balcão sem atendente.
async function pagar(forma) {
  const botoes = [$("pagar-cartao"), $("pagar-pix")];
  for (const b of botoes) b.disabled = true;
  $("erro-carrinho").textContent = "";

  const resposta = await window.totem.cobrar({
    forma,
    nome: $("nome-cliente").value.trim(),
    observacao: null,
    itens: estado.carrinho.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      optionIds: i.optionIds,
      notes: i.notes || null,
    })),
  });
  for (const b of botoes) b.disabled = false;

  if (resposta.erro) {
    $("erro-carrinho").textContent = resposta.erro;
    return;
  }

  estado.pagamentoId = resposta.pagamento_id;
  estado.forma = forma;

  if (forma === "pix") {
    $("valor-do-pix").textContent = dinheiro(resposta.total_centavos);
    $("erro-pix").textContent = "";
    // a imagem vem pronta do Mercado Pago; sem ela, resta o copia e cola
    const imagem = resposta.pix?.imagem_base64;
    $("qr-do-pix").src = imagem ? `data:image/png;base64,${imagem}` : "";
    $("qr-do-pix").hidden = !imagem;
    if (!imagem) $("erro-pix").textContent = "Não consegui mostrar o código. Chame o atendente.";
    mostrar("tela-pix");
  } else {
    $("valor-a-pagar").textContent = dinheiro(resposta.total_centavos);
    $("erro-pagamento").textContent = "";
    mostrar("tela-pagamento");
  }

  acompanharPagamento(Date.now());
}

$("pagar-cartao").addEventListener("click", () => pagar("cartao"));
$("pagar-pix").addEventListener("click", () => pagar("pix"));

/** onde o recado aparece depende da forma que o cliente escolheu */
const ondeAvisar = () => (estado.forma === "pix" ? $("erro-pix") : $("erro-pagamento"));

function acompanharPagamento(comecouEm) {
  clearTimeout(estado.relogioDoPagamento);
  estado.relogioDoPagamento = setTimeout(async () => {
    if (!estado.pagamentoId) return;

    const resposta = await window.totem.conferirPagamento(estado.pagamentoId);
    const aviso = ondeAvisar();

    if (resposta.situacao === "aprovado") {
      await finalizar(resposta.pedido);
      return;
    }
    if (resposta.situacao === "cancelado" || resposta.situacao === "recusado") {
      aviso.textContent =
        resposta.situacao === "cancelado"
          ? "Pagamento cancelado."
          : estado.forma === "pix"
            ? "O Pix não foi aprovado. Tente de novo."
            : "O pagamento não foi aprovado. Tente outro cartão.";
      estado.pagamentoId = null;
      setTimeout(() => mostrar("tela-carrinho"), 2500);
      return;
    }
    if (resposta.situacao === "pago_sem_pedido") {
      aviso.textContent = "O pagamento passou, mas o pedido não entrou. Chame o atendente.";
      estado.pagamentoId = null;
      return;
    }

    if (Date.now() - comecouEm > LIMITE_DO_PAGAMENTO_MS) {
      aviso.textContent =
        estado.forma === "pix" ? "O código venceu. Comece o pedido de novo." : "A maquininha não respondeu. Chame o atendente.";
      estado.pagamentoId = null;
      return;
    }
    acompanharPagamento(comecouEm);
  }, PASSO_DO_PAGAMENTO_MS);
}

async function desistirDoPagamento() {
  if (!estado.pagamentoId) return;
  clearTimeout(estado.relogioDoPagamento);
  const resposta = await window.totem.cancelarPagamento(estado.pagamentoId);
  if (resposta.erro) {
    // já pagou enquanto o dedo ia no botão: volta a acompanhar
    ondeAvisar().textContent = resposta.erro;
    acompanharPagamento(Date.now());
    return;
  }
  estado.pagamentoId = null;
  mostrar("tela-carrinho");
}

$("pagamento-cancelar").addEventListener("click", desistirDoPagamento);
$("pix-cancelar").addEventListener("click", desistirDoPagamento);

async function finalizar(via) {
  estado.pagamentoId = null;
  estado.carrinho = [];
  atualizarBarra();

  $("numero-do-pedido").textContent = via?.numero != null ? `#${via.numero}` : "";
  mostrar("tela-pronto");

  // a comanda sai na impressora do totem; a da cozinha continua saindo
  // pela aba Pedidos do painel, sem este aplicativo precisar fazer nada
  if (via) await window.totem.imprimir(via);

  setTimeout(() => {
    if (!$("tela-pronto").hidden) mostrar("tela-inicio");
  }, 20_000);
}

$("pronto-voltar").addEventListener("click", () => mostrar("tela-cardapio"));

// ---- canto secreto e ajustes -------------------------------------------

let toques = [];
$("canto").addEventListener("click", async () => {
  const agora = Date.now();
  toques = [...toques.filter((t) => agora - t < 3000), agora];
  if (toques.length < 5) return;
  toques = [];

  const impressoras = await window.totem.impressoras();
  const info = await window.totem.estado();
  $("impressora").innerHTML = [
    '<option value="">Impressora padrão do Windows</option>',
    ...impressoras.map((i) => `<option value="${i.nome}"${i.nome === info.impressora ? " selected" : ""}>${i.nome}</option>`),
  ].join("");
  $("ajustes-info").textContent = `Versão ${info.versao} · ${info.restaurante?.nome ?? "sem restaurante"}`;
  $("recado-ajustes").textContent = "";
  mostrar("tela-ajustes");
});

$("impressora").addEventListener("change", async (evento) => {
  await window.totem.escolherImpressora(evento.target.value);
  $("recado-ajustes").textContent = "Impressora salva.";
});

$("botao-testar").addEventListener("click", async () => {
  const resposta = await window.totem.imprimirTeste();
  $("recado-ajustes").textContent = resposta.erro ?? `Via de teste enviada para ${resposta.impressora ?? "a impressora padrão"}.`;
});

$("botao-sair").addEventListener("click", async () => {
  const resposta = await window.totem.destravar($("senha-saida").value);
  $("senha-saida").value = "";
  if (resposta.erro) {
    $("recado-ajustes").textContent = resposta.erro;
    return;
  }
  $("recado-ajustes").textContent = "Fechando...";
});

$("ajustes-voltar").addEventListener("click", () => mostrar(estado.restaurante ? "tela-inicio" : "tela-entrar"));

comecar();
