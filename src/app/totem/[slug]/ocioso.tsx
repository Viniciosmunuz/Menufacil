"use client";

import { useEffect, useSyncExternalStore } from "react";

import { cartCount, clearCart, useCart } from "@/components/site/cart-store";

import { TotemDescanso } from "./descanso";

// O totem fica horas aberto na mesma tela. Três coisas dependem disso:
//
// 1. O cardápio precisa acompanhar o do dono. Esgotou um prato no painel às
//    11h, o balcão tem que parar de oferecer -- não adianta a tela ter
//    carregado às 8h e ficar parada no cardápio daquela hora.
// 2. O carrinho do cliente que desistiu não pode esperar o próximo cliente
//    com a comida do anterior dentro.
// 3. Tablet parado num cardápio pela metade não convida ninguém. Passado um
//    tempo sem toque, entra a tela de descanso, que é um cartaz dizendo
//    para fazer o pedido ali.
//
// As duas primeiras se resolvem juntas: passado um tempo sem ninguém tocar,
// o carrinho é esvaziado e a página é recarregada do servidor. Recarregar é
// de propósito mais forte que um refresh do Next -- garante foto, preço,
// esgotado e cardápio inteiro vindos do banco naquele instante.
//
// Enquanto o cliente está mexendo, nada acontece: cada toque zera a conta.
// E com comida na sacola o descanso não entra, mesmo com a tela parada --
// quem está escolhendo às vezes fica um tempão decidindo, e seria péssimo
// cobrir o cardápio dele com um cartaz.

/** com comida na sacola: tempo sem toque até o totem voltar ao começo */
const OCIOSO_MS = 90_000;
/** com a sacola vazia: tempo sem toque até entrar a tela de descanso */
const DESCANSO_MS = 60_000;
/** de quanto em quanto tempo o cardápio se renova por trás do descanso */
const RENOVA_MS = 5 * 60 * 1000;
/** de quanto em quanto tempo se pergunta ao servidor se o cardápio mudou */
const CONFERE_MS = 30_000;

/** lembra que o totem estava descansando quando a página se recarregou */
const CHAVE = "mf_totem_descanso";

// O estado do descanso mora fora do React, numa gaveta só dele.
//
// É por causa da renovação: de cinco em cinco minutos a página inteira se
// recarrega por trás do cartaz, e sem esta memória o cartaz piscaria para
// fora a cada recarga -- de madrugada, com ninguém no salão.

let descansando: boolean | null = null;
const ouvintes = new Set<() => void>();

function lerDescanso(): boolean {
  if (descansando === null) {
    try {
      // "?descanso=1" abre já no cartaz: serve para o dono conferir a arte
      // dele sem ter que esperar um minuto olhando para o tablet
      const forcado = new URLSearchParams(window.location.search).get("descanso") === "1";
      descansando = forcado || sessionStorage.getItem(CHAVE) === "1";
    } catch {
      // navegador sem armazenamento: só não emenda o descanso após recarregar
      descansando = false;
    }
  }
  return descansando;
}

function definirDescanso(valor: boolean) {
  descansando = valor;
  try {
    if (valor) sessionStorage.setItem(CHAVE, "1");
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // sem onde guardar: o descanso vale só até a próxima recarga
  }
  for (const avisar of ouvintes) avisar();
}

function assinarDescanso(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

export function TotemOcioso({
  href,
  slug,
  assinatura,
  nome,
  logoUrl,
}: {
  href: string;
  /** o restaurante, para perguntar ao servidor se o cardápio mudou */
  slug: string;
  /** a cara do cardápio no instante em que esta tela foi montada */
  assinatura: string;
  nome: string;
  logoUrl: string | null;
}) {
  const cart = useCart();
  const temItens = cartCount(cart) > 0;
  // no servidor nunca está descansando: o cartaz é coisa do tablet
  const dormindo = useSyncExternalStore(assinarDescanso, lerDescanso, () => false);

  // O cardápio mudou no painel? Então esta tela está velha.
  //
  // Esgotou um prato às 11h e o totem continuava oferecendo até se
  // recarregar sozinho -- o que podia levar minutos, e no pior caso o
  // cliente pedia o que não existe mais. Agora o totem pergunta de meio em
  // meio minuto se mudou alguma coisa, e se renova assim que ninguém
  // estiver no meio de um pedido.
  //
  // Com a sacola cheia, espera: recarregar derrubaria a escolha de quem
  // está ali decidindo. O servidor continua conferindo o esgotado na hora
  // de pagar, que é a trava que vale.
  useEffect(() => {
    if (!assinatura) return;
    let vivo = true;
    let mudou = false;

    const conferir = async () => {
      try {
        const r = await fetch(`/api/totem/cardapio?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!r.ok) return;
        const { assinatura: agora } = (await r.json()) as { assinatura?: string };
        if (agora && agora !== assinatura) mudou = true;
      } catch {
        // sem rede agora: pergunta de novo na próxima volta
      }
      // a tela só se renova com a sacola vazia; com comida nela, o cliente
      // está no meio de um pedido e a troca espera a vez dele acabar
      if (mudou && vivo && !temItens) window.location.reload();
    };

    const relogio = setInterval(conferir, CONFERE_MS);
    void conferir();
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [slug, assinatura, temItens]);

  useEffect(() => {
    let relogio: ReturnType<typeof setTimeout>;

    const recomecar = () => {
      // o carrinho é do cliente que foi embora: não fica para o próximo
      if (temItens) clearCart();
      window.location.href = href;
    };

    const renovar = () => {
      relogio = setTimeout(() => window.location.reload(), RENOVA_MS);
    };

    const dormir = () => {
      definirDescanso(true);
      // o cardápio se renova por trás do cartaz: quando alguém tocar, a tela
      // que aparece é a de agora, não a de três horas atrás
      renovar();
    };

    const armar = () => {
      clearTimeout(relogio);
      // já descansando, o contador fica com a renovação; derrubar o cartaz é
      // do toque na própria tela de descanso
      if (dormindo) return renovar();
      relogio = setTimeout(temItens ? recomecar : dormir, temItens ? OCIOSO_MS : DESCANSO_MS);
    };

    armar();
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const evento of eventos) window.addEventListener(evento, armar, { passive: true });

    return () => {
      clearTimeout(relogio);
      for (const evento of eventos) window.removeEventListener(evento, armar);
    };
  }, [href, temItens, dormindo]);

  if (!dormindo) return null;
  return <TotemDescanso nome={nome} logoUrl={logoUrl} aoTocar={() => definirDescanso(false)} />;
}
