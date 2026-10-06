import { Bike, ChefHat, Hand, Timer, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMinutos } from "@/lib/format";
import type { Etapa, TemposDoAtendimento } from "@/server/stats";

// Quanto tempo o atendimento leva, etapa por etapa.
//
// A hora de cada mudança de status já era guardada desde sempre e nunca
// tinha sido lida. Ela responde a pergunta que o cliente faz em todo
// pedido -- "quanto tempo demora?" --, que até aqui era respondida por
// chute, e mostra em qual etapa o tempo está indo embora.
//
// Mediana, não média: um pedido esquecido aberto a noite toda não é o
// atendimento normal da casa, mas estragaria qualquer média.
//
// E são os últimos pedidos, não o mês inteiro: a pergunta no serviço não é
// "quanto a cozinha leva em média" -- é "quanto ela está levando agora". A
// média de trinta dias dilui a noite ruim de hoje em trinta noites boas.

/**
 * O que conta como diferença de verdade.
 *
 * Dois minutos a mais numa cozinha de vinte e seis é o dia sendo dia. Se
 * cada variação virasse aviso, o aviso deixaria de ser lido -- por isso a
 * mudança só aparece quando é grande em minutos E em proporção.
 */
const MINUTOS_PARA_AVISAR = 5;
const PARTE_PARA_AVISAR = 0.25;

function Diferenca({ etapa, antes }: { etapa: Etapa; antes: Etapa | null }) {
  if (!antes) return null;
  const delta = etapa.minutos - antes.minutos;
  const vale = Math.abs(delta) >= MINUTOS_PARA_AVISAR && Math.abs(delta) >= antes.minutos * PARTE_PARA_AVISAR;
  if (!vale) return null;

  const piorou = delta > 0;
  const Icone = piorou ? TrendingUp : TrendingDown;
  return (
    <span className={cn("flex shrink-0 items-center gap-1 text-xs font-bold", piorou ? "text-warning" : "text-success")}>
      <Icone className="size-3.5 shrink-0" aria-hidden="true" />
      {formatMinutos(Math.abs(delta))} {piorou ? "acima" : "abaixo"} do normal
    </span>
  );
}

function Linha({ icone, titulo, etapa, antes }: { icone: ReactNode; titulo: string; etapa: Etapa | null; antes: Etapa | null }) {
  if (!etapa) return null;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">{icone}</span>
      <span className="min-w-0 flex-1 font-bold">{titulo}</span>
      <span className="shrink-0 text-lg font-extrabold tabular-nums">{formatMinutos(etapa.minutos)}</span>
      {/* a comparação na linha de baixo, para não espremer o número */}
      <span className="w-full pl-13">
        <Diferenca etapa={etapa} antes={antes} />
      </span>
    </li>
  );
}

export function TemposCard({ tempos }: { tempos: TemposDoAtendimento }) {
  const { aceite, cozinha, entrega, total, normal } = tempos;

  // sem nenhuma etapa medida não há cartão: melhor não existir do que
  // mostrar travessões onde deveria haver minutos
  if (!aceite && !cozinha && !entrega && !total) return null;

  // a etapa mais demorada é onde mexer muda alguma coisa; dizer isso evita
  // que o dono olhe três números e não saiba o que fazer com eles
  const maior = [
    { nome: "o preparo na cozinha", etapa: cozinha },
    { nome: "a entrega", etapa: entrega },
    { nome: "o tempo até aceitar o pedido", etapa: aceite },
  ]
    .filter((x): x is { nome: string; etapa: Etapa } => !!x.etapa)
    .sort((a, b) => b.etapa.minutos - a.etapa.minutos)[0];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Quanto tempo leva</h2>
          <p className="text-sm text-muted">Como está saindo agora, nos últimos pedidos entregues.</p>
        </div>
        <Timer className="size-5 text-faint" aria-hidden="true" />
      </div>

      <ul className="flex flex-col divide-y divide-line">
        <Linha icone={<Hand className="size-5" aria-hidden="true" />} titulo="Até aceitar" etapa={aceite} antes={normal?.aceite ?? null} />
        <Linha icone={<ChefHat className="size-5" aria-hidden="true" />} titulo="Na cozinha" etapa={cozinha} antes={normal?.cozinha ?? null} />
        <Linha icone={<Bike className="size-5" aria-hidden="true" />} titulo="Na entrega" etapa={entrega} antes={normal?.entrega ?? null} />
      </ul>

      {total && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
          {/* sem etapa de entrega o pedido não vai a lugar nenhum: na
              retirada o relógio para quando o prato fica pronto */}
          <span className="font-bold">{entrega ? "Do pedido à entrega" : "Do pedido até ficar pronto"}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tabular-nums">{formatMinutos(total.minutos)}</span>
            <Diferenca etapa={total} antes={normal?.total ?? null} />
          </span>
          {/* o número que o balcão pode dizer ao cliente sem medo, e de
              quantos pedidos ele saiu */}
          <span className="w-full text-sm text-muted">
            É o tempo que dá para prometer ao cliente agora. Medido nos últimos {total.pedidos}{" "}
            {total.pedidos === 1 ? "pedido" : "pedidos"}
            {maior && `, e o que mais pesa é ${maior.nome}`}.
          </span>
        </div>
      )}
    </Card>
  );
}
