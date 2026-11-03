import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCents, formatDateTime, formatTime } from "@/lib/format";
import { requireEntregador } from "@/server/auth/dal";
import { entregasFeitas } from "@/server/entregadores/entregas";

import { ListaVazia, Topo } from "../componentes";

export const metadata: Metadata = { title: "Histórico" };

// O que ele já entregou.
//
// Três janelas, e a de hoje primeiro: a pergunta do fim do expediente é
// "quantas eu fiz hoje", e a dos outros dias vem bem depois.

const JANELAS = [
  { chave: "hoje", nome: "Hoje", dias: 0 },
  { chave: "7", nome: "7 dias", dias: 7 },
  { chave: "30", nome: "30 dias", dias: 30 },
] as const;

export default async function HistoricoPage({ params, searchParams }: PageProps<"/entregador/[restaurantId]/historico">) {
  const { restaurantId } = await params;
  const { entregador, restaurant } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  const escolha = String((await searchParams).janela ?? "hoje");
  const janela = JANELAS.find((j) => j.chave === escolha) ?? JANELAS[0];

  const agora = new Date();
  const desde =
    janela.dias === 0
      ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
      : new Date(agora.getTime() - janela.dias * 24 * 60 * 60 * 1000);

  const feitas = await entregasFeitas(restaurant.id, entregador.id, desde);
  const entregues = feitas.filter((p) => p.status === "COMPLETED");
  const total = entregues.reduce((soma, p) => soma + p.totalCents, 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <Topo titulo="Histórico" />

      <nav className="flex gap-2 pb-4" aria-label="Período">
        {JANELAS.map((j) => (
          <Link
            key={j.chave}
            href={`${base}/historico?janela=${j.chave}`}
            aria-current={j.chave === janela.chave ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold",
              j.chave === janela.chave ? "border-brand bg-brand-soft text-brand" : "border-line text-muted",
            )}
          >
            {j.nome}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 pb-6">
        {feitas.length === 0 ? (
          <ListaVazia titulo="Nada neste período">Assim que você confirmar uma entrega, ela entra aqui.</ListaVazia>
        ) : (
          <>
            <p className="text-sm text-muted">
              <span className="font-extrabold text-ink tabular-nums">{entregues.length}</span>{" "}
              {entregues.length === 1 ? "entrega concluída" : "entregas concluídas"} ·{" "}
              <span className="tabular-nums">{formatCents(total)}</span> em pedidos
            </p>

            <ul className="flex flex-col gap-2">
              {feitas.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-extrabold tabular-nums">#{p.number}</span>
                      {p.status === "CANCELED" ? <Badge tone="neutral">Cancelado</Badge> : <Badge tone="success">Entregue</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">{p.customerName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-extrabold tabular-nums">{formatCents(p.totalCents)}</span>
                    <span className="block text-xs text-faint tabular-nums">
                      {janela.dias === 0 ? formatTime(p.updatedAt) : formatDateTime(p.updatedAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <EntregadorNav base={base} />
    </main>
  );
}
