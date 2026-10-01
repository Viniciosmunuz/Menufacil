"use client";

// Como o totem fala com o servidor para cobrar.
//
// São dois caminhos para a mesma coisa, e a tela não precisa saber qual
// está em uso:
//
// - **Tablet no navegador** (o caminho de hoje): o tablet guarda o token do
//   aparelho aqui mesmo, depois de ser pareado uma vez com o código que o
//   dono gera no painel. As chamadas saem do próprio navegador.
// - **Menu Fácil Totem no Windows** (o aplicativo antigo): o token fica
//   dentro do programa e nunca chega ao navegador; a página pede pela ponte
//   window.totemApp. Continua funcionando para quem já instalou.
//
// A diferença entre os dois é de onde vem o token, não o que ele faz.

const CHAVE = "mf_totem_aparelho";

export type AparelhoDoTotem = { token: string; restaurantId: string; restauranteNome?: string };

export function aparelho(): AparelhoDoTotem | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as AparelhoDoTotem;
    return dados?.token ? dados : null;
  } catch {
    // navegador sem armazenamento (aba anônima, dado bloqueado): sem token
    return null;
  }
}

export function guardarAparelho(dados: AparelhoDoTotem) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // sem onde guardar: o pareamento vale só enquanto a aba estiver aberta
  }
}

export function esquecerAparelho() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

/** o aplicativo do Windows, quando a página está rodando dentro dele */
type PonteDoApp = {
  cobrar: (p: unknown) => Promise<Record<string, unknown>>;
  conferirPagamento: (id: string) => Promise<Record<string, unknown>>;
  cancelarPagamento: (id: string) => Promise<Record<string, unknown>>;
  imprimir: (via: unknown) => Promise<Record<string, unknown>>;
};

declare global {
  interface Window {
    totemApp?: PonteDoApp;
  }
}

async function chamar(caminho: string, metodo: string, corpo?: unknown): Promise<Record<string, unknown>> {
  const dados = aparelho();
  if (!dados) return { erro: "Este tablet ainda não foi ativado. Chame um atendente." };

  try {
    const resposta = await fetch(caminho, {
      method: metodo,
      headers: { "content-type": "application/json", authorization: `Bearer ${dados.token}` },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await resposta.text();
    const json = (texto ? JSON.parse(texto) : {}) as Record<string, unknown>;

    // o dono desligou este totem no painel: o token não vale mais
    if (resposta.status === 401) {
      esquecerAparelho();
      return { erro: "Este tablet foi desligado do restaurante. Chame um atendente." };
    }
    return json;
  } catch {
    return { erro: "Sem conexão. Chame um atendente." };
  }
}

export type Ponte = {
  /** true quando quem cobra é o aplicativo do Windows */
  peloApp: boolean;
  cobrar: (pedido: unknown) => Promise<Record<string, unknown>>;
  conferirPagamento: (id: string) => Promise<Record<string, unknown>>;
  cancelarPagamento: (id: string) => Promise<Record<string, unknown>>;
  imprimir: (via: unknown) => Promise<Record<string, unknown>>;
};

export function ponte(): Ponte | null {
  if (typeof window === "undefined") return null;

  const app = window.totemApp;
  if (app) {
    return {
      peloApp: true,
      cobrar: (pedido) => app.cobrar(pedido),
      conferirPagamento: (id) => app.conferirPagamento(id),
      cancelarPagamento: (id) => app.cancelarPagamento(id),
      imprimir: (via) => app.imprimir(via),
    };
  }

  if (!aparelho()) return null;

  return {
    peloApp: false,
    cobrar: (pedido) => chamar("/api/totem/pagamento", "POST", pedido),
    conferirPagamento: (id) => chamar(`/api/totem/pagamento?id=${encodeURIComponent(id)}`, "GET"),
    cancelarPagamento: (id) => chamar(`/api/totem/pagamento?id=${encodeURIComponent(id)}`, "DELETE"),
    // No tablet quem imprime é o Menu Fácil Print, que pega o pedido na fila
    // do restaurante sozinho. A tela não tem o que fazer aqui.
    imprimir: async () => ({ ok: true }),
  };
}
