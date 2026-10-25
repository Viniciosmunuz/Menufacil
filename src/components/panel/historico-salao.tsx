import { ArrowLeftRight, Banknote, ClipboardList, Lock, RotateCcw, Settings2, Users, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatCents, formatTime } from "@/lib/format";
import type { LinhaDoHistorico, TipoDaLinha } from "@/server/salao/historico";

// As linhas do histórico do salão, uma embaixo da outra, da mais nova para
// a mais velha -- como o caixa confere: "o que aconteceu na mesa 4 agora há
// pouco?".
//
// A cor do ícone diz o tipo de longe: verde é dinheiro entrando, vermelho é
// o que saiu da conta (estorno, item apagado, comanda apagada). É o
// vermelho que o dono procura quando a gaveta não bate.

const ICONE: Record<TipoDaLinha, { icone: LucideIcon; cor: string }> = {
  pedido: { icone: ClipboardList, cor: "bg-brand-soft text-brand" },
  pagamento: { icone: Banknote, cor: "bg-[#c3f0d4] text-[#1e7a45]" },
  estorno: { icone: RotateCcw, cor: "bg-danger/15 text-danger" },
  mesa: { icone: ArrowLeftRight, cor: "bg-[#e4dcfb] text-[#5b3fc4]" },
  caixa: { icone: Lock, cor: "bg-[#d7e8fc] text-[#2565b8]" },
  equipe: { icone: Users, cor: "bg-surface-3 text-ink/70" },
  ajuste: { icone: Settings2, cor: "bg-surface-3 text-ink/70" },
};

export const NOME_DO_TIPO: Record<TipoDaLinha, string> = {
  pedido: "Pedidos",
  pagamento: "Pagamentos",
  estorno: "Estornos e exclusões",
  mesa: "Mesas",
  caixa: "Caixa",
  equipe: "Equipe",
  ajuste: "Ajustes",
};

export function ListaDoHistorico({
  linhas,
  mostrarQuem = true,
  vazio,
}: {
  linhas: LinhaDoHistorico[];
  /** no celular do garçom é tudo dele: repetir o nome em cada linha é ruído */
  mostrarQuem?: boolean;
  vazio: string;
}) {
  if (linhas.length === 0) {
    return <p className="rounded-card border border-line bg-surface px-4 py-10 text-center text-muted">{vazio}</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {linhas.map((l) => {
        const { icone: Icone, cor } = ICONE[l.tipo];
        return (
          <li key={l.id} className="flex items-start gap-3 px-4 py-3">
            <span className="w-11 shrink-0 pt-2 text-sm text-muted tabular-nums">{formatTime(l.quando)}</span>
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", cor)}>
              <Icone className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold">{l.titulo}</span>
                {l.mesa && <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold">{l.mesa}</span>}
              </span>
              {l.detalhe && <span className="block text-sm text-muted">{l.detalhe}</span>}
              {mostrarQuem && <span className="block text-xs text-faint">{l.quem}</span>}
            </span>
            {l.centavos !== null && (
              <span className={cn("shrink-0 pt-1.5 font-bold tabular-nums", l.centavos < 0 ? "text-danger" : l.tipo === "pagamento" ? "text-[#1e7a45]" : "text-ink")}>
                {l.centavos < 0 ? "−" + formatCents(-l.centavos) : formatCents(l.centavos)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** os três números do topo: o que foi lançado, o que entrou e o que saiu */
export function ResumoDoHistorico({ linhas }: { linhas: LinhaDoHistorico[] }) {
  const pedidos = linhas.filter((l) => l.tipo === "pedido");
  const lancado = pedidos.reduce((t, l) => t + (l.centavos ?? 0), 0);
  const recebido = linhas.filter((l) => l.tipo === "pagamento").reduce((t, l) => t + (l.centavos ?? 0), 0);
  const estornos = linhas.filter((l) => l.tipo === "estorno");

  const caixa = "flex min-w-0 flex-col gap-0.5 rounded-card border border-line bg-surface px-3 py-3 sm:px-4";
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <p className={caixa}>
        <span className="text-xs text-muted sm:text-sm">Pedidos</span>
        <span className="text-base font-bold tabular-nums sm:text-xl">{pedidos.length}</span>
        <span className="truncate text-xs text-muted tabular-nums">{formatCents(lancado)}</span>
      </p>
      <p className={caixa}>
        <span className="text-xs text-muted sm:text-sm">Recebido</span>
        <span className="text-base font-bold text-[#1e7a45] tabular-nums sm:text-xl">{formatCents(recebido)}</span>
      </p>
      <p className={caixa}>
        <span className="text-xs text-muted sm:text-sm">Estornos</span>
        <span className={cn("text-base font-bold tabular-nums sm:text-xl", estornos.length > 0 && "text-danger")}>{estornos.length}</span>
      </p>
    </div>
  );
}
