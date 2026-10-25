import { DollarSign, Headset, History, LayoutGrid, Settings, Wallet } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { SalaoComBusca } from "@/components/panel/busca-mesa";
import { CaixaFechado } from "@/components/panel/caixa-salao";
import { PageHeader } from "@/components/panel/page-header";
import { buttonClasses } from "@/components/ui/button";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSalao } from "@/server/auth/dal";

import { AbrirCaixaForm } from "./caixa-form";
import { turnoAberto } from "@/server/salao/turno";
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

  const [salao, turno] = await Promise.all([mapaDoSalao(restaurant.id), turnoAberto(restaurant.id)]);

  // "Configuração geral", como no Yooga: mesas, balcão, garçons e impressão
  const engrenagem = (
    <Link
      href={`${base}/configuracao`}
      title="Mesas, balcão, garçons e impressão"
      className="inline-flex h-14 shrink-0 items-center gap-2 rounded-control bg-surface-3 px-5 font-semibold text-ink transition-colors hover:bg-line"
    >
      <Settings className="size-5 text-brand" aria-hidden="true" />
      <span className="hidden sm:inline">Configuração geral</span>
    </Link>
  );

  // O topo, no jeito do Yooga: o título à esquerda e os atalhos do dia a
  // dia à direita. O verde do totem é o mesmo botão de destaque de lá.
  const topo = (extra?: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-extrabold">Salão</h1>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <Link
          href={`/painel/${restaurant.id}/suporte`}
          className="inline-flex h-11 items-center gap-2 rounded-control px-3 font-semibold text-ink/80 hover:bg-surface-2"
        >
          <Headset className="size-5" aria-hidden="true" />
          Suporte
        </Link>
        <Link href={`${base}/caixa`} className="inline-flex h-11 items-center gap-2 rounded-control px-3 font-semibold text-ink/80 hover:bg-surface-2">
          <Wallet className="size-5" aria-hidden="true" />
          Caixa
        </Link>
        <Link href={`${base}/historico`} className="inline-flex h-11 items-center gap-2 rounded-control px-3 font-semibold text-ink/80 hover:bg-surface-2">
          <History className="size-5" aria-hidden="true" />
          Histórico
        </Link>
        {restaurant.totemEnabled && (
          <Link
            href={`/painel/${restaurant.id}/totem`}
            className="inline-flex h-12 items-center gap-2 rounded-control bg-[#8ee6b0] px-5 font-semibold text-[#0f3d22] shadow-sm transition-colors hover:bg-[#7ddba2]"
          >
            <DollarSign className="size-5" aria-hidden="true" />
            Totem de Autoatendimento
          </Link>
        )}
        {extra}
      </div>
    </div>
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

  // Caixa fechado: a tela inteira diz isso, e não só a aba Caixa.
  //
  // Quem abre o salão às seis da tarde quer saber de uma coisa: dá para
  // começar. Mostrar o mapa com todas as mesas livres e esconder o aviso
  // atrás de uma aba faria o dono tocar numa mesa, tentar lançar e só aí
  // descobrir que o salão não abriu.
  if (!turno) {
    return (
      <div className="flex min-h-[calc(100dvh-12rem)] flex-col gap-5">
        {topo(engrenagem)}
        <CaixaFechado abrir={<AbrirCaixaForm restaurantId={restaurant.id} />} />
      </div>
    );
  }
  // quatro por linha no computador, e não seis: com seis, o cartão ficava
  // do tamanho de um botão e o número da mesa -- que é o que se procura
  // atravessando o salão -- virava letra miúda. No celular seguem dois.
  const cols = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <div className="flex flex-col gap-5">
      {/* o cartão fica roxo quando um garçom abre a mesa no celular: a tela
          do caixa se renova sozinha para mostrar isso */}
      <AutoRefresh seconds={15} background />
      {topo()}
      <SalaoComBusca
        mesas={salao.mesas}
        balcoes={salao.balcoes}
        base={base}
        cols={cols}
        acao={engrenagem}
      />
    </div>
  );
}
