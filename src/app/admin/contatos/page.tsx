import { Inbox, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone } from "@/lib/format";
import { requireAdmin } from "@/server/auth/dal";

import { setLeadHandled } from "./actions";

export const metadata: Metadata = { title: "Contatos" };

// Quem clicou em "Quero cadastrar meu restaurante" no site.
export default async function AdminLeadsPage({ searchParams }: PageProps<"/admin/contatos">) {
  await requireAdmin();
  const sp = await searchParams;
  const showHandled = sp.ver === "atendidos";

  const [leads, openCount, handledCount] = await Promise.all([
    db.restaurantLead.findMany({
      where: { handled: showHandled },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.restaurantLead.count({ where: { handled: false } }),
    db.restaurantLead.count({ where: { handled: true } }),
  ]);

  const tabs = [
    { href: "/admin/contatos", label: "Novos", count: openCount, active: !showHandled },
    { href: "/admin/contatos?ver=atendidos", label: "Atendidos", count: handledCount, active: showHandled },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Contatos" description="Restaurantes que pediram para entrar na plataforma pelo site." />

      <nav className="flex gap-2" aria-label="Filtrar contatos">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
              t.active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {t.label}
            <span className="tabular-nums opacity-70">{t.count}</span>
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <EmptyState icon={<Inbox />} title={showHandled ? "Nenhum contato atendido" : "Nenhum contato novo"}>
          {showHandled ? "Os contatos que você marcar como atendidos aparecem aqui." : "Quando alguém pedir para cadastrar um restaurante pelo site, aparece aqui."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold">{lead.restaurantName}</p>
                  <p className="text-sm text-muted">{lead.contactName}</p>
                </div>
                {lead.handled ? <Badge tone="success">Atendido</Badge> : <Badge tone="brand">Novo</Badge>}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <a href={`tel:+${lead.whatsapp}`} className="flex w-fit items-center gap-2 font-bold hover:text-brand">
                  <Phone className="size-4 text-faint" aria-hidden="true" />
                  {formatPhone(lead.whatsapp)}
                </a>
                {lead.city && (
                  <p className="flex items-center gap-2 text-muted">
                    <MapPin className="size-4 text-faint" aria-hidden="true" />
                    {lead.city}
                  </p>
                )}
              </div>
              {lead.message && <p className="rounded-control bg-surface-2 p-3 text-sm text-muted">{lead.message}</p>}
              <p className="text-xs text-faint">Recebido em {formatDateTime(lead.createdAt)}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                {!lead.handled && (
                  <Link href={`/admin/restaurantes/novo?contato=${lead.id}`} className={buttonClasses("primary", "sm")}>
                    Cadastrar restaurante
                  </Link>
                )}
                <form action={setLeadHandled}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="handled" value={lead.handled ? "false" : "true"} />
                  <SubmitButton variant="secondary" size="sm" pendingText="Aguarde...">
                    {lead.handled ? "Reabrir" : "Marcar como atendido"}
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
