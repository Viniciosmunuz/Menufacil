"use client";

import { Bell, Bike, CheckCircle2, ChefHat, ChevronRight, CircleX, ReceiptText } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import type { OrderStatus } from "@/generated/prisma/enums";
import { useStored, write } from "@/lib/aviso-local";
import { cn } from "@/lib/cn";

// A gaveta das últimas movimentações, ao lado da tabela.
//
// O balcão não fica olhando a lista inteira: ele quer saber o que mudou
// desde a última vez que olhou. Aqui estão os pedidos recentes com o que
// aconteceu com cada um e a que horas.
//
// A setinha fecha a gaveta e devolve a largura para a tabela. Fica fechada
// ou aberta do jeito que a pessoa deixou -- é preferência de quem olha a
// tela, então mora no próprio aparelho e não no banco.

const CHAVE = "mf:avisos-abertos";

export type Movimento = {
  orderId: string;
  numero: number;
  cliente: string;
  status: OrderStatus;
  quando: string;
};

const CARA: Record<OrderStatus, { icone: ComponentType<{ className?: string }>; cor: string; frase: (n: number) => string }> = {
  NEW: { icone: ReceiptText, cor: "bg-success/12 text-success", frase: (n) => `Novo pedido #${n} recebido` },
  AWAITING_PAYMENT: { icone: ReceiptText, cor: "bg-warning/12 text-warning", frase: (n) => `Pedido #${n} espera o pagamento` },
  PAYMENT_SENT: { icone: ReceiptText, cor: "bg-warning/12 text-warning", frase: (n) => `Pedido #${n}: cliente avisou que pagou` },
  PAID: { icone: ReceiptText, cor: "bg-success/12 text-success", frase: (n) => `Pedido #${n} foi pago` },
  CONFIRMED: { icone: ChefHat, cor: "bg-info/12 text-info", frase: (n) => `Pedido #${n} foi aceito` },
  PREPARING: { icone: ChefHat, cor: "bg-info/12 text-info", frase: (n) => `Pedido #${n} está em preparo` },
  READY: { icone: CheckCircle2, cor: "bg-info/12 text-info", frase: (n) => `Pedido #${n} está pronto` },
  OUT_FOR_DELIVERY: { icone: Bike, cor: "bg-brand-soft text-brand", frase: (n) => `Pedido #${n} saiu para entrega` },
  COMPLETED: { icone: CheckCircle2, cor: "bg-success/12 text-success", frase: (n) => `Pedido #${n} foi concluído` },
  CANCELED: { icone: CircleX, cor: "bg-surface-3 text-muted", frase: (n) => `Pedido #${n} foi cancelado` },
};

export function GavetaDeAvisos({ movimentos, base }: { movimentos: Movimento[]; base: string }) {
  // No servidor ninguém sabe o que este aparelho escolheu, então a gaveta
  // nasce aberta e o navegador corrige sozinho se ela estava fechada.
  const guardado = useStored(CHAVE);
  const aberta = guardado !== "0";
  const trocar = () => write(CHAVE, aberta ? "0" : "1");

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={trocar}
        aria-label="Abrir as últimas movimentações"
        className="hidden h-fit shrink-0 items-center gap-2 rounded-card border border-line bg-surface px-3 py-4 text-sm font-extrabold text-muted hover:text-ink lg:flex"
      >
        <Bell className="size-4" aria-hidden="true" />
        <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside className="hidden h-fit w-80 shrink-0 flex-col rounded-card border border-line bg-surface lg:flex xl:w-96">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
        <p className="flex items-center gap-2 font-extrabold">
          <Bell className="size-4 text-brand" aria-hidden="true" />
          Últimas movimentações
        </p>
        <button
          type="button"
          onClick={trocar}
          aria-label="Fechar as últimas movimentações"
          className="grid size-8 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      {movimentos.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Nada se mexeu ainda hoje.</p>
      ) : (
        <ul className="flex flex-col">
          {movimentos.map((m) => {
            const cara = CARA[m.status];
            const Icone = cara.icone;
            return (
              <li key={m.orderId} className="border-b border-line/70 last:border-0">
                <Link href={`${base}/${m.orderId}`} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2/50">
                  <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", cara.cor)}>
                    <Icone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{cara.frase(m.numero)}</span>
                    <span className="block truncate text-xs text-muted">{m.cliente}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{m.quando}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
