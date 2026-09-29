import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { app, BrowserWindow, ipcMain, powerSaveBlocker } from "electron";

import { esquecerPareamento, gravarConfig, lerConfig } from "./config.js";
import { imprimirTeste, imprimirVia } from "./imprimir.js";
import { listarImpressoras } from "./impressoras.js";

// Menu Fácil Totem: o balcão de autoatendimento.
//
// O aplicativo não tem cardápio próprio. Ele abre, em tela cheia e travada,
// o mesmo cardápio que o cliente vê pelo link do restaurante -- a página
// /totem/<slug> do MenuFácil. É por isso que o desenho é idêntico: não é
// parecido, é a mesma página. Mexer no cardápio muda os dois de uma vez.
//
// O que este programa faz, e o navegador não faria:
// - trava a tela (sem sair para o Windows, sem menu, sem atalhos);
// - guarda o token do aparelho e cobra na maquininha em nome do restaurante;
// - imprime a comanda na térmica USB ligada ao totem;
// - destrava com a senha do painel, conferida no servidor.

const aqui = dirname(fileURLToPath(import.meta.url));
const VERSAO = app.getVersion();

let janela = null;
let podeFechar = false;
let bloqueioDeDescanso = null;

/** o totem é uma máquina só: a segunda abertura traz a primeira para a frente */
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

app.on("second-instance", () => {
  if (janela) {
    janela.show();
    janela.focus();
  }
});

/** endereço do cardápio deste totem, no servidor configurado */
function enderecoDoCardapio() {
  const { servidor, restaurante } = lerConfig();
  if (!restaurante?.slug) return null;
  return `${String(servidor).replace(/\/+$/, "")}/totem/${restaurante.slug}`;
}

/** a tela local de entrar, usada só até o totem estar pareado */
const telaDeEntrada = () => join(aqui, "..", "renderer", "entrar.html");

function abrir() {
  const cardapio = enderecoDoCardapio();
  if (cardapio) return janela.loadURL(cardapio);
  return janela.loadFile(telaDeEntrada());
}

