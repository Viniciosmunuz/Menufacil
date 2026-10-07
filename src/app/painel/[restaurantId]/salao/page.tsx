import { LayoutGrid, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SalaoComBusca } from "@/components/panel/busca-mesa";
import { CaixaDoSalaoPanel } from "@/components/panel/caixa-salao";
import { PageHeader } from "@/components/panel/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { requireSalao } from "@/server/auth/dal";
import { caixaDoSalao } from "@/server/salao/caixa";
import { mapaDoSalao } from "@/server/salao/mesas";

export const metadata: Metadata = { title: "Salão" };

// O salão visto pelo dono.
//
// A mesma pergunta da tela de Pedidos -- o que está acontecendo agora --,
// só que nas mesas. Por isso ela mora logo abaixo de Pedidos no menu, e não
// num painel separado.
//
// Três abas que deslizam: mesas, balcão e caixa. Nada de cartões de resumo
// no topo nem legenda de cores: eram números que repetiam o que a grade já
// diz, e empurravam as mesas -- o motivo da tela -- para baixo da dobra.

export default async function SalaoPage({ params }: PageProps<"/painel/[restaurantId]/salao">) {
  const { restaurantId } = await params;
  // o recurso é liberado pelo admin da plataforma; sem ele, esta página não
  // existe -- nem para quem digitar o endereço na mão
  const { restaurant } = await requireSalao(restaurantId);
  const base = `/painel/${restaurant.id}/salao`;

  const horarios = await db.openingHour.findMany({
    where: { restaurantId: restaurant.id },
    select: { weekday: true, opensAt: true, closesAt: true, closed: true },
  });
  const [salao, caixa] = await Promise.all([mapaDoSalao(restaurant.id), caixaDoSalao(restaurant.id, horarios)]);

  const engrenagem = (
    <Link
      href={`${base}/configuracao`}
      aria-label="Configuração do salão: mesas, balcão e garçons"
      title="Mesas, balcão e garçons"
      className="grid size-12 shrink-0 place-items-center rounded-control border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <Settings2 className="size-5" aria-hidden="true" />
    </Link>
  );

  if (salao.mesas.length === 0 && salao.balcoes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Salão" description="As mesas agora." actions={engrenagem} />
        <EmptyState icon={<LayoutGrid />} title="Nenhuma mesa ainda">
          Diga quantas mesas e quantos lugares de balcão o salão tem, e eles aparecem aqui numerados.
          <span className="mt-4 block">
            <Link href={`${base}/configuracao`} className={buttonClasses("primary")}>
              Definir as mesas
            </Link>
          </span>
        </EmptyState>
      </div>
    );
  }

  const cols = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  return (
    <div className="flex flex-col gap-5">
      {/* a busca tomou o lugar do título: "toque numa mesa para ver a
          comanda" se lê uma vez na vida e ocupava a tela todo dia */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <SalaoComBusca
            mesas={salao.mesas}
            balcoes={salao.balcoes}
            base={base}
            cols={cols}
            caixa={<CaixaDoSalaoPanel caixa={caixa} />}
          />
        </div>
        {engrenagem}
      </div>
    </div>
  );
}
