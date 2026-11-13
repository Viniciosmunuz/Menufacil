import { Bike, ChefHat, Receipt, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatCents, formatMinutos } from "@/lib/format";
import type { TemposDoAtendimento } from "@/server/stats";

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
    // Pílula, e não texto solto: a variação é o que o olho procura
    // depois do número, e com fundo ela se separa da linha de apoio sem
    // precisar de outra linha só para ela.
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-extrabold",
        bom ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <Icone className="size-3.5" aria-hidden="true" />
      {subiu ? "+" : ""}
      {pct}%
    </span>
  );
}

/**
 * O tom de cada cartão: fundo claro no selo, ícone na cor cheia.
 *
 * Antes o selo era um círculo da cor cheia com o ícone branco. Quatro
 * círculos saturados em linha puxavam o olho antes dos números, que são
 * o assunto -- e é por isso que o painel que ele mandou como referência
 * usa o inverso: a cor fica no véu, e o preto fica no valor.
 */
const TONS = {
  laranja: "bg-brand-soft text-brand",
  ambar: "bg-warning-soft text-warning",
  verde: "bg-success-soft text-success",
  azul: "bg-info-soft text-info",
} as const;

function Indicador({
  icone,
  tom,
  titulo,
  valor,
  apoio,
  detalhe,
  extra,
}: {
  icone: ReactNode;
  tom: keyof typeof TONS;
  titulo: string;
  valor: string;
  /** a frase ao lado da variação: "vs ontem", "Tempo médio" */
  apoio: string;
  /** a linha de contagem, quando existe: "6 pedidos · 6 concluídos" */
  detalhe?: { icone: ReactNode; texto: string };
  extra?: ReactNode;
}) {
  return (
    /* O cartão no molde que ele mandou: selo de cor clara, o valor em
     * corpo grande logo abaixo do título, e a variação numa pílula no pé.
     *
     * O risco de sete dias saiu daqui. Ele existia para dar contexto ao
     * número do dia, e a pílula dá o mesmo contexto com uma conta que se
     * lê de relance ("+55% vs ontem") em vez de uma linha que o olho tem
     * de interpretar. O histórico continua inteiro no gráfico de sete
     * dias logo abaixo, que é maior e tem eixo. */
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-[1.1rem]", TONS[tom])}>{icone}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] leading-tight font-bold text-muted">{titulo}</p>
          <p className="mt-1 text-[1.65rem] leading-none font-extrabold tabular-nums">{valor}</p>
        </div>
      </div>

      {detalhe && (
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <span className="shrink-0 text-faint">{detalhe.icone}</span>
          <span className="truncate">{detalhe.texto}</span>
        </p>
      )}

      <p className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted">
        {extra}
        <span className="truncate">{apoio}</span>
      </p>
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
  tempos,
}: {
  href: string;
  pedidos: number;
  pedidosOntem: number;
  centavos: number;
  centavosOntem: number;
  concluidos: number;
  tempos: TemposDoAtendimento;
}) {
  const ticket = pedidos > 0 ? Math.round(centavos / pedidos) : 0;
  const ticketOntem = pedidosOntem > 0 ? Math.round(centavosOntem / pedidosOntem) : 0;

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
          apoio="vs ontem"
          detalhe={{
            icone: <ShoppingCart className="size-3.5" aria-hidden="true" />,
            texto: `${pedidos} ${pedidos === 1 ? "pedido" : "pedidos"}${concluidos > 0 ? ` · ${concluidos} concluído${concluidos === 1 ? "" : "s"}` : ""}`,
          }}
          extra={<Variacao atual={centavos} anterior={centavosOntem} />}
        />

        <Indicador
          icone={<Receipt className="size-5" aria-hidden="true" />}
          tom="ambar"
          titulo="Ticket médio"
          valor={ticket > 0 ? formatCents(ticket) : "—"}
          apoio="vs ontem"
          extra={<Variacao atual={ticket} anterior={ticketOntem} />}
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
