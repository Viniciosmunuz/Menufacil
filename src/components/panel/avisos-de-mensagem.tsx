"use client";

import { MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { buttonClasses } from "@/components/ui/button";
import { CHOICE_KEY, SOUND_KEY, idList, playSound, read, remember, somEscolhido, useStored } from "@/lib/aviso-local";

// A mensagem do cliente sobe no canto, como o pedido novo.
//
// No 100% Delivery a conversa faz o papel que o WhatsApp fazia: o cliente
// escreve "estou na portaria", "pode trocar a coca por guaraná", e isso
// precisa chegar ao balcão. A tela já se atualizava sozinha -- o canal ao
// vivo sempre trouxe a conversa --, mas a novidade aparecia só como um
// numerozinho dentro da linha do pedido, e quem está fritando batata não
// olha para numerozinho.
//
// Menor que o aviso de pedido de propósito: pedido novo é dinheiro parado
// esperando um toque, mensagem é um recado. Mesma altura de voz faria o
// balcão tratar os dois com a mesma pressa -- ou ignorar os dois.
//
// O som é o mesmo do pedido, e isso é decisão, não economia: no balcão
// aquele sino já quer dizer "olha a tela". Um segundo som precisaria ser
// aprendido, e enquanto não fosse, seria ruído.

const VISTAS_KEY = "mf_mensagens_vistas";

export type MensagemNova = {
  /** o que identifica esta novidade: muda quando chega outra mensagem */
  chave: string;
  orderId: string;
  number: number;
  cliente: string;
  texto: string;
  quantas: number;
};

export function AvisosDeMensagem({ mensagens, base }: { mensagens: MensagemNova[]; base: string }) {
  const salvas = useStored(VISTAS_KEY);
  const som = useStored(SOUND_KEY) === "1";
  const escolha = somEscolhido(useStored(CHOICE_KEY));

  // o que já estava esperando quando esta tela abriu não vira aviso: abrir
  // o painel de manhã despejaria no canto os recados da noite inteira, e o
  // sino tocaria para conversa que alguém já resolveu pelo telefone
  const aoAbrir = useRef(mensagens);

  useEffect(() => {
    // o que já estava esperando quando esta tela abriu não vira aviso:
    // senão, abrir o painel de manhã despejaria no canto os recados da
    // noite inteira, com o sino tocando para conversa que alguém já
    // resolveu pelo telefone
    remember(
      VISTAS_KEY,
      aoAbrir.current.map((m) => m.chave),
      read(VISTAS_KEY),
    );
  }, []);

  // Antes de o aparelho responder o que já foi visto, nada é novidade.
  //
  // O primeiro render acontece no servidor e na hidratação, quando o
  // armazenamento ainda não foi lido: tratar isso como "nunca vi nada"
  // faria o sino tocar uma vez a cada vez que a tela abrisse. Guardar os
  // vistos repinta sozinho, e o render seguinte já sai com a conta certa.
  const vistas = idList(salvas);
  const novas = salvas === null ? [] : mensagens.filter((m) => !vistas.includes(m.chave));

  useEffect(() => {
    if (novas.length === 0 || !som) return;
    void playSound(escolha).catch(() => {});
    // a chave muda quando chega outra mensagem: é o que faz o sino tocar de
    // novo para um recado novo, e não a cada atualização da mesma conversa
  }, [novas.length, som, escolha]);

  if (novas.length === 0) return null;

  const dispensar = (chaves: string[]) => remember(VISTAS_KEY, chaves, read(VISTAS_KEY));

  return (
    <>
      {novas.slice(0, 2).map((m) => (
        <div key={m.chave} className="flex flex-col gap-1.5 rounded-card border border-line-strong bg-surface p-3 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <MessageSquare className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {m.cliente} · #{m.number}
            </span>
            <Link
              href={base + "/" + m.orderId + "#conversa"}
              onClick={() => dispensar([m.chave])}
              className={buttonClasses("primary", "sm")}
            >
              Responder
            </Link>
            <button
              type="button"
              onClick={() => dispensar([m.chave])}
              aria-label={"Dispensar o aviso da mensagem de " + m.cliente}
              className="grid size-8 shrink-0 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* o recado ganha a linha inteira: espremido ao lado do botão ele
              cabia em quatro palavras, e quatro palavras obrigam a abrir a
              conversa só para saber se era "estou na portaria" ou "obrigado" */}
          <p className="truncate pl-9 text-sm text-muted">
            {m.quantas > 1 && <span className="font-bold text-brand">{m.quantas} novas · </span>}
            {m.texto}
          </p>
        </div>
      ))}

      {novas.length > 2 && (
        <button
          type="button"
          onClick={() => dispensar(novas.map((m) => m.chave))}
          className="rounded-card border border-line bg-surface px-4 py-2 text-center text-sm font-bold text-muted shadow-xl hover:text-ink"
        >
          e mais {novas.length - 2} {novas.length - 2 === 1 ? "conversa esperando" : "conversas esperando"}
        </button>
      )}
    </>
  );
}
