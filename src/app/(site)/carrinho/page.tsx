import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { CartPanel } from "@/components/site/cart-panel";
import { lockedStore } from "@/server/public/store";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default async function CartPage() {
  const store = await lockedStore();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title="Carrinho" description="Confira os itens antes de finalizar." />
      <CartPanel storeSlug={store?.slug} />
    </div>
  );
}