function criarJanela() {
  janela = new BrowserWindow({
    kiosk: true,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0e14",
    // a tela do Pipo X8 Pro é pequena: o mínimo é o tamanho dela
    minWidth: 800,
    minHeight: 480,
    webPreferences: {
      preload: join(aqui, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  janela.setMenuBarVisibility(false);
  abrir();

  // Nada de Alt+F4, Ctrl+W, F11, recarregar ou abrir o inspetor: o cliente
  // não pode sair da tela por engano, e ninguém pode sair de propósito.
  janela.webContents.on("before-input-event", (evento, entrada) => {
    const tecla = (entrada.key || "").toLowerCase();
    const atalho = entrada.control || entrada.alt || entrada.meta;
    const proibida =
      (entrada.alt && tecla === "f4") ||
      (entrada.control && ["w", "r", "n", "t", "q", "p"].includes(tecla)) ||
      ["f5", "f11", "f12"].includes(tecla) ||
      (atalho && tecla === "i");
    if (proibida) evento.preventDefault();
  });

  // fechar só depois da senha
  janela.on("close", (evento) => {
    if (!podeFechar) evento.preventDefault();
  });

  // o quiosque não pode perder o foco para uma janela do Windows
  janela.on("blur", () => {
    if (!podeFechar && janela) janela.focus();
  });

  // link externo nenhum abre: o totem fica no cardápio do restaurante dele
  janela.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // internet caiu no meio do expediente: tenta de novo em vez de ficar na
  // tela de erro do Chrome, que o cliente não sabe o que fazer com ela
  janela.webContents.on("did-fail-load", (_e, codigo, _descricao, url, principal) => {
    if (!principal || codigo === -3) return;
    janela.loadFile(join(aqui, "..", "renderer", "sem-internet.html"));
    setTimeout(() => {
      if (janela && !janela.isDestroyed()) janela.loadURL(url);
    }, 8000);
  });

  // a tela não apaga no meio do expediente
  bloqueioDeDescanso = powerSaveBlocker.start("prevent-display-sleep");
}

app.whenReady().then(criarJanela);

app.on("window-all-closed", () => {
  if (bloqueioDeDescanso !== null && powerSaveBlocker.isStarted(bloqueioDeDescanso)) {
    powerSaveBlocker.stop(bloqueioDeDescanso);
  }
  app.quit();
});

// ---- conversa com o servidor -------------------------------------------

function endereco(caminho) {
  const { servidor } = lerConfig();
  return `${String(servidor).replace(/\/+$/, "")}${caminho}`;
}

async function chamar(caminho, { metodo = "GET", corpo, comToken = true } = {}) {
  const { token } = lerConfig();
  if (comToken && !token) return { ok: false, status: 401, dados: { erro: "totem não pareado" } };

  try {
    const resposta = await fetch(endereco(caminho), {
      method: metodo,
      headers: {
        "content-type": "application/json",
        ...(comToken && token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await resposta.text();
    const dados = texto ? JSON.parse(texto) : {};
    return { ok: resposta.ok, status: resposta.status, dados };
  } catch {
    return { ok: false, status: 0, dados: { erro: "Sem conexão com o MenuFácil." } };
  }
}

// ---- entrar e parear (tela local) --------------------------------------

ipcMain.handle("totem:estado", () => {
  const { servidor, restaurante, impressora, token } = lerConfig();
  return { servidor, restaurante, impressora, pareado: Boolean(token), versao: VERSAO };
});

ipcMain.handle("totem:servidor", (_evento, servidor) => {
  const limpo = String(servidor ?? "").trim();
  if (!/^https?:\/\//.test(limpo)) return { erro: "O endereço precisa começar com https://" };
  gravarConfig({ servidor: limpo.replace(/\/+$/, "") });
  return { ok: true };
});

ipcMain.handle("totem:entrar", async (_evento, { email, senha, restauranteId }) => {
  const resposta = await chamar("/api/totem/login", {
    metodo: "POST",
    comToken: false,
    corpo: {
      email,
      senha,
      nome: `Totem ${process.env.COMPUTERNAME || ""}`.trim(),
      versao: VERSAO,
      restaurante_id: restauranteId ?? null,
    },
  });

  // 300: a conta tem mais de um restaurante, a tela pergunta qual
  if (resposta.status === 300) return { escolha: resposta.dados.escolha_restaurante };
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Não consegui entrar." };

  gravarConfig({ token: resposta.dados.token, restaurante: resposta.dados.restaurante });
  return { ok: true, restaurante: resposta.dados.restaurante };
});

ipcMain.handle("totem:parear", async (_evento, codigo) => {
  const resposta = await chamar("/api/totem/parear", {
    metodo: "POST",
    comToken: false,
    corpo: { codigo, nome: `Totem ${process.env.COMPUTERNAME || ""}`.trim(), versao: VERSAO },
  });
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Código não aceito." };

  gravarConfig({ token: resposta.dados.token, restaurante: resposta.dados.restaurante });
  return { ok: true, restaurante: resposta.dados.restaurante };
});

/** pareou: sai da tela local e abre o cardápio do restaurante */
ipcMain.handle("totem:abrirCardapio", () => {
  const endereco = enderecoDoCardapio();
  if (!endereco) return { erro: "Este totem ainda não está ligado a um restaurante." };
  janela.loadURL(endereco);
  return { ok: true };
});

// ---- cobrança (a página do cardápio pede, o token fica aqui) ------------

ipcMain.handle("totem:cobrar", async (_evento, pedido) => {
  const resposta = await chamar("/api/totem/pagamento", { metodo: "POST", corpo: pedido });
  if (resposta.status === 401) {
    // o dono desligou este totem no painel
    esquecerPareamento();
    return { erro: "Este totem foi desligado do restaurante. Chame um atendente." };
  }
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Não consegui começar a cobrança." };
  return resposta.dados;
});

ipcMain.handle("totem:conferirPagamento", async (_evento, pagamentoId) => {
  const resposta = await chamar(`/api/totem/pagamento?id=${encodeURIComponent(pagamentoId)}`);
  // 409 é o caso "pagou e o pedido não entrou": a resposta importa
  if (!resposta.ok && resposta.status !== 409) return { situacao: "esperando" };
  return resposta.dados;
});

ipcMain.handle("totem:cancelarPagamento", async (_evento, pagamentoId) => {
  const resposta = await chamar(`/api/totem/pagamento?id=${encodeURIComponent(pagamentoId)}`, { metodo: "DELETE" });
  return resposta.ok ? { ok: true } : { erro: resposta.dados.erro ?? "Não consegui cancelar." };
});

// ---- impressora ---------------------------------------------------------

ipcMain.handle("totem:impressoras", async () => {
  try {
    return await listarImpressoras();
  } catch {
    return [];
  }
});

ipcMain.handle("totem:escolherImpressora", (_evento, impressora) => {
  gravarConfig({ impressora: impressora || null });
  return { ok: true };
});

ipcMain.handle("totem:imprimir", async (_evento, via) => {
  const { impressora } = lerConfig();
  try {
    const usada = await imprimirVia(via, { impressora, escpos: true });
    return { ok: true, impressora: usada };
  } catch (erro) {
    return { erro: erro.message };
  }
});

ipcMain.handle("totem:imprimirTeste", async () => {
  const { impressora, restaurante } = lerConfig();
  try {
    const usada = await imprimirTeste({ impressora, restaurante: restaurante?.nome ?? null });
    return { ok: true, impressora: usada };
  } catch (erro) {
    return { erro: erro.message };
  }
});

// ---- sair do modo quiosque ---------------------------------------------
//
// Destravar e fechar são dois passos separados de propósito. Quem digitou a
// senha quase sempre quer mexer na impressora, não fechar o totem; se a
// senha fechasse na hora, o dono teria de abrir tudo de novo para trocar a
// bobina.

ipcMain.handle("totem:destravar", async (_evento, senha) => {
  // quem confere a senha é o servidor: senha guardada dentro de um programa
  // instalado no balcão não é senha
  const resposta = await chamar("/api/totem/desbloquear", { metodo: "POST", corpo: { senha } });
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Senha incorreta." };

  podeFechar = true;
  return { ok: true };
});

/** voltou ao atendimento: a trava volta a valer na hora */
ipcMain.handle("totem:travar", () => {
  podeFechar = false;
  return { ok: true };
});

ipcMain.handle("totem:fechar", () => {
  // sem a senha antes, este pedido não vale nada
  if (!podeFechar) return { erro: "Digite a senha do painel para fechar o totem." };
  setTimeout(() => app.exit(0), 300);
  return { ok: true };
});

/** desliga este totem do restaurante e volta para a tela de entrar */
ipcMain.handle("totem:desconectar", () => {
  if (!podeFechar) return { erro: "Digite a senha do painel primeiro." };
  esquecerPareamento();
  podeFechar = false;
  janela.loadFile(telaDeEntrada());
  return { ok: true };
});

/** volta ao cardápio depois dos ajustes */
ipcMain.handle("totem:recarregar", () => {
  podeFechar = false;
  abrir();
  return { ok: true };
});
