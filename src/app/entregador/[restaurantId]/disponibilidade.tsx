"use client";

import { Check, ChevronDown, Circle, Moon, PauseCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { DisponibilidadeEntregador } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

import { mudarDisponibilidade } from "./actions";

// A chave de disponibilidade, no topo de todas as telas dele.
//
// Fica à vista de propósito: é a única coisa que o entregador precisa
// lembrar de mexer, e esquecer ligada é receber pedido no meio do almoço.
//
// Três estados, e não um liga-desliga: "em pausa" é diferente de
// "indisponível" para quem está no balcão olhando -- um volta daqui a
// pouco, o outro foi embora.
//
// Abre de baixo, como folha, e não como menuzinho pendurado: o polegar de
// quem segura o celular com uma mão só alcança o pé da tela, não o topo. E
// cada opção vira um alvo grande, que é o que se acerta na calçada.

const ESTADOS = [
  { chave: "DISPONIVEL", nome: "Disponível", resumo: "Você está recebendo pedidos.", icone: Circle, cor: "text-success", ponto: "bg-success" },
  { chave: "PAUSA", nome: "Em pausa", resumo: "Uma parada rápida. O balcão vê que você volta.", icone: PauseCircle, cor: "text-warning", ponto: "bg-warning" },
  { chave: "INDISPONIVEL", nome: "Indisponível", resumo: "Fora do ar. Não recebe pedido.", icone: Moon, cor: "text-muted", ponto: "bg-line-strong" },
] as const satisfies readonly {
  chave: DisponibilidadeEntregador;
  nome: string;
  resumo: string;
  icone: typeof Circle;
  cor: string;
  ponto: string;
}[];

export function ChaveDeDisponibilidade({ atual }: { atual: DisponibilidadeEntregador }) {
  const [aberto, setAberto] = useState(false);
  const escolhido = ESTADOS.find((e) => e.chave === atual) ?? ESTADOS[2];

  // com a folha aberta, a página atrás não rola junto
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoApertarEsc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoApertarEsc);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", aoApertarEsc);
    };
  }, [aberto]);

  return (
    <>
      {/* Branco sobre o laranja da faixa: o verde do "disponível" vira o
          pontinho, e não o fundo -- verde sobre laranja não se lê. */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-bg px-3.5 text-sm font-extrabold text-ink shadow-md shadow-black/10"
      >
        <span className={cn("size-2.5 rounded-full", escolhido.ponto)} aria-hidden="true" />
        {escolhido.nome}
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[2000] flex items-end" role="dialog" aria-modal="true" aria-label="Meu status">
          {/* o fundo escurece e fecha ao toque */}
          <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="absolute inset-0 bg-black/50" />

          <div className="relative w-full rounded-t-3xl bg-bg pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            {/* a alcinha de arrastar: ninguém arrasta, mas é ela que diz
                "isto sobe de baixo e dá para fechar" */}
            <div className="flex justify-center pt-3 pb-1">
              <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            </div>

            <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-3">
              <p className="text-lg font-extrabold">Meu status</p>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2 px-4 pb-4">
              {ESTADOS.map((e) => {
                const EIcone = e.icone;
                const aceso = e.chave === atual;
                return (
                  <form key={e.chave} action={mudarDisponibilidade} onSubmit={() => setAberto(false)}>
                    <input type="hidden" name="disponibilidade" value={e.chave} />
                    <button
                      type="submit"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                        aceso ? "border-brand bg-brand-soft" : "border-line bg-surface",
                      )}
                    >
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-bg shadow-sm", e.cor)}>
                        <EIcone className={cn("size-5", e.chave === "DISPONIVEL" && "fill-current")} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{e.nome}</span>
                        <span className="block text-sm text-muted">{e.resumo}</span>
                      </span>
                      {aceso && <Check className="size-6 shrink-0 text-brand" aria-hidden="true" />}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
