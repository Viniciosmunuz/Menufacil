import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonClasses } from "@/components/ui/button";
import { requireEntregador } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Entrega concluída" };

// O fim da entrega.
//
// Uma tela só para dizer que deu certo, antes de voltar para a lista. Não
// é enfeite: na rua, o entregador toca em "confirmar" e guarda o celular
// no mesmo movimento -- sem uma tela que afirme o que aconteceu, ele fica
// na dúvida se registrou, e volta a abrir o pedido para conferir.

export default async function EntreguePage({ params, searchParams }: PageProps<"/entregador/[restaurantId]/entregue">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();

  const numero = String((await searchParams).n ?? "");

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {/* o verde grande é a resposta: deu certo, pode guardar o celular */}
      <span className="relative grid size-28 place-items-center rounded-full bg-success text-white shadow-2xl shadow-success/30">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/40" aria-hidden="true" />
        <Check className="relative size-14" strokeWidth={3} aria-hidden="true" />
      </span>

      <div>
        <h1 className="text-3xl font-extrabold">Entrega concluída!</h1>
        <p className="mt-2 text-muted">
          {numero ? `O pedido #${numero} foi entregue.` : "O pedido foi entregue."} Obrigado por fazer parte do time.
        </p>
      </div>

      <Link href={`/entregador/${restaurant.id}`} className={buttonClasses("primary", "lg", "w-full max-w-xs")}>
        Voltar para o início
      </Link>
    </main>
  );
}
