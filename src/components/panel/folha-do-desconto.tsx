"use client";

import { X } from "lucide-react";
import { useActionState } from "react";

import { ajustarAConta, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { centsToInput, MoneyInput } from "@/components/ui/money-input";
import { formatCents } from "@/lib/format";
import type { ComandaAberta } from "@/server/salao/comanda";

// Desconto e acréscimo da mesa.
//
// Os dois na mesma folha porque são a mesma conversa: o que sai do total e
// o que entra. Desconto é o aniversariante, o freguês de sempre, o prato
// que voltou frio; acréscimo é a taxa de serviço, quando a casa cobra.
//
// São valores em reais, não porcentagem. "Dez por cento de quanto" é uma
// pergunta que muda enquanto a mesa pede mais coisa; "cinco reais" não.

export function FolhaDoDesconto({
  comanda,
  restaurantId,
  onFechar,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  onFechar: () => void;
}) {
  const [estado, salvar, salvando] = useActionState<SalaoFormState, FormData>(ajustarAConta, {});

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/60" />

      <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-card border border-line bg-surface sm:max-w-md sm:rounded-card">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">Ajustar a conta</h2>
            <p className="text-sm tabular-nums text-muted">Soma dos itens: {formatCents(comanda.subtotalCents)}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <form action={salvar} className="flex flex-col gap-4 px-4 py-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="comandaId" value={comanda.id} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">Desconto</span>
            <MoneyInput name="desconto" defaultValue={centsToInput(comanda.descontoCents)} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">
              Acréscimo <span className="font-semibold text-faint">· taxa de serviço</span>
            </span>
            <MoneyInput name="servico" defaultValue={centsToInput(comanda.servicoCents)} />
          </label>

          {(estado.error || estado.message) && (
            <p
              className={
                estado.error
                  ? "rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger"
                  : "rounded-control bg-success/15 px-3 py-2 text-sm font-bold text-success"
              }
              role="status"
            >
              {estado.error ?? estado.message}
            </p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="flex min-h-12 items-center justify-center rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
