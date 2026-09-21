import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/dal";
import { logout } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Painel" };

// Porta de entrada do dono: com um restaurante, vai direto para ele; com
// vários, escolhe; bloqueado ou sem restaurante, explica o que houve.
export default async function PanelIndexPage() {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/conta/senha");
  if (user.role === "ADMIN") redirect("/admin/restaurantes");

  const ownerships = await db.restaurantOwner.findMany({
    where: { userId: user.id },
    include: { restaurant: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  const available = ownerships.filter((o) => o.restaurant.status !== "BLOCKED");

  if (available.length === 1) redirect(`/painel/${available[0].restaurant.id}`);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md">
        {available.length > 1 ? (
          <>
            <h1 className="text-2xl font-extrabold">Escolha o restaurante</h1>
            <ul className="mt-5 flex flex-col gap-2">
              {available.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/painel/${o.restaurant.id}`}
                    className="flex h-12 items-center rounded-control border border-line bg-surface-2 px-4 font-bold hover:border-brand"
                  >
                    {o.restaurant.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Acesso indisponível</h1>
            <p className="mt-2 text-muted">
              {ownerships.length > 0
                ? "O seu restaurante está temporariamente bloqueado. Fale com a equipe MenuFácil para regularizar."
                : "Sua conta ainda não está ligada a nenhum restaurante. Fale com a equipe MenuFácil."}
            </p>
          </>
        )}
        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm font-bold text-muted hover:text-ink">
            Sair da conta
          </button>
        </form>
      </Card>
    </main>
  );
}
