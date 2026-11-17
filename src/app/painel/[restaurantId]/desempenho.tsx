import { ChevronRight, LineChart, Trophy, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

// O rodapé da Visão geral: para onde ir depois de olhar o movimento.
//
// Mês, campeões e clientes eram três cartões grandes nesta tela, disputando
// espaço com o que pede decisão agora. Viraram três atalhos para telas
// próprias, onde cada assunto cabe inteiro -- a lista de clientes do mês
// não são cinco nomes, são todos.

function Atalho({ icone, titulo, apoio, href }: { icone: ReactNode; titulo: string; apoio: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-control border border-line bg-bg px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      {/* A regra dos ícones desta tela, desde 16/11/2026:
          cor só quando ela diz um estado (verde para aberto, vermelho
          para o que está errado). Ícone de título e de atalho é traço
          fino cinza, sem bolinha atrás. Aqui eram três discos laranja
          numa fileira, e o laranja nesta marca é do que se toca --
          gastá-lo em enfeite tira força dos botões de verdade. */}
      <span className="shrink-0 text-faint">{icone}</span>
      {/* Sem `truncate`: em três colunas os nomes não cabiam numa linha e
          chegavam cortados na tela -- "Produtos mai…", "Fechamento …",
          que não dizem para onde o atalho leva. Quebrar em duas linhas
          custa um pouco de altura e entrega o nome inteiro. */}
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight font-extrabold">{titulo}</span>
        <span className="mt-0.5 block text-xs leading-tight text-muted">{apoio}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
    </Link>
  );
}

export function DesempenhoCard({ base }: { base: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* "Acompanhe os principais indicadores do seu negócio" saiu:
              os três atalhos logo abaixo dizem, com nome e tudo, quais
              indicadores são. Um subtítulo que anuncia o que vem a
              seguir é o tipo de linha que se lê uma vez e nunca mais. */}
          <span className="shrink-0 text-faint">
            <LineChart className="size-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Desempenho</h2>
        </div>
        {/* O mês saía escrito aqui, com um atalho para trocá-lo. Saiu em
            15/11/2026, a pedido dele: o mês se escolhe dentro de cada
            tela, onde o seletor já existe. */}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Atalho
          icone={<Trophy className="size-5" aria-hidden="true" />}
          titulo="Produtos mais vendidos"
          apoio="Ranking por item"
          href={`${base}/resumo#produtos`}
        />
        <Atalho
          icone={<Users className="size-5" aria-hidden="true" />}
          titulo="Clientes frequentes"
          apoio="Pedidos e valor gasto"
          href={`${base}/clientes`}
        />
        <Atalho
          icone={<Wallet className="size-5" aria-hidden="true" />}
          titulo="Fechamento mensal"
          apoio="Vendas e resultados"
          href={`${base}/resumo`}
        />
      </div>
    </Card>
  );
}
