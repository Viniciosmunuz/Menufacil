"use client";

import { useSyncExternalStore } from "react";

// Onde o site guarda que existe uma conversa aberta agora.
//
// A barra de baixo mora no layout e a conversa mora na página do pedido:
// as duas precisam falar sem uma ser filha da outra. É a mesma saída do
// carrinho (ver cart-store) -- um estadinho fora do React, que os dois lados
// leem pelo useSyncExternalStore.
//
// O conteúdo da conversa não passa por aqui. Quem desenha as mensagens é o
// servidor, na página do pedido; aqui fica só o necessário para a barra
// saber que o botão existe, quantas mensagens estão esperando, e se a folha
// está aberta.

export type EstadoDoChat = {
  /** há um pedido com conversa na tela */
  ativo: boolean;
  naoLidas: number;
  aberto: boolean;
};

const vazio: EstadoDoChat = { ativo: false, naoLidas: 0, aberto: false };
let estado: EstadoDoChat = vazio;
const ouvintes = new Set<() => void>();

function mudar(novo: EstadoDoChat) {
  if (novo.ativo === estado.ativo && novo.naoLidas === estado.naoLidas && novo.aberto === estado.aberto) return;
  estado = novo;
  for (const avisar of ouvintes) avisar();
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

const ler = () => estado;
/** no servidor nunca há conversa: a barra nasce igual para todo mundo */
const lerNoServidor = () => vazio;

/**
 * A página do pedido entrou: o botão passa a existir na barra.
 *
 * Separado de "quantas estão esperando" de propósito. As duas coisas
 * moravam na mesma função, chamada de novo a cada mudança no número de não
 * lidas -- e a limpeza do efeito, que roda antes de cada chamada nova,
 * zerava o estado inteiro. Era isso que fechava a conversa na cara de quem
 * estava esperando: chegava a resposta do restaurante, o número mudava, e o
 * "aberto" ia junto para o lixo.
 */
export function marcarChatAtivo() {
  mudar({ ...estado, ativo: true });
}

/** quantas mensagens do restaurante esperam o cliente */
export function definirNaoLidas(naoLidas: number) {
  mudar({ ...estado, naoLidas });
}

/** saiu da página do pedido: o botão some da barra */
export function esquecerChat() {
  mudar(vazio);
}

export function abrirChat() {
  mudar({ ...estado, aberto: true, naoLidas: 0 });
}

export function fecharChat() {
  mudar({ ...estado, aberto: false });
}

export function useChat() {
  return useSyncExternalStore(assinar, ler, lerNoServidor);
}
