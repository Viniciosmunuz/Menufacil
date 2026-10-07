import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
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
  CASH: <Banknote className="size-5" aria-hidden="true" />,
  PIX: <QrCode className="size-5" aria-hidden="true" />,
  CARD: <CreditCard className="size-5" aria-hidden="true" />,
};

const NOME: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CARD: "Cartão",
};

export function CaixaDoSalaoPanel({ caixa }: { caixa: CaixaDoSalao }) {
  const podeFechar = caixa.abertas.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Caixa do salão</h2>
          <p className="text-sm text-muted">O que as mesas receberam neste turno.</p>
        </div>

        <p className="text-3xl font-extrabold tabular-nums">{formatCents(caixa.totalCents)}</p>

        {caixa.linhas.length === 0 ? (
          <p className="text-muted">Nenhuma mesa paga ainda neste turno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {caixa.linhas.map((l) => (
              <li key={l.method} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">
                  {ICONE[l.method] ?? <Wallet className="size-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{NOME[l.method] ?? l.method}</span>
                  <span className="block text-sm text-muted">
                    {l.pedidos} {l.pedidos === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">{formatCents(l.centavos)}</span>
              </li>
            ))}
          </ul>
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

        {!podeFechar && (
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
