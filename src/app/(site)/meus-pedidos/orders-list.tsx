"use client";

import { ChevronRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useMyOrders } from "@/components/site/orders-store";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents, formatDateTime } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/labels";

import { ordersByCode, type OrderSummary } from "./actions";

/** enquanto tem pedido andando, a lista se atualiza sozinha */
const REFRESH_SECONDS = 20;

export function MyOrdersList({ storeSlug }: { storeSlug?: string | null }) {
  const saved = useMyOrders();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  // string simples: o efeito não roda de novo a cada render da lista
  const codes = saved.map((o) => o.code).join(",");

  useEffect(() => {
    const list = codes ? codes.split(",") : [];
    if (list.length === 0) return;
    let alive = true;
    const load = () =>
      ordersByCode(list)
        .then((found) => alive && setOrders(found))
        .catch(() => {});
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_SECONDS * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [codes]);

  // pelo link de um restaurante, a lista mostra só os pedidos dele
  const found = codes ? orders : [];
  const visible = storeSlug ? found?.filter((o) => o.restaurantSlug === storeSlug) : found;

  if (found === null) return <p className="text-muted">Carregando seus pedidos...</p>;

  if (!visible || visible.length === 0) {
    return (
      <EmptyState icon={<ReceiptText />} title="Nenhum pedido ainda">
        Os pedidos que você fizer neste aparelho aparecem aqui, com o andamento de cada um.
        <div className="mt-4">
          <Link href={storeSlug ? `/restaurante/${storeSlug}` : "/restaurantes"} className={buttonClasses("primary")}>
            Ver o cardápio
          </Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {visible.map((o) => (
        <li key={o.code}>
          <Link href={`/pedido/${o.code}`} className="block transition hover:opacity-90 active:scale-[0.99]">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold">Pedido #{o.number}</span>
                  <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                </span>
                {!storeSlug && <span className="truncate text-sm font-bold text-muted">{o.restaurantName}</span>}
                <span className="text-sm text-faint">
                  {formatDateTime(o.createdAt)} · {o.type === "DELIVERY" ? "Entrega" : "Retirada"} · {formatCents(o.totalCents)}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-faint" aria-hidden="true" />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
