import { MapPin, Navigation, Phone } from "lucide-react";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { buttonClasses } from "@/components/ui/button";
import { formatCents, formatPhone } from "@/lib/format";
import { enderecoEmLinha, linkDaRota, type PedidoDoEntregador } from "@/server/entregadores/entregas";

import { NaMinhaMao } from "./pedido/[orderId]/acoes";
import { ChaveDeDisponibilidade } from "./disponibilidade";
import { MapaDoEntregador } from "./mapa";
import { MandaPosicao } from "./posicao";

// A tela de quem está com uma entrega na mão.
//
// Aqui o mapa é o chão, e não um cartão no meio de uma lista: é assim que
// um aplicativo de corrida mostra uma viagem em andamento, e é o que
// responde à única pergunta de quem está com a moto ligada -- para onde eu
// vou. O resto flutua por cima, no pé da tela, no alcance do polegar.
//
// Sem entrega na mão esta tela não aparece: aí o que importa é o que há
// para pegar, e isso é lista.

export function TelaEmRota({
  pedido,
  destino,
  base,
  disponibilidade,
}: {
  pedido: PedidoDoEntregador;
  destino: { lat: number; lng: number } | null;
  base: string;
  disponibilidade: "DISPONIVEL" | "INDISPONIVEL" | "PAUSA";
}) {
  const endereco = enderecoEmLinha(pedido);

  return (
    <main className="relative h-dvh overflow-hidden">
      <AutoRefresh seconds={30} />
      <MandaPosicao ativo />

      {/* o mapa é o fundo da tela inteira */}
      <MapaDoEntregador destino={destino} rota={linkDaRota(endereco, pedido.restaurant.city)} code={pedido.code} fundo />

      {/* em cima: só a identidade e o status, sem tapar o caminho */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-4">
        <span className="pointer-events-auto rounded-full bg-bg/95 px-3.5 py-2 text-sm font-extrabold shadow-md">
          Pedido #{pedido.number}
        </span>
        <span className="pointer-events-auto">
          <ChaveDeDisponibilidade atual={disponibilidade} />
        </span>
      </div>

      {/* embaixo: para onde vai, com quem falar, e o que fazer */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 px-4 pb-2">
        <div className="flex flex-col gap-3 rounded-t-3xl border border-line bg-bg p-4 shadow-2xl shadow-black/40">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-extrabold">{endereco || "sem endereço no pedido"}</span>
              <span className="block text-sm text-muted">
                {pedido.customerName}
                {pedido.deliveryReference ? ` · ${pedido.deliveryReference}` : ""}
              </span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">{formatCents(pedido.totalCents)}</span>
          </p>

          <div className="flex gap-2">
            <a
              href={linkDaRota(endereco, pedido.restaurant.city)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "md", "flex-1")}
            >
              <Navigation className="size-4" aria-hidden="true" />
              Navegação
            </a>
            {pedido.customerWhatsapp && (
              <a href={`tel:+${pedido.customerWhatsapp}`} className={buttonClasses("secondary", "md")} aria-label="Ligar para o cliente">
                <Phone className="size-4" aria-hidden="true" />
                {formatPhone(pedido.customerWhatsapp)}
              </a>
            )}
          </div>

          <NaMinhaMao orderId={pedido.id} numero={pedido.number} />

          <a href={`${base}/pedido/${pedido.id}`} className="text-center text-sm font-bold text-muted">
            Ver o pedido inteiro
          </a>
        </div>

        <EntregadorNav base={base} />
      </div>
    </main>
  );
}
