import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";

import { FavoritesList } from "./favorites-list";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Favoritos" description="Os restaurantes que você marcou com o coração, guardados neste aparelho." />
      <FavoritesList />
    </div>
  );
}
