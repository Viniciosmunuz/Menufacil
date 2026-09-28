import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";

// A lista de endereços que o buscador deve conhecer: as páginas fixas do
// site e o cardápio de cada restaurante no ar. Restaurante em implantação,
// desativado ou bloqueado não entra.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();

  const fixas: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/restaurantes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categorias`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/cadastre-seu-restaurante`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/sobre`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contato`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const restaurantes = await db.restaurant.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...fixas,
    ...restaurantes.map((r) => ({
      url: `${base}/restaurante/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
