import { ArrowLeft, LogOut, Store } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { logout } from "@/server/auth/actions";
import { requireDono } from "@/server/auth/dal";

import { ChangePasswordForm } from "../../../conta/senha/change-password-form";

export const metadata: Metadata = { title: "Perfil" };

// O Perfil, no alto do trilho do menu.
//
// Juntou o que o menu largo mostrava e o trilho fino não comporta: a foto,
// o nome e se a loja está no ar. E a troca de senha, que até 15/11/2026
// só existia numa tela solta, fora do painel. O admin que entrou com a
// própria conta acha aqui o caminho de volta.
export default async function PerfilPage({ params }: PageProps<"/painel/[restaurantId]/perfil">) {
  const { restaurantId } = await params;
  const { restaurant, user, viaAdmin } = await requireDono(restaurantId);
  const foto = (await db.restaurant.findUnique({ where: { id: restaurant.id }, select: { logoUrl: true } }))?.logoUrl;
  const ativo = restaurant.status === "ACTIVE";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Perfil" />

      <Card className="flex flex-wrap items-center gap-4">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-2 text-brand">
          {foto ? <Image src={foto} alt="" fill sizes="64px" className="object-cover" /> : <Store className="size-7" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-extrabold">{restaurant.name}</h2>
            <span
              className={cn(
                "flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-extrabold",
                ativo ? "bg-success-soft text-success-ink" : "bg-surface-3 text-muted",
              )}
            >
              <span className={cn("size-1.5 rounded-full", ativo ? "bg-success" : "bg-faint")} aria-hidden="true" />
              {ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="truncate text-sm text-muted">{user.name}</p>
        </div>
        <form action={logout}>
          <button type="submit" className={buttonClasses("secondary", "md")}>
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </form>
      </Card>

      {viaAdmin && (
        <Link href={`/admin/restaurantes/${restaurant.id}`} className={cn(buttonClasses("secondary", "md"), "w-fit")}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao admin
        </Link>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Trocar a senha</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
