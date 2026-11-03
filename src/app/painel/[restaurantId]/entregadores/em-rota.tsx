import { AlertTriangle, Bike, Clock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import type { EmRota } from "@/server/entregadores/lista";

import { darPedidoA } from "./actions";

// O que está na rua agora, visto do balcão.
//
// Mora aqui, e não na tela de Pedidos: lá o assunto é o pedido andando da
// cozinha para a porta, e quem leva é outra pergunta. Aqui o balcão
// responde a ela -- inclusive dando o pedido na mão de alguém, quando
// ninguém pegou.

const MOTIVO: Record<string, string> = {
  CLIENTE_NAO_ENCONTRADO: "Cliente não encontrado",
  ENDERECO_INCORRETO: "Endereço incorreto",
  CLIENTE_NAO_ATENDE: "Cliente não atende",
  PROBLEMA_COM_PEDIDO: "Problema com o pedido",
  OUTRO: "Outro motivo",
};

export function PedidosEmRota({
  pedidos,
  equipe,
  restaurantId,
  base,
}: {
  pedidos: EmRota[];
  /** os ativos, que podem receber um pedido na mão */
  equipe: { id: string; nome: string }[];
  restaurantId: string;
  base: string;
}) {
  if (pedidos.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Na rua agora ({pedidos.length})</h2>

      <ul className="flex flex-col gap-2">
        {pedidos.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href={`${base}/${p.id}`} className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-extrabold tabular-nums">#{p.number}</span>
                  {p.entregador ? (
                    <Badge tone="success">
                      <Bike className="size-3.5" aria-hidden="true" />
                      {p.entregador.nome.split(" ")[0]}
                    </Badge>
                  ) : (
                    <Badge tone="warning">Sem entregador</Badge>
                  )}
                </span>
                <span className="block truncate text-sm text-muted">
                  {p.customerName}
                  {p.bairro ? ` · ${p.bairro}` : ""}
                </span>
              </Link>

              <span className="flex items-center gap-1.5 text-sm text-muted tabular-nums">
                <Clock className="size-4" aria-hidden="true" />
                desde {formatTime(p.desde)}
              </span>
            </div>

            {/* o problema que o entregador contou da porta do cliente */}
            {p.ocorrencias.map((o, i) => (
              <p key={i} className="flex items-start gap-2 rounded-control border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>
                  <span className="font-bold text-warning">{MOTIVO[o.motivo] ?? o.motivo}</span>
                  {o.descricao ? ` — ${o.descricao}` : ""}
                  <span className="block text-xs text-faint tabular-nums">às {formatTime(o.quando)}</span>
                </span>
              </p>
            ))}

            {equipe.length > 0 && (
              <form action={darPedidoA} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="orderId" value={p.id} />
                <label htmlFor={`e-${p.id}`} className="text-sm font-bold text-muted">
                  {p.entregador ? "Passar para" : "Dar para"}
                </label>
                <select
                  id={`e-${p.id}`}
                  name="entregadorId"
                  defaultValue={p.entregador?.id ?? ""}
                  className="h-10 rounded-control border border-line bg-surface px-3 text-sm font-semibold"
                >
                  <option value="">Ninguém (volta para a fila)</option>
                  {equipe.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
                <button type="submit" className="h-10 rounded-control border border-line px-3.5 text-sm font-bold text-muted hover:text-ink">
                  Salvar
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
