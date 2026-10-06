import { Bike, ChefHat, Hand, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
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

function Linha({ icone, titulo, etapa }: { icone: ReactNode; titulo: string; etapa: Etapa | null }) {
  if (!etapa) return null;
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">{icone}</span>
      <span className="min-w-0 flex-1 font-bold">{titulo}</span>
      <span className="shrink-0 text-lg font-extrabold tabular-nums">{formatMinutos(etapa.minutos)}</span>
    </li>
  );
}

export function TemposCard({ tempos }: { tempos: TemposDoAtendimento }) {
  const { aceite, cozinha, entrega, total } = tempos;

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
          <p className="text-sm text-muted">Um pedido comum dos últimos 30 dias.</p>
        </div>
        <Timer className="size-5 text-faint" aria-hidden="true" />
      </div>

      <ul className="flex flex-col divide-y divide-line">
        <Linha icone={<Hand className="size-5" aria-hidden="true" />} titulo="Até aceitar" etapa={aceite} />
        <Linha icone={<ChefHat className="size-5" aria-hidden="true" />} titulo="Na cozinha" etapa={cozinha} />
        <Linha icone={<Bike className="size-5" aria-hidden="true" />} titulo="Na entrega" etapa={entrega} />
      </ul>

      {total && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
          {/* sem etapa de entrega o pedido não vai a lugar nenhum: na
              retirada o relógio para quando o prato fica pronto */}
          <span className="font-bold">{entrega ? "Do pedido à entrega" : "Do pedido até ficar pronto"}</span>
          <span className="text-2xl font-extrabold tabular-nums">{formatMinutos(total.minutos)}</span>
          {/* o número que o balcão pode dizer ao cliente sem medo, e de
              quantos pedidos ele saiu */}
          <span className="w-full text-sm text-muted">
            É o tempo que dá para prometer ao cliente. Medido em {total.pedidos} {total.pedidos === 1 ? "pedido" : "pedidos"}
            {maior && `, e o que mais pesa é ${maior.nome}`}.
          </span>
        </div>
      )}
    </Card>
  );
}
