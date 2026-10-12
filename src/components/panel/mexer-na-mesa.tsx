"use client";

import { ArrowDownUp, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { apagarAComanda, moverOsItens, trocarAMesa, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { ComandaAberta } from "@/server/salao/comanda";
import type { MesaDestino } from "@/server/salao/mexer";

// Trocar a mesa de lugar e mandar item para outra mesa.
//
// As duas setas ficam ao lado do número da mesa, e só quando a mesa está
// aberta: é a mesa que vai mudar de lugar, e mesa sem comanda não tem o
// que mudar. Guardar isso num menu de configuração seria errado -- a
// decisão acontece de pé, com o cliente trocando de mesa na frente do
// garçom.
//
// Trocar leva a comanda inteira e exige mesa livre do outro lado. Mover
// itens aceita mesa ocupada: é o caso de duas pessoas da mesma turma em
// mesas diferentes, e o prato que foi lançado na conta errada.

export function MexerNaMesa({
  comanda,
  restaurantId,
  mesas,
  rotulo,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  mesas: MesaDestino[];
  /** "Mesa 7", para a folha dizer de onde sai */
  rotulo: string;
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [modo, setModo] = useState<"mesa" | "itens">("mesa");
  const [destino, setDestino] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [trocado, trocar] = useActionState<SalaoFormState, FormData>(trocarAMesa, {});
  const [movido, mover] = useActionState<SalaoFormState, FormData>(moverOsItens, {});

  // deu certo: a folha fecha, porque a página já voltou com a mesa nova
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  const resposta = trocado.ok ? trocado : movido.ok ? movido : null;
  if (resposta && resposta.message !== ultimo) {
    setUltimo(resposta.message);
    setAbrindo(false);
    setDestino(null);
    setMarcados([]);
  }

  const marcar = (id: string) => setMarcados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]));

  // trocar a comanda de lugar precisa de mesa livre; mover item, não
  const livres = mesas.filter((m) => !m.ocupada);
  const escolhas = modo === "mesa" ? livres : mesas;
  const erro = trocado.error ?? movido.error;

  if (!abrindo) {
    return (
      <button
        type="button"
        onClick={() => setAbrindo(true)}
        aria-label="Trocar a mesa de lugar ou mover itens"
        className="grid size-9 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink"
      >
        <ArrowDownUp className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-card border border-line bg-surface sm:rounded-card">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-lg font-extrabold">{rotulo}</h2>
          <button type="button" onClick={() => setAbrindo(false)} aria-label="Fechar" className="grid size-9 place-items-center rounded-control text-muted">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex gap-1 border-b border-line px-2">
          {(["mesa", "itens"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setModo(k);
                setDestino(null);
              }}
              aria-current={modo === k ? "page" : undefined}
              className={cn(
                "-mb-px flex-1 border-b-2 py-3 text-sm font-extrabold transition-colors",
                modo === k ? "border-brand text-ink" : "border-transparent text-muted",
              )}
            >
              {k === "mesa" ? "Trocar de mesa" : "Mover itens"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {modo === "itens" && (
            <>
              <p className="mb-2 text-sm text-muted">O que sai desta mesa:</p>
              {comanda.itens.length === 0 ? (
                <p className="py-6 text-center text-muted">Nada lançado ainda.</p>
              ) : (
                <ul className="mb-4 flex flex-col divide-y divide-line">
                  {comanda.itens.map((i) => {
                    const aceso = marcados.includes(i.id);
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => marcar(i.id)}
                          aria-pressed={aceso}
                          className="flex w-full items-center gap-3 py-2.5 text-left"
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded border text-xs font-extrabold",
                              aceso ? "border-brand bg-brand text-brand-ink" : "border-line-strong text-transparent",
                            )}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                              {i.quantidade}x {i.nome}
                            </span>
                            {i.opcoes && <span className="block truncate text-xs text-muted">{i.opcoes}</span>}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums">{formatCents(i.centavos)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          <p className="mb-2 text-sm text-muted">{modo === "mesa" ? "Para qual mesa:" : "Para onde vão:"}</p>
          {escolhas.length === 0 ? (
            <p className="py-6 text-center text-muted">
              {modo === "mesa" ? "Nenhuma mesa livre agora." : "Não há outra mesa no salão."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {escolhas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDestino(m.id)}
                  aria-pressed={destino === m.id}
                  className={cn(
                    "min-h-12 rounded-control border px-2 text-sm leading-tight font-bold transition-colors",
                    destino === m.id ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted",
                  )}
                >
                  {m.rotulo}
                  {m.ocupada && <span className="block text-[11px] font-bold text-warning">ocupada</span>}
                </button>
              ))}
            </div>
          )}

          {erro && (
            <p className="mt-3 rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
              {erro}
            </p>
          )}
        </div>

        <div className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {modo === "mesa" ? (
            <form action={trocar}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="comandaId" value={comanda.id} />
              <input type="hidden" name="mesaDestinoId" value={destino ?? ""} />
              <SubmitButton pendingText="Trocando..." className="w-full" disabled={!destino}>
                Trocar de mesa
              </SubmitButton>
            </form>
          ) : (
            <form action={mover}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="comandaId" value={comanda.id} />
              <input type="hidden" name="mesaDestinoId" value={destino ?? ""} />
              {marcados.map((id) => (
                <input key={id} type="hidden" name="itemId" value={id} />
              ))}
              <SubmitButton pendingText="Movendo..." className="w-full" disabled={!destino || marcados.length === 0}>
                {marcados.length <= 1 ? "Mover o item" : `Mover ${marcados.length} itens`}
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A lixeira da mesa: apaga a comanda inteira e devolve a mesa.
 *
 * Em dois toques, como tudo que não dá para desfazer. O aviso diz o que
 * vai embora junto -- os pagamentos lançados nesta conta --, porque é o
 * que ninguém espera e é o que faz falta no fechamento da noite.
 */
export function ApagarAMesa({
  comanda,
  restaurantId,
  rotulo,
  className,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  rotulo: string;
  className?: string;
}) {
  const [perguntando, setPerguntando] = useState(false);
  const [estado, apagar] = useActionState<SalaoFormState, FormData>(apagarAComanda, {});

  if (!perguntando) {
    return (
      <button
        type="button"
        onClick={() => setPerguntando(true)}
        aria-label={"Apagar a comanda da " + rotulo}
        className={cn("grid size-12 shrink-0 place-items-center rounded-control bg-surface-3 text-muted active:text-danger", className)}
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <form action={apagar} className="flex w-full max-w-md flex-col gap-3 rounded-card border border-danger/50 bg-surface p-4">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="comandaId" value={comanda.id} />

        <div>
          <p className="text-lg font-extrabold">Apagar a comanda da {rotulo}?</p>
          <p className="text-sm text-muted">
            A mesa fica livre. Os pedidos ficam como cancelados no relatório do dia, e o que já foi recebido nesta conta
            {comanda.pagoCents > 0 ? ` -- ${formatCents(comanda.pagoCents)} -- ` : " "}
            sai junto.
          </p>
        </div>

        {estado.error && (
          <p className="rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
            {estado.error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingText="Apagando..." variant="danger">
            Sim, apagar
          </SubmitButton>
          <button type="button" onClick={() => setPerguntando(false)} className="min-h-11 rounded-control px-4 font-bold text-muted">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
