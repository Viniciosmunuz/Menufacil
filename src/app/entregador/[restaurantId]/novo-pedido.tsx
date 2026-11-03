"use client";

import { Bell, Bike } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { idList, remember, useStored } from "@/lib/aviso-local";

// O aviso de pedido novo, em tela cheia.
//
// Com o aplicativo aberto no bolso, um cartão no meio da lista passa
// batido: o entregador só olha a tela quando o celular vibra, e nessa hora
// ele quer saber uma coisa só -- tem entrega? Daí a tela inteira.
//
// Não é notificação: o aviso que apita com o celular guardado é o push,
// que já existe. Este é para quem está com a tela aberta e não viu o
// pedido entrar.
//
// O que já foi mostrado fica guardado no próprio aparelho, pelo mesmo
// caminho que o balcão usa para lembrar das vias impressas. Sem isso o
// aviso voltaria a cada atualização da tela -- de trinta em trinta
// segundos --, e em cinco minutos o entregador aprenderia a fechar sem ler.

const CHAVE = "mf_entregas_avisadas";

export type PedidoNovo = { id: string; numero: number; cliente: string; bairro: string | null; minha: boolean };

export function AvisoDePedidoNovo({ pedidos, base }: { pedidos: PedidoNovo[]; base: string }) {
  const guardado = useStored(CHAVE);
  const vistos = idList(guardado);
  // o primeiro que este aparelho ainda não mostrou
  const mostrar = pedidos.find((p) => !vistos.includes(p.id)) ?? null;

  if (!mostrar) return null;

  const marcarVisto = () => remember(CHAVE, [mostrar.id], guardado);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-6 bg-bg px-8 text-center">
      {/* o sino grande, com o halo pulsando: é o que se vê de relance */}
      <span className="relative grid size-32 place-items-center rounded-full bg-brand-soft text-brand">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" aria-hidden="true" />
        <Bell className="relative size-16" aria-hidden="true" />
      </span>

      <div>
        <h2 className="text-3xl font-extrabold">{mostrar.minha ? "Entrega sua!" : "Novo pedido!"}</h2>
        <p className="mt-2 text-muted">
          {mostrar.minha ? "O restaurante mandou esta entrega para você." : "Está livre: o primeiro que aceitar leva."}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
        <span className="flex items-center justify-center gap-2 text-lg font-extrabold tabular-nums">
          <Bike className="size-5 text-brand" aria-hidden="true" />
          Pedido #{mostrar.numero}
        </span>
        <span className="truncate font-bold">{mostrar.cliente}</span>
        {mostrar.bairro && <span className="text-sm text-muted">{mostrar.bairro}</span>}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link href={`${base}/pedido/${mostrar.id}`} onClick={marcarVisto} className={buttonClasses("primary", "lg", "w-full")}>
          Ver pedido
        </Link>
        <button type="button" onClick={marcarVisto} className="min-h-12 font-bold text-muted">
          Agora não
        </button>
      </div>
    </div>
  );
}
