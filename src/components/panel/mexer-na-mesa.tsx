"use client";

import { ArrowDownUp, ArrowLeft, Check, ChevronRight, ScrollText, Search, Trash2, Utensils, X } from "lucide-react";
import { useActionState, useState } from "react";

import { apagarAComanda, moverOsItens, trocarAMesa, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { ComandaAberta } from "@/server/salao/comanda";
import type { MesaDestino } from "@/server/salao/mexer";

// Transferir, no jeito do Yooga -- que é o que o Papaléguas já usa.
//
// Um passo por tela, como lá:
//
//   O que quer fazer?   Transferir a mesa  |  Transferir itens
//   Transferir a mesa → Para qual mesa?   (lista com LIVRE / OCUPADA)  → Transferir agora
//   Transferir itens  → Quais itens?      (caixinhas)                  → Escolher mesa
//                     → Para qual mesa?                                → Transferir agora
//
// No celular do garçom cada passo ocupa a tela inteira; no computador do
// caixa, uma janela no meio, como o Yooga faz no balcão.
//
// Trocar a mesa leva a comanda inteira e exige mesa livre do outro lado --
// a ocupada aparece, mas apagada. Transferir itens aceita mesa ocupada: é o
// caso de duas pessoas da mesma turma em mesas diferentes, e o prato que
// foi lançado na conta errada.

type Passo = "escolha" | "mesa" | "itens" | "destino";

const TITULO: Record<Passo, string> = {
  escolha: "Transferir",
  mesa: "Transferir a mesa",
  itens: "Transferir itens",
  destino: "Transferir itens",
};

const limparBusca = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function MexerNaMesa({
  comanda,
  restaurantId,
  mesas,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  mesas: MesaDestino[];
  /** "Mesa 7"; ficou de reserva para quando a janela disser de onde sai */
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("escolha");
  const [destino, setDestino] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [trocado, trocar] = useActionState<SalaoFormState, FormData>(trocarAMesa, {});
  const [movido, mover] = useActionState<SalaoFormState, FormData>(moverOsItens, {});

  function irPara(p: Passo) {
    setPasso(p);
    setBusca("");
    if (p !== "destino") setDestino(null);
  }

  function fechar() {
    setAberto(false);
    setPasso("escolha");
    setDestino(null);
    setMarcados([]);
    setBusca("");
  }

  // deu certo: a janela fecha, porque a página já voltou com a mesa nova
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  const resposta = trocado.ok ? trocado : movido.ok ? movido : null;
  if (resposta && resposta.message !== ultimo) {
    setUltimo(resposta.message);
    fechar();
  }

  const voltar = () => {
    if (passo === "escolha") fechar();
    else if (passo === "destino") irPara("itens");
    else irPara("escolha");
  };

  const marcar = (id: string) => setMarcados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]));
  const erro = trocado.error ?? movido.error;
  const termo = limparBusca(busca);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Transferir a mesa ou itens"
        title="Transferir"
        className="grid size-9 shrink-0 place-items-center rounded-control text-ink/70 hover:bg-surface-2 hover:text-ink"
      >
        <ArrowDownUp className="size-5" aria-hidden="true" />
      </button>
    );
  }

  const campoDeBusca = (placeholder: string) => (
    <label className="relative block">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink" aria-hidden="true" />
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-control border border-line-strong bg-surface pr-4 pl-12 text-base outline-none placeholder:text-faint focus:border-brand"
      />
    </label>
  );

  // a lista de mesas, com a pílula verde ou cinza do Yooga
  const listaDeMesas = (aceitaOcupada: boolean) => {
    const lista = mesas.filter((m) => !termo || limparBusca(m.rotulo).includes(termo));
    if (lista.length === 0) return <p className="py-8 text-center text-muted">Nenhuma mesa encontrada.</p>;
    return (
      <ul className="flex flex-col">
        {lista.map((m) => {
          const pode = aceitaOcupada || !m.ocupada;
          const escolhida = destino === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={!pode}
                onClick={() => setDestino(m.id)}
                aria-pressed={escolhida}
                className={cn(
                  "flex min-h-16 w-full items-center gap-4 px-1 text-left transition-colors",
                  escolhida ? "bg-surface-2" : "hover:bg-surface-2/60",
                  !pode && "cursor-not-allowed opacity-45",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border-2",
                    escolhida ? "border-brand" : "border-line-strong",
                  )}
                  aria-hidden="true"
                >
                  {escolhida && <span className="size-3 rounded-full bg-brand" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg">{m.rotulo}</span>
                {m.ocupada && <span className="shrink-0 text-lg text-muted tabular-nums">{formatCents(m.centavos)}</span>}
                <span
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase",
                    m.ocupada ? "bg-[#1fc46e]" : "bg-[#7d828a]",
                  )}
                >
                  {m.ocupada ? "Ocupada" : "Livre"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const itensVisiveis = comanda.itens.filter((i) => !termo || limparBusca(`${i.nome} ${i.opcoes ?? ""}`).includes(termo));

  return (
    <div className="fixed inset-0 z-50 flex bg-surface sm:items-center sm:justify-center sm:bg-black/60 sm:p-6">
      <div
        role="dialog"
        aria-label={TITULO[passo]}
        className="flex h-full w-full flex-col bg-surface font-normal text-ink sm:h-auto sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-card sm:shadow-2xl"
      >
        <header className="flex items-center gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-6">
          <button type="button" onClick={voltar} aria-label="Voltar" className="grid size-10 shrink-0 place-items-center rounded-control text-brand">
            <ArrowLeft className="size-7" aria-hidden="true" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{TITULO[passo]}</h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="hidden size-10 shrink-0 place-items-center rounded-control text-brand sm:grid"
          >
            <X className="size-7" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-8">
          {passo === "escolha" && (
            <>
              <h3 className="mt-4 mb-6 text-3xl font-bold sm:text-center sm:text-2xl">O que quer fazer?</h3>
              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-5 sm:px-10 sm:pb-6">
                {(
                  [
                    ["mesa", "Transferir a mesa", <Utensils key="i" aria-hidden="true" />],
                    ["itens", "Transferir itens", <ScrollText key="i" aria-hidden="true" />],
                  ] as const
                ).map(([p, nome, icone]) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => irPara(p)}
                    className="flex min-h-20 items-center gap-4 rounded-card border border-line bg-surface px-4 text-left shadow-[0_2px_0_rgb(0_0_0/0.06)] transition-colors hover:border-line-strong sm:min-h-56 sm:flex-col sm:justify-center sm:gap-6 sm:text-center"
                  >
                    <span className="text-brand [&_svg]:size-9 sm:grid sm:size-24 sm:place-items-center sm:rounded-full sm:bg-brand-soft sm:[&_svg]:size-12">
                      {icone}
                    </span>
                    <span className="flex-1 text-lg sm:flex-none">{nome}</span>
                    <ChevronRight className="size-7 text-muted sm:hidden" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </>
          )}

          {(passo === "mesa" || passo === "destino") && (
            <>
              <h3 className="mt-4 mb-6 text-3xl font-bold sm:text-2xl">Para qual mesa?</h3>
              <div className="mb-4">{campoDeBusca("Pesquisar por mesa")}</div>
              {/* trocar a comanda inteira pede mesa livre; levar itens, não */}
              {listaDeMesas(passo === "destino")}
            </>
          )}

          {passo === "itens" && (
            <>
              <h3 className="mt-4 mb-6 text-3xl font-bold sm:text-2xl">Quais itens?</h3>
              <div className="mb-4">{campoDeBusca("Pesquisar por itens")}</div>
              {itensVisiveis.length === 0 ? (
                <p className="py-8 text-center text-muted">{comanda.itens.length === 0 ? "Nada lançado ainda." : "Nenhum item encontrado."}</p>
              ) : (
                <ul className="flex flex-col">
                  {itensVisiveis.map((i) => {
                    const aceso = marcados.includes(i.id);
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => marcar(i.id)}
                          aria-pressed={aceso}
                          className={cn("flex min-h-16 w-full items-start gap-4 px-1 py-3 text-left", aceso ? "bg-surface-2" : "hover:bg-surface-2/60")}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2",
                              aceso ? "border-brand bg-brand text-brand-ink" : "border-line-strong",
                            )}
                            aria-hidden="true"
                          >
                            {aceso && <Check className="size-4" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-lg">
                              {i.quantidade}x {i.nome}
                            </span>
                            {i.opcoes && <span className="block truncate text-muted">{i.opcoes}</span>}
                          </span>
                          <span className="shrink-0 text-lg text-muted tabular-nums">{formatCents(i.centavos)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {erro && (
            <p className="mt-3 rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
              {erro}
            </p>
          )}
        </div>

        {passo !== "escolha" && (
          <footer className="border-t border-line px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
            {passo === "itens" ? (
              <button
                type="button"
                disabled={marcados.length === 0}
                onClick={() => irPara("destino")}
                className="h-14 w-full rounded-control bg-brand text-lg font-bold text-brand-ink transition disabled:bg-surface-3 disabled:text-muted"
              >
                Escolher mesa
              </button>
            ) : (
              <form action={passo === "mesa" ? trocar : mover}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="comandaId" value={comanda.id} />
                <input type="hidden" name="mesaDestinoId" value={destino ?? ""} />
                {passo === "destino" && marcados.map((id) => <input key={id} type="hidden" name="itemId" value={id} />)}
                <SubmitButton
                  pendingText="Transferindo..."
                  disabled={!destino}
                  className="h-14 w-full text-lg disabled:bg-surface-3 disabled:text-muted"
                >
                  Transferir agora
                </SubmitButton>
              </form>
            )}
          </footer>
        )}
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
