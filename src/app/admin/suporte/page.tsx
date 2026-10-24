import { CircleCheck, LifeBuoy, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/lib/db";
import { formatPhone, formatWhen } from "@/lib/format";
import { requireAdmin } from "@/server/auth/dal";

import { resolverChamado } from "./actions";

export const metadata: Metadata = { title: "Suporte" };

// Quem está esperando ajuda.
//
// Os chamados abertos primeiro, porque é a única pergunta que esta tela
// responde: quem pediu socorro e ainda não teve resposta. Os resolvidos
// ficam abaixo, poucos, só para lembrar o que já passou por aqui.
//
// Cada linha leva ao WhatsApp do restaurante: a conversa continua onde
// ela começou, e não numa caixa de mensagens que ninguém abre.

export default async function AdminSuportePage() {
  await requireAdmin();

  const [abertos, resolvidos] = await Promise.all([
    db.supportTicket.findMany({
      where: { status: "ABERTO" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        assunto: true,
        mensagem: true,
        abertoPor: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true, whatsapp: true } },
      },
    }),
    db.supportTicket.findMany({
      where: { status: "RESOLVIDO" },
      orderBy: { resolvedAt: "desc" },
      take: 10,
      select: { id: true, assunto: true, resolvedAt: true, restaurant: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Suporte"
        description={
          abertos.length === 0
            ? "Ninguém esperando agora."
            : abertos.length === 1
              ? "1 restaurante esperando resposta."
              : `${abertos.length} restaurantes esperando resposta.`
        }
      />

      {abertos.length === 0 ? (
        <Card className="flex items-center gap-3 text-muted">
          <LifeBuoy className="size-5 shrink-0 text-success" aria-hidden="true" />
          Nenhum chamado aberto.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {abertos.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-col gap-3 border-warning/40">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/admin/restaurantes/${c.restaurant.id}`}
                    className="font-extrabold text-ink underline-offset-4 hover:underline"
                  >
                    {c.restaurant.name}
                  </Link>
                  <Badge tone="warning">{c.assunto}</Badge>
                  <span className="text-sm text-faint">
                    {c.abertoPor} · {formatWhen(c.createdAt)}
                  </span>
                </div>

                <p className="text-sm whitespace-pre-line text-muted">{c.mensagem}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {c.restaurant.whatsapp && (
                    <a
                      href={`https://wa.me/${c.restaurant.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses("secondary", "sm")}
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      {formatPhone(c.restaurant.whatsapp)}
                    </a>
                  )}
                  <form action={resolverChamado}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton size="sm" variant="ghost" pendingText="Fechando...">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      Marcar como resolvido
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {resolvidos.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-bold text-muted">Resolvidos</p>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {resolvidos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 py-2">
                <span>
                  <span className="font-bold">{c.restaurant.name}</span> <span className="text-muted">· {c.assunto}</span>
                </span>
                <span className="text-faint">{c.resolvedAt ? formatWhen(c.resolvedAt) : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
