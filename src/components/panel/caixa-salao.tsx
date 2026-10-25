import { Banknote, CreditCard, Lock, NotebookPen, QrCode, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { formatCents, formatWhen } from "@/lib/format";
import type { CaixaDoSalao } from "@/server/salao/caixa";

// O caixa do salão, no fim da noite.
//
// A pergunta aqui é uma só: quanto entrou pelas mesas, em quê, e dá para
// fechar. Por isso não há filtro de período -- é o turno de agora, do jeito
// que o dono conta o dinheiro, e o que impede o fechamento aparece por
// nome: mesa 7 ainda aberta é uma conversa com alguém, não um erro.
//
// Esta aba só existe no painel do dono. O garçom não a vê, e não por ela
// estar escondida: ele nem chega a esta tela, porque o painel inteiro exige
// papel de dono no servidor.

const ICONE: Record<string, ReactNode> = {
  DINHEIRO: <Banknote className="size-5" aria-hidden="true" />,
  PIX: <QrCode className="size-5" aria-hidden="true" />,
  CARTAO: <CreditCard className="size-5" aria-hidden="true" />,
  ANOTADO: <NotebookPen className="size-5" aria-hidden="true" />,
};

/**
 * O caixa fechado, no jeito do Yooga: o aviso grande no meio da tela e o
 * "Abrir caixa" embaixo dele. É o primeiro toque da noite, então não
 * divide a tela com mais nada.
 */
export function CaixaFechado({ abrir }: { abrir: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-card border border-line bg-surface px-6 py-10 text-center shadow-sm sm:px-10">
        <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
          <Lock className="size-9" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold">Caixa fechado</h2>
          <p className="text-muted">Enquanto o caixa não abrir, os garçons veem o caixa fechado e não conseguem lançar pedido.</p>
        </div>
        {abrir}
      </div>
    </div>
  );
}

export function CaixaDoSalaoPanel({
  caixa,
  turno,
  abrir,
  fechar,
}: {
  caixa: CaixaDoSalao;
  /** o turno aberto agora; sem ele, o salão não opera */
  turno: { abertoAt: Date; aberturaCents: number; abertoPor: string | null } | null;
  abrir: ReactNode;
  fechar: ReactNode;
}) {
  const podeFechar = caixa.abertas.length === 0;

  // Sem turno aberto, a única coisa que esta aba oferece é abrir.
  //
  // Mostrar aqui o movimento do turno anterior faria o dono conferir
  // números de ontem achando que são de hoje.
  if (!turno) return <CaixaFechado abrir={abrir} />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Caixa do salão</h2>
          <p className="text-sm text-muted">
            Aberto {formatWhen(turno.abertoAt)}
            {turno.abertoPor ? " por " + turno.abertoPor : ""} · a gaveta começou com {formatCents(turno.aberturaCents)}
          </p>
        </div>

        <p className="text-3xl font-extrabold tabular-nums">{formatCents(caixa.totalCents)}</p>

        {caixa.linhas.length === 0 ? (
          <p className="text-muted">Nenhuma mesa paga ainda neste turno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {caixa.linhas.map((l) => (
              <li key={l.forma} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">
                  {ICONE[l.forma] ?? <Wallet className="size-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{l.nome}</span>
                  <span className="block text-sm text-muted">
                    {l.pedidos} {l.pedidos === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">{formatCents(l.centavos)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* o anotado não está na gaveta nem na máquina: é conta que a casa
            ainda vai cobrar, e somá-la ao que entrou faria o caixa não bater */}
        {caixa.anotadoCents > 0 && (
          <p className="flex items-center justify-between gap-3 rounded-control bg-warning/10 px-4 py-3 text-sm font-bold text-warning">
            <span className="flex items-center gap-2">
              <NotebookPen className="size-4" aria-hidden="true" />
              Anotado, a receber
            </span>
            <span className="tabular-nums">{formatCents(caixa.anotadoCents)}</span>
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Fechar o salão</h2>
          <p className="text-sm text-muted">
            {podeFechar
              ? "Todas as mesas estão pagas. Dá para fechar o caixa da noite."
              : "Ainda há mesa aberta. Elas precisam ser pagas antes do fechamento."}
          </p>
        </div>

        {podeFechar ? (
          fechar
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {caixa.abertas.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="font-bold">
                    {m.tipo === "BALCAO" ? "Balcão" : "Mesa"} {m.numero}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">{formatCents(m.centavos)}</span>
                </li>
              ))}
            </ul>
            <p className="flex items-baseline justify-between gap-3 border-t border-line pt-3 font-bold">
              <span>Em aberto</span>
              <span className="tabular-nums">{formatCents(caixa.abertoCents)}</span>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
