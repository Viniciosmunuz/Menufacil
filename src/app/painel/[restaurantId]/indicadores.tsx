import { Bike, ChefHat, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatCents, formatMinutos } from "@/lib/format";
import type { DiaDaSemana, TemposDoAtendimento } from "@/server/stats";

// Os quatro números que o dono procura ao abrir o painel: quanto vendeu,
// quanto vale cada pedido, quanto a cozinha está levando e quanto a
// entrega leva.
//
// Eram dois cartões grandes e uma lista de etapas lá embaixo. Em linha, e
// do tamanho certo, a tela inteira passa a caber numa olhada -- que é o
// tempo que alguém no meio do expediente tem para olhar.
//
// Nenhum número aqui é novo: todos já eram calculados. O que mudou foi a
// hierarquia.

/** a linha fininha do histórico, desenhada do que já veio do servidor */
function Risco({ valores, cor }: { valores: number[]; cor: string }) {
  // menos de três pontos não desenha tendência nenhuma, desenha ruído
  if (valores.length < 3) return null;
  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const vao = maior - menor || 1;
  const passo = 100 / (valores.length - 1);
  const pontos = valores.map((v, i) => `${(i * passo).toFixed(1)},${(26 - ((v - menor) / vao) * 22).toFixed(1)}`);

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-16 shrink-0 sm:w-20" aria-hidden="true">
      <polyline
        points={pontos.join(" ")}
        fill="none"
        stroke={cor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** a variação contra ontem; sem ontem não há variação */
function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior <= 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return null;
  const subiu = pct > 0;
  const Icone = subiu ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-xs font-extrabold", subiu ? "text-success" : "text-danger")}>
      <Icone className="size-3.5" aria-hidden="true" />
      {subiu ? "+" : ""}
      {pct}%
    </span>
  );
}

const TONS = {
  brand: { fundo: "bg-brand-soft text-brand", linha: "var(--color-brand)" },
  info: { fundo: "bg-info/12 text-info", linha: "var(--color-info)" },
  success: { fundo: "bg-success/12 text-success", linha: "var(--color-success)" },
  warning: { fundo: "bg-warning/12 text-warning", linha: "var(--color-warning)" },
} as const;

function Indicador({
  icone,
  tom,
  titulo,
  valor,
  apoio,
  extra,
  serie,
}: {
  icone: ReactNode;
  tom: keyof typeof TONS;
  titulo: string;
  valor: string;
  apoio: string;
  extra?: ReactNode;
  serie?: number[];
}) {
  const { fundo, linha } = TONS[tom];
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-card border border-line bg-surface p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full sm:size-11", fundo)}>{icone}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-bold text-muted">{titulo}</p>
        <p className="mt-0.5 text-[1.6rem] leading-none font-extrabold tabular-nums">{valor}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="truncate">{apoio}</span>
          {extra}
        </p>
      </div>

      {/* a linhinha é o primeiro a sair quando a largura aperta: ela
          enfeita, e o título e o número é que precisam caber */}
      {serie && (
        <span className="hidden 2xl:block">
          <Risco valores={serie} cor={linha} />
        </span>
      )}
    </div>
  );
}

export function Indicadores({
  href,
  pedidos,
  pedidosOntem,
  centavos,
  centavosOntem,
  concluidos,
  semana,
  tempos,
}: {
  href: string;
  pedidos: number;
  pedidosOntem: number;
  centavos: number;
  centavosOntem: number;
  concluidos: number;
  semana: DiaDaSemana[];
  tempos: TemposDoAtendimento;
}) {
  const ticket = pedidos > 0 ? Math.round(centavos / pedidos) : 0;
  const ticketOntem = pedidosOntem > 0 ? Math.round(centavosOntem / pedidosOntem) : 0;

  // as linhinhas saem da mesma semana que o gráfico mostra embaixo: é o
  // único histórico que esta tela já tinha em mãos
  const serieVendas = semana.map((d) => d.centavos);
  const serieTicket = semana.map((d) => (d.pedidos > 0 ? Math.round(d.centavos / d.pedidos) : 0));

  // A frase só aparece quando os dois lados discordam -- é aí que o número
  // sozinho engana: dobrar o movimento com o ticket pela metade parece
  // crescimento e não é.
  const maisPedidos = pedidosOntem > 0 && pedidos > pedidosOntem;
  const menosDinheiro = centavosOntem > 0 && centavos < centavosOntem;
  const leitura =
    maisPedidos && menosDinheiro
      ? "Mais pedidos que ontem, mas cada um está saindo menor."
      : !maisPedidos && pedidosOntem > 0 && pedidos < pedidosOntem && centavos > centavosOntem
        ? "Menos pedidos que ontem, mas cada um está valendo mais."
        : null;

  return (
    <section aria-label="Indicadores de hoje" className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icone={<Wallet className="size-5" aria-hidden="true" />}
          tom="brand"
          titulo="Vendas hoje"
          valor={formatCents(centavos)}
          apoio={`${pedidos} ${pedidos === 1 ? "pedido" : "pedidos"}${concluidos > 0 ? ` · ${concluidos} concluído${concluidos === 1 ? "" : "s"}` : ""}`}
          extra={<Variacao atual={centavos} anterior={centavosOntem} />}
          serie={serieVendas}
        />

        <Indicador
          icone={<Receipt className="size-5" aria-hidden="true" />}
          tom="info"
          titulo="Ticket médio"
          valor={ticket > 0 ? formatCents(ticket) : "—"}
          apoio={ticketOntem > 0 ? `Ontem ${formatCents(ticketOntem)}` : "Por pedido"}
          extra={<Variacao atual={ticket} anterior={ticketOntem} />}
          serie={serieTicket}
        />

        <Indicador
          icone={<ChefHat className="size-5" aria-hidden="true" />}
          tom="success"
          titulo="Na cozinha"
          valor={tempos.cozinha ? formatMinutos(tempos.cozinha.minutos) : "—"}
          apoio={
            tempos.cozinha
              ? `Tempo médio · ${tempos.cozinha.pedidos} ${tempos.cozinha.pedidos === 1 ? "pedido" : "pedidos"}`
              : "Ainda sem pedidos medidos"
          }
        />

        <Indicador
          icone={<Bike className="size-5" aria-hidden="true" />}
          tom="warning"
          titulo="Na entrega"
          valor={tempos.entrega ? formatMinutos(tempos.entrega.minutos) : "—"}
          apoio={
            tempos.entrega
              ? `Tempo médio · ${tempos.entrega.pedidos} ${tempos.entrega.pedidos === 1 ? "entrega" : "entregas"}`
              : "Ainda sem entregas medidas"
          }
        />
      </div>

      {leitura && (
        <p className="rounded-control border border-line bg-surface-2 px-3.5 py-2 text-sm text-muted">
          {leitura}{" "}
          <Link href={href} className="font-bold text-brand hover:underline">
            Ver pedidos
          </Link>
        </p>
      )}
    </section>
  );
}
