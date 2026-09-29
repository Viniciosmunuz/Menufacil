import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { app, BrowserWindow, ipcMain, powerSaveBlocker } from "electron";

import { esquecerPareamento, gravarConfig, lerConfig } from "./config.js";
import { imprimirTeste, imprimirVia } from "./imprimir.js";
import { listarImpressoras } from "./windows.js";

// Menu Fácil Totem: o balcão de autoatendimento.
//
// O aplicativo abre travado em tela cheia e não deixa sair para o Windows.
// Quem precisa fechar digita a senha do painel, e quem confere a senha é o
// servidor -- senha guardada dentro de um programa instalado no balcão não
// é senha.
//
// Tudo o que fala com o MenuFácil passa por aqui, no processo principal: a
// tela nunca vê o token do aparelho.

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
      sandbox: true,
      spellcheck: false,
    },
  });

  janela.setMenuBarVisibility(false);
  janela.loadFile(join(aqui, "..", "renderer", "index.html"));

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

  // link externo nenhum abre: o totem só mostra o que está aqui dentro
  janela.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

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

// ---- o que a tela pode pedir -------------------------------------------

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
    corpo: { email, senha, nome: `Totem ${process.env.COMPUTERNAME || ""}`.trim(), versao: VERSAO, restaurante_id: restauranteId ?? null },
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

ipcMain.handle("totem:cardapio", async () => {
  const resposta = await chamar("/api/totem/cardapio");
  // token não vale mais (o dono desligou este totem no painel)
  if (resposta.status === 401) {
    esquecerPareamento();
    return { erro: "Este totem foi desligado do restaurante. Entre de novo." };
  }
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Não consegui carregar o cardápio." };
  return resposta.dados;
});

ipcMain.handle("totem:cobrar", async (_evento, { nome, itens, observacao }) => {
  const resposta = await chamar("/api/totem/pagamento", { metodo: "POST", corpo: { nome, itens, observacao } });
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Não consegui mandar a cobrança para a maquininha." };
  return resposta.dados;
});

ipcMain.handle("totem:conferirPagamento", async (_evento, pagamentoId) => {
  const resposta = await chamar(`/api/totem/pagamento?id=${encodeURIComponent(pagamentoId)}`);
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

ipcMain.handle("totem:destravar", async (_evento, senha) => {
  const resposta = await chamar("/api/totem/desbloquear", { metodo: "POST", corpo: { senha } });
  if (!resposta.ok) return { erro: resposta.dados.erro ?? "Senha incorreta." };

  podeFechar = true;
  // um respiro para a tela mostrar o "até logo" antes de sumir
  setTimeout(() => app.exit(0), 400);
  return { ok: true };
});
