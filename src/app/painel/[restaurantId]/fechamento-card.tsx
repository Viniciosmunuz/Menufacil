import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";

import { Gaveta } from "@/components/ui/gaveta";
import { formatCents } from "@/lib/format";
import type { LinhaDoFechamento } from "@/server/stats";

// O caixa da noite, separado por onde o dinheiro está.
//
// "Vendido hoje: R$ 194,50" não fecha caixa nenhum. No 100% Delivery esse
// valor está em três lugares ao mesmo tempo: o Pix já caiu na conta do
// Mercado Pago, o dinheiro voltou no bolso do entregador e o cartão passou
// na maquininha. Quem vai conferir no fim da noite precisa saber quanto tem
// em cada um -- e hoje precisava abrir pedido por pedido para descobrir.
//
// É gaveta porque é consulta de fim de expediente, não número de vigiar
// durante o movimento.

const ONDE: Record<LinhaDoFechamento["onde"], { rotulo: string; detalhe: string }> = {
  "na-conta": { rotulo: "Pix", detalhe: "já na conta" },
  "a-confirmar": { rotulo: "Pix", detalhe: "ainda não confirmado" },
  "em-maos": { rotulo: "", detalhe: "recebido na entrega" },
};

const ICONE = {
  PIX: QrCode,
  CASH: Banknote,
  CARD: CreditCard,
} as const;

const NOME = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão" } as const;

export function FechamentoCard({ linhas, totalCentavos, totalPedidos }: { linhas: LinhaDoFechamento[]; totalCentavos: number; totalPedidos: number }) {
  if (totalPedidos === 0) return null;

  return (
    <Gaveta
      titulo="Fechamento do dia"
      resumo={`${formatCents(totalCentavos)} em ${totalPedidos} ${totalPedidos === 1 ? "pedido" : "pedidos"}`}
      icone={<Wallet />}
    >
      <ul className="flex flex-col divide-y divide-line">
        {linhas.map((l) => {
          const Icone = ICONE[l.method];
          const onde = ONDE[l.onde];
          return (
            <li key={`${l.method}:${l.onde}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{NOME[l.method]}</span>
                <span className="block text-sm text-muted">
                  {onde.detalhe} · {l.pedidos} {l.pedidos === 1 ? "pedido" : "pedidos"}
                </span>
              </span>
              <span className="shrink-0 font-extrabold tabular-nums">{formatCents(l.centavos)}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="font-extrabold">Total do dia</span>
        <span className="text-xl font-extrabold tabular-nums">{formatCents(totalCentavos)}</span>
      </div>

      {/* o que está em mãos é o que alguém vai contar e guardar; o Pix já
          está na conta e não precisa de conferência de gaveta */}
      <p className="text-sm text-muted">
        Pedido cancelado e pedido que ainda espera o Pix não entram nesta conta.
      </p>
    </Gaveta>
  );
}
