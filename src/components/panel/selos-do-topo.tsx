"use client";

import { useActionState, useEffect, useReducer, useState, useTransition } from "react";

import type { OpenMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { isOpenNow, type OpeningHourData } from "@/lib/opening-hours";

// Os dois selos do alto do painel, que agora também são interruptores.
//
// Até 15/11/2026 eles só mostravam o estado e levavam à tela onde se
// mexia nele. Ele pediu para ligar e desligar dali mesmo: o selo está em
// todas as telas, e abrir a casa não devia exigir voltar à Visão geral.
//
// Ligar é um toque. Desligar pede um segundo toque no próprio selo: ele
// fica no canto de toda tela, e fechar o restaurante (ou calar a IA) por
// um esbarrão, no meio do movimento, custa pedido. A pergunta some
// sozinha em poucos segundos se ninguém confirmar.

const selo = "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition-colors disabled:opacity-60";

/** a pergunta "tem certeza?" que se desfaz sozinha */
function useConfirmacao() {
  const [perguntando, setPerguntando] = useState(false);
  useEffect(() => {
    if (!perguntando) return;
    const t = setTimeout(() => setPerguntando(false), 4000);
    return () => clearTimeout(t);
  }, [perguntando]);
  return [perguntando, setPerguntando] as const;
}

/**
 * Aberto ou fechado, e o botão de trocar.
 *
 * Tocar abre ou fecha "agora", que é o modo manual: a casa fica assim até
 * alguém tocar de novo ou escolher "Seguir horário" na Visão geral.
 */
export function SeloAbertoFechado({
  restaurantId,
  openMode,
  hours,
  mudar,
}: {
  restaurantId: string;
  openMode: OpenMode;
  hours: OpeningHourData[];
  /** a ação do servidor que grava o modo (a mesma dos botões da Visão geral) */
  mudar: (dados: FormData) => Promise<void>;
}) {
  // o relógio anda: com "seguir horário", o selo vira sozinho na hora de abrir
  const [, passouUmMinuto] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const timer = setInterval(passouUmMinuto, 60_000);
    return () => clearInterval(timer);
  }, []);

  const [perguntando, setPerguntando] = useConfirmacao();
  const [mudando, comecar] = useTransition();
  const aberto = isOpenNow(openMode, hours);

  function trocar() {
    if (aberto && !perguntando) {
      setPerguntando(true);
      return;
    }
    setPerguntando(false);
    const dados = new FormData();
    dados.set("restaurantId", restaurantId);
    dados.set("openMode", aberto ? "CLOSED" : "OPEN");
    comecar(() => mudar(dados));
  }

  return (
    <button
      type="button"
      onClick={trocar}
      disabled={mudando}
      title={aberto ? "Toque para fechar o restaurante agora" : "Toque para abrir o restaurante agora"}
      className={cn(
        selo,
        perguntando
          ? "border-danger-line bg-danger-soft text-danger-ink"
          : aberto
            ? "border-success/40 bg-success/10 text-success"
            : "border-line bg-surface-2 text-muted hover:text-ink",
      )}
    >
      <span className={cn("size-2 rounded-full", perguntando ? "bg-danger" : aberto ? "bg-success" : "bg-faint")} aria-hidden="true" />
      {perguntando ? "Fechar agora?" : aberto ? "Aberto" : "Fechado"}
    </button>
  );
}

/**
 * A chave da IA, no alto.
 *
 * Verde é ela atendendo: ligada e com a casa aberta. Ligada com a casa
 * fechada fica cinza -- ela está muda, e verde seria mentira. Vermelha é
 * desligada. Tocar liga; para desligar, o segundo toque confirma.
 */
export function SeloDaIa({
  restaurantId,
  ligada,
  casaAberta,
  ligar,
}: {
  restaurantId: string;
  ligada: boolean;
  casaAberta: boolean;
  /** a mesma ação da chave que fica na tela da IA */
  ligar: (anterior: { error?: string; message?: string }, dados: FormData) => Promise<{ error?: string; message?: string }>;
}) {
  const [estado, acao, mudando] = useActionState(ligar, {});
  const [perguntando, setPerguntando] = useConfirmacao();
  const [, comecar] = useTransition();

  function trocar() {
    if (ligada && !perguntando) {
      setPerguntando(true);
      return;
    }
    setPerguntando(false);
    const dados = new FormData();
    dados.set("restaurantId", restaurantId);
    dados.set("ligar", ligada ? "0" : "1");
    comecar(() => acao(dados));
  }

  const descricao = ligada
    ? casaAberta
      ? "A IA está atendendo. Toque para desligar"
      : "A IA está ligada e volta a atender quando o restaurante abrir. Toque para desligar"
    : "A IA está desligada. Toque para ligar";

  return (
    <span className="relative flex shrink-0">
      <button
        type="button"
        onClick={trocar}
        disabled={mudando}
        title={descricao}
        aria-label={descricao}
        className={cn(
          selo,
          "px-2.5",
          perguntando ? "border-danger-line bg-danger-soft text-danger-ink" : "border-line bg-surface-2 text-ink",
        )}
      >
        <span
          className={cn("size-2.5 rounded-full", perguntando ? "bg-danger" : ligada ? (casaAberta ? "bg-success" : "bg-faint") : "bg-danger")}
          aria-hidden="true"
        />
        {perguntando ? "Desligar a IA?" : "IA"}
      </button>
      {/* o motivo de não ter ligado (WhatsApp não conectado, por exemplo) */}
      {estado.error && !mudando && (
        <span
          role="alert"
          className="absolute top-full right-0 z-30 mt-2 w-60 rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-xs font-bold text-danger-ink shadow-lg"
        >
          {estado.error}
        </span>
      )}
    </span>
  );
}
