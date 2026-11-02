"use client";

import { Bell, Bike, CheckCircle2, ChefHat, CircleX, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";

import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

// As últimas movimentações, num pop-up.
//
// Já foi uma gaveta fixa ao lado da tabela, e era espaço tirado da tabela o
// dia inteiro para uma informação que se olha de vez em quando -- mesmo
// fechada, a coluna continuava lá. Agora é um sino: fechado não ocupa nada,
// e aberto passa por cima.

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

export function AvisosDeMovimento({ movimentos, base }: { movimentos: Movimento[]; base: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // clicar fora fecha, e Esc também: é um pop-up, não uma tela
  useEffect(() => {
    if (!aberto) return;
    const foraOuEsc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setAberto(false);
        return;
      }
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", foraOuEsc);
    document.addEventListener("keydown", foraOuEsc);
    return () => {
      document.removeEventListener("mousedown", foraOuEsc);
      document.removeEventListener("keydown", foraOuEsc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className={cn(
          "flex h-10 items-center gap-2 rounded-control border px-3 text-sm font-extrabold transition-colors",
          aberto ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line-strong hover:text-ink",
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        Movimentações
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-96 overflow-hidden rounded-card border border-line bg-surface shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="font-extrabold">Últimas movimentações</p>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar as movimentações"
              className="grid size-8 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {movimentos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nada se mexeu ainda hoje.</p>
          ) : (
            // alto o bastante para caber o dia, e com rolagem própria quando
            // o movimento passa disso
            <ul className="flex max-h-96 flex-col overflow-y-auto">
              {movimentos.map((m) => {
                const cara = CARA[m.status];
                const Icone = cara.icone;
                return (
                  <li key={m.orderId} className="border-b border-line/70 last:border-0">
                    <Link
                      href={`${base}/${m.orderId}`}
                      onClick={() => setAberto(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2/50"
                    >
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
        </div>
      )}
    </div>
  );
}
