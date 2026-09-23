import { ReceiptText } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { lockedStore } from "@/server/public/store";

// Quando o link do pedido não abre: o código veio incompleto, ou o
// restaurante apagou o pedido. Quem está do outro lado é um cliente, então
// aqui ele lê o que houve e para onde ir — e não o 404 em inglês.
export default async function OrderNotFound() {
  const store = await lockedStore();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <EmptyState icon={<ReceiptText />} title="Não achamos este pedido">
        O link pode estar incompleto, ou o pedido foi apagado pelo restaurante. Se você acabou de pedir, o link certo está na
        mensagem que você mandou no WhatsApp.
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={store ? `/restaurante/${store.slug}` : "/restaurantes"} className={buttonClasses("primary")}>
            Ver o cardápio
          </Link>
          <Link href="/meus-pedidos" className={buttonClasses("secondary")}>
            Meus pedidos
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}
