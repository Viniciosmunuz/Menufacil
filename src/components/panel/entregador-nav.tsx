"use client";

import { Bike, Clock, House, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

// A barra de baixo do entregador, igual à do garçom.
//
// Quem usa isto está de capacete na mão, parado na calçada, com o celular
// numa mão só: tudo que se toca fica embaixo, no caminho do polegar.

const ITENS = [
  { chave: "inicio", titulo: "Início", icone: House },
  { chave: "entregas", titulo: "Entregas", icone: Bike },
  { chave: "historico", titulo: "Histórico", icone: Clock },
  { chave: "perfil", titulo: "Perfil", icone: User },
] as const;

export function EntregadorNav({ base }: { base: string }) {
  const caminho = usePathname();

  const href = (chave: string) => (chave === "inicio" ? base : `${base}/${chave}`);
  const ativo = (chave: string) => (chave === "inicio" ? caminho === base : caminho.startsWith(`${base}/${chave}`));

  return (
    <nav
      aria-label="Seções"
      className="sticky bottom-0 -mx-4 mt-auto border-t border-line bg-bg/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
    >
      <ul className="flex">
        {ITENS.map(({ chave, titulo, icone: Icone }) => {
          const aceso = ativo(chave);
          return (
            <li key={chave} className="flex-1">
              <Link
                href={href(chave)}
                aria-current={aceso ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 pt-2 text-xs font-bold transition-colors",
                  aceso ? "text-brand" : "text-faint hover:text-muted",
                )}
              >
                <Icone className="size-5" aria-hidden="true" />
                {titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
