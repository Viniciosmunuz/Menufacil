import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { lockedStore } from "@/server/public/store";

import { MyOrdersList } from "./orders-list";

export const metadata: Metadata = { title: "Meus pedidos", robots: { index: false } };

export default async function MyOrdersPage() {
  const store = await lockedStore();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Meus pedidos" description="Acompanhe o preparo dos pedidos feitos neste aparelho." />
      <MyOrdersList storeSlug={store?.slug} />
    </div>
  );
}
