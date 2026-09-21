import { ChefHat, Store } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** "É dono de um restaurante?" (home e coluna da direita) */
export function OwnerCta({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-brand/60 bg-[linear-gradient(160deg,rgb(255_138_31/0.14),transparent_70%)] p-5",
        className,
      )}
    >
      <Store className="size-10 text-brand" strokeWidth={1.6} aria-hidden="true" />
      <h2 className="text-xl leading-tight font-extrabold">É dono de um restaurante?</h2>
      <p className="text-muted">Cadastre seu estabelecimento e comece a receber pedidos em poucos minutos.</p>
      <Link href="/cadastre-seu-restaurante" className={buttonClasses("primary", "md", "mt-1")}>
        Quero cadastrar
      </Link>
    </div>
  );
}

/** versão menor, do menu lateral */
export function OwnerCtaSmall() {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <ChefHat className="size-8 text-brand" strokeWidth={1.6} aria-hidden="true" />
      <p className="text-lg leading-tight font-extrabold">Seu restaurante aqui!</p>
      <p className="text-sm text-muted">Faça parte da nossa plataforma e alcance mais clientes.</p>
      <Link href="/cadastre-seu-restaurante" className={buttonClasses("outline", "sm", "mt-2")}>
        Cadastre seu restaurante
      </Link>
    </div>
  );
}
