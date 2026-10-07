"use client";

import { Banknote, CreditCard, NotebookPen, QrCode, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { desfazerPagamento, receberPagamento, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { centsToInput, MoneyInput } from "@/components/ui/money-input";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { ComandaAberta } from "@/server/salao/comanda";
import type { FormaNaMesa } from "@/server/salao/pagamento";

// Receber a mesa.
//
// O campo de valor já vem com o que falta, porque é o que acontece em nove
// de cada dez mesas: a pessoa paga a conta inteira numa forma só. Quem está
// dividindo apaga e digita a parte -- e a folha fica aberta, mostrando o
// que sobrou, até a conta fechar.
//
// Os recebimentos ficam listados em cima: é a única forma de saber que a
// mesa pagou cinquenta no cartão e vinte em dinheiro depois de a tela ter
// sido fechada e aberta de novo.

const ICONE: Record<FormaNaMesa, typeof Banknote> = {
  DINHEIRO: Banknote,
  PIX: QrCode,
  CARTAO: CreditCard,
  ANOTADO: NotebookPen,
};

const ROTULO: { chave: FormaNaMesa; nome: string }[] = [
  { chave: "DINHEIRO", nome: "Dinheiro" },
  { chave: "PIX", nome: "Pix" },
  { chave: "CARTAO", nome: "Cartão" },
  { chave: "ANOTADO", nome: "Anotar" },
];

export function FolhaDoPagamento({
  comanda,
  restaurantId,
  podeDesfazer,
  onFechar,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  /** desfazer recebimento é a mesma confiança de finalizar a mesa */
  podeDesfazer: boolean;
  onFechar: () => void;
}) {
  const [forma, setForma] = useState<FormaNaMesa>("DINHEIRO");
  const [estado, receber, recebendo] = useActionState<SalaoFormState, FormData>(receberPagamento, {});
  const [desfeito, desfazer] = useActionState<SalaoFormState, FormData>(desfazerPagamento, {});

  // o campo volta a mostrar o que falta depois de cada recebimento: quem
  // está dividindo a conta digita a parte seguinte sem apagar nada
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  const [valor, setValor] = useState(centsToInput(comanda.faltaCents));
  if (estado.ok && estado.message !== ultimo) {
    setUltimo(estado.message);
    setValor(centsToInput(comanda.faltaCents));
  }

  const quitada = comanda.totalCents > 0 && comanda.faltaCents === 0;
  const aviso = estado.error ?? desfeito.error;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/60" />

      <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-card border border-line bg-surface sm:max-w-md sm:rounded-card">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">
              {comanda.tipo === "BALCAO" ? "Balcão" : "Mesa"} {comanda.numero}
            </h2>
            <p className="text-sm tabular-nums text-muted">
              Conta de {formatCents(comanda.totalCents)}
              {comanda.pagoCents > 0 ? " · " + formatCents(comanda.pagoCents) + " recebido" : ""}
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {comanda.pagamentos.length > 0 && (
            <ul className="mb-5 flex flex-col divide-y divide-line rounded-control border border-line">
              {comanda.pagamentos.map((p) => {
                const Icone = ICONE[p.forma];
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Icone className="size-4 shrink-0 text-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{p.nomeDaForma}</span>
                      {p.recebidoPor && <span className="block truncate text-xs text-muted">{p.recebidoPor}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatCents(p.centavos)}</span>
                    {podeDesfazer && (
                      <form action={desfazer} className="shrink-0">
                        <input type="hidden" name="restaurantId" value={restaurantId} />
                        <input type="hidden" name="pagamentoId" value={p.id} />
                        <button
                          type="submit"
                          aria-label={"Desfazer " + p.nomeDaForma}
                          className="grid size-8 place-items-center rounded-control text-faint hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {quitada ? (
            <p className="rounded-control bg-success/15 px-4 py-6 text-center font-bold text-success">Conta paga. Pode liberar a mesa.</p>
          ) : (
            <form action={receber} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="comandaId" value={comanda.id} />
              <input type="hidden" name="forma" value={forma} />

              <div className="grid grid-cols-2 gap-2">
                {ROTULO.map((f) => {
                  const Icone = ICONE[f.chave];
                  return (
                    <button
                      key={f.chave}
                      type="button"
                      onClick={() => setForma(f.chave)}
                      aria-pressed={forma === f.chave}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-control border font-bold transition-colors",
                        forma === f.chave ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
                      )}
                    >
                      <Icone className="size-4" aria-hidden="true" />
                      {f.nome}
                    </button>
                  );
                })}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold">
                  Valor <span className="font-semibold tabular-nums text-faint">· falta {formatCents(comanda.faltaCents)}</span>
                </span>
                <MoneyInput name="valor" value={valor} onChange={(e) => setValor(e.target.value)} />
              </label>

              {aviso && (
                <p className="rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
                  {aviso}
                </p>
              )}

              <button
                type="submit"
                disabled={recebendo || comanda.totalCents === 0}
                className="flex min-h-12 items-center justify-center rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
              >
                {recebendo ? "Lançando..." : forma === "ANOTADO" ? "Anotar" : "Receber"}
              </button>
            </form>
          )}

          {quitada && aviso && (
            <p className="mt-3 rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
              {aviso}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
