"use client";

import { Clock, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

// A barra de baixo do garçom.
//
// Fica no alcance do polegar, que é onde a mão já está: quem segura o
// celular com uma mão só, atravessando o salão, não leva o dedo até o topo
// da tela para trocar de seção.
//
// Em Ajustes fica a conta aberta neste aparelho, o que o garçom pode fazer
// e a saída. Em Histórico, só o que o próprio garçom fez no dia.

const ITENS = [
  { chave: "inicio", titulo: "Mesas", icone: House },
  { chave: "historico", titulo: "Histórico", icone: Clock },
  { chave: "ajustes", titulo: "Ajustes", icone: Settings },
] as const;

export function GarcomNav({ base }: { base: string }) {
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
