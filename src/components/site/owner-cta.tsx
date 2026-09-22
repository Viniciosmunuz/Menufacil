import { ChefHat, Store } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** "É dono de um restaurante?" (home e coluna da direita); compact = ao lado do destaque no celular */
export function OwnerCta({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-card border border-brand/70 bg-[linear-gradient(160deg,rgb(255_138_31/0.16),rgb(255_138_31/0.03)_60%)]",
        compact ? "gap-2 p-3.5" : "gap-3 p-5",
        className,
      )}
    >
      <Store className={cn("text-brand", compact ? "size-8" : "size-10")} strokeWidth={1.6} aria-hidden="true" />
      <h2 className={cn("leading-tight font-extrabold", compact ? "text-[1.05rem]" : "text-xl")}>É dono de um restaurante?</h2>
      <p className={cn("text-muted", compact ? "text-[0.78rem] leading-snug" : "")}>
        Cadastre seu estabelecimento e comece a receber pedidos em poucos minutos.
      </p>
      <Link
        href="/cadastre-seu-restaurante"
        className={cn(buttonClasses("primary", compact ? "sm" : "md"), "mt-auto w-full", compact && "h-10 px-2 text-[0.8rem]")}
      >
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
