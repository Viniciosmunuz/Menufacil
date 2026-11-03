"use client";

import { Clock, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

// A barra de baixo do entregador.
//
// Solta do rodapé, flutuando sobre a tela, como a dos aplicativos de
// corrida: é o que faz a tela parecer aplicativo, e não página rolando
// dentro de um navegador. Fica no alcance do polegar, que é onde a mão já
// está -- quem segura o celular com uma mão só, de capacete na outra, não
// leva o dedo até o topo da tela para trocar de seção.
//
// A seção aberta vira uma pílula laranja: o alvo do dedo cresce junto, e é
// isso que faz acertar em movimento.

// Três, e não quatro: a lista de entregas virou o miolo do Início -- o
// que ele faz o tempo todo é olhar o que tem para levar, e isso não
// merecia uma aba separada da tela que ele abre primeiro.
const ITENS = [
  { chave: "inicio", titulo: "Início", icone: House },
  { chave: "historico", titulo: "Histórico", icone: Clock },
  { chave: "configuracoes", titulo: "Configurações", icone: Settings },
] as const;

export function EntregadorNav({ base }: { base: string }) {
  const caminho = usePathname();

  const href = (chave: string) => (chave === "inicio" ? base : `${base}/${chave}`);
  const ativo = (chave: string) => (chave === "inicio" ? caminho === base : caminho.startsWith(`${base}/${chave}`));

  return (
    <nav
      aria-label="Seções"
      className="sticky bottom-0 z-20 mt-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="flex items-center gap-1 rounded-full border border-line bg-bg/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur">
        {ITENS.map(({ chave, titulo, icone: Icone }) => {
          const aceso = ativo(chave);
          return (
            <li key={chave} className="flex-1">
              <Link
                href={href(chave)}
                aria-current={aceso ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[0.65rem] font-bold transition-colors",
                  aceso ? "bg-brand text-brand-ink" : "text-faint",
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
