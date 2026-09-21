import { ExternalLink, History, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describeAudit } from "@/lib/audit-labels";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";
import { activationChecklist } from "@/server/restaurants/checklist";

import { BasicsForm } from "./basics-form";
import { OwnersPanel } from "./owners-panel";
import { StatusPanel } from "./status-panel";

export async function generateMetadata({ params }: PageProps<"/admin/restaurantes/[id]">): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const r = await db.restaurant.findUnique({ where: { id }, select: { name: true } });
  return { title: r?.name ?? "Restaurante" };
}

export default async function AdminRestaurantPage({ params, searchParams }: PageProps<"/admin/restaurantes/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    include: {
      categories: { select: { id: true } },
      owners: {
        orderBy: { createdAt: "asc" },
        select: {
          user: {
            select: { id: true, name: true, email: true, phone: true, mustChangePassword: true, lastLoginAt: true },
          },
        },
      },
      _count: { select: { products: true, orders: true, menuCategories: true } },
    },
  });
  if (!restaurant) notFound();

  const [checklist, categories, logs] = await Promise.all([
    activationChecklist(id),
    db.platformCategory.findMany({
      where: { OR: [{ active: true }, { restaurants: { some: { id } } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, icon: true },
    }),
    db.auditLog.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, role: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/restaurantes", label: "Restaurantes" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {restaurant.name}
            <Badge tone={restaurantStatusTone[restaurant.status]}>{restaurantStatusLabel[restaurant.status]}</Badge>
          </span>
        }
        description={[restaurant.city, restaurant.state].filter(Boolean).join(" - ")}
        actions={
          <>
            <Link href={`/painel/${restaurant.id}`} className={buttonClasses("primary")}>
              <Settings2 className="size-4" aria-hidden="true" />
              Gerenciar restaurante
            </Link>
            {restaurant.status === "ACTIVE" && (
              <Link href={`/restaurante/${restaurant.slug}`} target="_blank" className={buttonClasses("secondary")}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Ver no site
              </Link>
            )}
          </>
        }
      />

      {sp.dono === "existente" && (
        <Alert tone="info">
          O e-mail do dono já tinha conta: ele foi ligado a este restaurante e entra com a senha que já usa.
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <StatusPanel
            restaurantId={restaurant.id}
            status={restaurant.status}
            checklist={checklist.items}
            ready={checklist.ready}
          />
          <BasicsForm
            restaurant={{
              id: restaurant.id,
              name: restaurant.name,
              slug: restaurant.slug,
              city: restaurant.city,
              state: restaurant.state,
              featured: restaurant.featured,
              categoryIds: restaurant.categories.map((c) => c.id),
            }}
            categories={categories}
          />
        </div>

        <div className="flex flex-col gap-6">
          <OwnersPanel
            restaurantId={restaurant.id}
            owners={restaurant.owners.map(({ user }) => ({
              ...user,
              lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            }))}
          />

          <Card>
            <SectionTitle>Resumo</SectionTitle>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-faint">Categorias do cardápio</dt>
                <dd className="text-lg font-extrabold tabular-nums">{restaurant._count.menuCategories}</dd>
              </div>
              <div>
                <dt className="text-faint">Produtos</dt>
                <dd className="text-lg font-extrabold tabular-nums">{restaurant._count.products}</dd>
              </div>
              <div>
                <dt className="text-faint">Pedidos</dt>
                <dd className="text-lg font-extrabold tabular-nums">{restaurant._count.orders}</dd>
              </div>
              <div>
                <dt className="text-faint">Cadastrado em</dt>
                <dd className="font-bold">{formatDateTime(restaurant.createdAt)}</dd>
              </div>
              {restaurant.activatedAt && (
                <div className="col-span-2">
                  <dt className="text-faint">Publicado pela primeira vez</dt>
                  <dd className="font-bold">{formatDateTime(restaurant.activatedAt)}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <SectionTitle description="Tudo o que foi feito neste restaurante, por quem.">
              <span className="flex items-center gap-2">
                <History className="size-5 text-faint" aria-hidden="true" />
                Histórico
              </span>
            </SectionTitle>
            {logs.length === 0 ? (
              <p className="text-sm text-muted">Nada registrado ainda.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {logs.map((log) => {
                  const { title, detail } = describeAudit(log.action, log.details);
                  return (
                    <li key={log.id} className="border-l-2 border-line pl-3 text-sm">
                      <p className="font-bold">{title}</p>
                      {detail && <p className="text-muted">{detail}</p>}
                      <p className="text-xs text-faint">
                        {formatDateTime(log.createdAt)} · {log.actor ? `${log.actor.name}${log.actor.role === "ADMIN" ? " (admin)" : ""}` : "sistema"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
