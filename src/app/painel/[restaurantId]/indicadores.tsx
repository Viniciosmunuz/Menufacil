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
// Nenhum número aqui é inventado. A linha de cada cartão é medida de
// verdade, dia a dia: dinheiro e ticket saem da mesma semana que o gráfico
// mostra embaixo, cozinha e entrega saem da mediana de cada dia. Dia sem
// medida some da linha em vez de virar um zero que não aconteceu.

/** a linha fininha do histórico; o dia sem medida é pulado */
function Risco({ valores, cor }: { valores: (number | null)[]; cor: string }) {
  const pontos = valores.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  // menos de três pontos não desenha tendência nenhuma, desenha ruído
  if (pontos.length < 3) return <span className="w-14 shrink-0 sm:w-16" aria-hidden="true" />;

  const nums = pontos.map((p) => p.v);
  const maior = Math.max(...nums);
  const menor = Math.min(...nums);
  const vao = maior - menor || 1;
  const passo = valores.length > 1 ? 100 / (valores.length - 1) : 100;
  const d = pontos.map((p) => `${(p.i * passo).toFixed(1)},${(24 - ((p.v - menor) / vao) * 20).toFixed(1)}`);

  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="h-7 w-14 shrink-0 sm:w-16" aria-hidden="true">
      <polyline
        points={d.join(" ")}
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

/**
 * Quanto mudou, em porcento.
 *
 * `menosEMelhor` vira o sinal da cor: no dinheiro subir é bom, no relógio
 * subir é a cozinha atrasando. Sem passado para comparar não há variação --
 * "+100%" contra zero não significa nada e só enfeita.
 */
function Variacao({ atual, anterior, menosEMelhor = false }: { atual: number; anterior: number; menosEMelhor?: boolean }) {
  if (anterior <= 0 || atual <= 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return null;
  const subiu = pct > 0;
  const bom = menosEMelhor ? !subiu : subiu;
  const Icone = subiu ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-xs font-extrabold", bom ? "text-success" : "text-danger")}>
      {subiu ? "+" : ""}
      {pct}%
      <Icone className="size-3.5" aria-hidden="true" />
    </span>
  );
}

const TONS = {
  laranja: { fundo: "bg-brand", linha: "var(--color-brand)" },
  roxo: { fundo: "bg-[#6366f1]", linha: "#6366f1" },
  verde: { fundo: "bg-success", linha: "var(--color-success)" },
  azul: { fundo: "bg-info", linha: "var(--color-info)" },
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
  serie: (number | null)[];
}) {
  const { fundo, linha } = TONS[tom];
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border border-line bg-surface p-4">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-white", fundo)}>{icone}</span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.8rem] leading-tight font-bold text-muted">{titulo}</p>
        <p className="mt-0.5 text-[1.5rem] leading-none font-extrabold tabular-nums">{valor}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.7rem] text-muted">
          <span className="truncate">{apoio}</span>
          {extra}
        </p>
      </div>

      <Risco valores={serie} cor={linha} />
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

  // dinheiro e ticket saem da mesma semana que o gráfico mostra embaixo
  const serieVendas = semana.map((d) => (d.centavos > 0 ? d.centavos : null));
  const serieTicket = semana.map((d) => (d.pedidos > 0 ? Math.round(d.centavos / d.pedidos) : null));

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
          tom="laranja"
          titulo="Vendas hoje"
          valor={formatCents(centavos)}
          apoio={`${pedidos} ${pedidos === 1 ? "pedido" : "pedidos"}${concluidos > 0 ? ` · ${concluidos} concluído${concluidos === 1 ? "" : "s"}` : ""}`}
          extra={<Variacao atual={centavos} anterior={centavosOntem} />}
          serie={serieVendas}
        />

        <Indicador
          icone={<Receipt className="size-5" aria-hidden="true" />}
          tom="roxo"
          titulo="Ticket médio"
          valor={ticket > 0 ? formatCents(ticket) : "—"}
          apoio="Por pedido"
          extra={<Variacao atual={ticket} anterior={ticketOntem} />}
          serie={serieTicket}
        />

        <Indicador
          icone={<ChefHat className="size-5" aria-hidden="true" />}
          tom="verde"
          titulo="Na cozinha"
          valor={tempos.cozinha ? formatMinutos(tempos.cozinha.minutos) : "—"}
          apoio={tempos.cozinha ? "Tempo médio" : "Ainda sem medida"}
          extra={
            tempos.cozinha && tempos.normal?.cozinha ? (
              <Variacao atual={tempos.cozinha.minutos} anterior={tempos.normal.cozinha.minutos} menosEMelhor />
            ) : null
          }
          serie={tempos.serie.cozinha}
        />

        <Indicador
          icone={<Bike className="size-5" aria-hidden="true" />}
          tom="azul"
          titulo="Na entrega"
          valor={tempos.entrega ? formatMinutos(tempos.entrega.minutos) : "—"}
          apoio={tempos.entrega ? "Tempo médio" : "Ainda sem medida"}
          extra={
            tempos.entrega && tempos.normal?.entrega ? (
              <Variacao atual={tempos.entrega.minutos} anterior={tempos.normal.entrega.minutos} menosEMelhor />
            ) : null
          }
          serie={tempos.serie.entrega}
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
