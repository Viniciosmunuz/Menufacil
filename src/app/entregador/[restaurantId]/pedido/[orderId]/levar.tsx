import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";

import { formatCents } from "@/lib/format";

// "Você precisa levar".
//
// A pergunta que o entregador faz antes de sair da loja é sempre a mesma:
// **o que eu levo na mão?** Máquina de cartão, troco, ou nada. Essa
// resposta estava diluída no meio do resumo do pagamento -- aparecia o
// nome da forma e o valor, e quem estava com pressa saía sem a maquininha.
//
// Aqui ela vira um bloco só dela, antes dos itens, com o que precisa ir na
// mochila escrito como instrução, e não como informação.

type Pagamento = {
  paymentMethod: "PIX" | "CARD" | "CASH";
  totalCents: number;
  payment: { status: string; cardType: string | null; changeForCents: number | null } | null;
};

/** o troco a levar: o que o cliente disse que vai dar, menos a conta */
function troco(p: Pagamento) {
  const paraQuanto = p.payment?.changeForCents ?? null;
  if (paraQuanto === null || paraQuanto <= p.totalCents) return null;
  return paraQuanto - p.totalCents;
}

export function VocePrecisaLevar({ pedido }: { pedido: Pagamento }) {
  // pago antes, pelo aplicativo: não se cobra nada na porta
  const jaPago = pedido.paymentMethod === "PIX" && pedido.payment?.status === "CONFIRMED";

  const linhas: { icone: typeof Wallet; texto: string; valor?: string; forte?: boolean }[] = jaPago
    ? [{ icone: QrCode, texto: "Nada: o cliente já pagou por Pix" }]
    : pedido.paymentMethod === "CARD"
      ? [
          { icone: CreditCard, texto: "Máquina de cartão", forte: true },
          { icone: Wallet, texto: "A cobrar na entrega", valor: formatCents(pedido.totalCents) },
        ]
      : pedido.paymentMethod === "PIX"
        ? [
            { icone: QrCode, texto: "A chave Pix do restaurante", forte: true },
            { icone: Wallet, texto: "A receber", valor: formatCents(pedido.totalCents) },
          ]
        : [
            { icone: Banknote, texto: "Dinheiro: receber na porta", valor: formatCents(pedido.totalCents) },
            ...(troco(pedido) !== null
              ? [{ icone: Wallet, texto: "Troco para levar", valor: formatCents(troco(pedido)!), forte: true } as const]
              : [{ icone: Wallet, texto: "O cliente não pediu troco" } as const]),
          ];

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Você precisa levar</h2>
      <ul className="flex flex-col gap-2.5">
        {linhas.map((l) => {
          const Icone = l.icone;
          return (
            <li key={l.texto} className="flex items-center gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${l.forte ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"}`}>
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <span className={`min-w-0 flex-1 ${l.forte ? "font-extrabold" : "font-semibold"}`}>{l.texto}</span>
              {l.valor && <span className="shrink-0 text-lg font-extrabold tabular-nums">{l.valor}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
