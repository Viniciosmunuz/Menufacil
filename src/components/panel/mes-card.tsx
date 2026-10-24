import { CalendarDays } from "lucide-react";

import { Card } from "@/components/ui/card";
import { competenciaLabel } from "@/lib/cobranca";
import { formatCents } from "@/lib/format";
import type { DiaDoMes, MesAteAgora } from "@/server/stats";

// O mês até agora, com os dois dias que se destacaram.
//
// O gráfico da semana diz como foram os últimos dias; este cartão responde
// a pergunta do fim do mês: quanto entrou, em que dia saiu mais pedido e
// em que dia mais entrou dinheiro. São dois dias e não um porque pedem
// coisas diferentes -- muito pedido pequeno pede entregador, pedido grande
// pede cozinha.

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "sex, 17/10": o dia da semana é o que o dono lembra, a data confirma */
function rotulo(key: string) {
  const [ano, mes, dia] = key.split("-").map(Number);
  const semana = DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${semana}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

function Destaque({ titulo, dia, valor }: { titulo: string; dia: DiaDoMes; valor: string }) {
  return (
    <div className="min-w-0 rounded-control bg-surface-2 px-4 py-3">
      <p className="text-xs font-bold tracking-wide text-faint uppercase">{titulo}</p>
      <p className="mt-1 font-extrabold">{rotulo(dia.key)}</p>
      <p className="text-sm text-muted tabular-nums">{valor}</p>
    </div>
  );
}

export function MesCard({ mes }: { mes: MesAteAgora }) {
  const nome = competenciaLabel(mes.competencia);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-extrabold">
            <CalendarDays className="size-5 text-brand" aria-hidden="true" />
            <span className="first-letter:uppercase">{nome}</span>
          </p>
          <p className="text-sm text-muted">O mês até agora.</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-extrabold tabular-nums">{formatCents(mes.centavos)}</p>
          <p className="text-sm text-muted tabular-nums">{mes.pedidos === 1 ? "1 pedido" : `${mes.pedidos} pedidos`}</p>
        </div>
      </div>

      {mes.maisPedidos && mes.maisVendido ? (
        <div className="grid grid-cols-2 gap-3">
          <Destaque
            titulo="Mais pedidos"
            dia={mes.maisPedidos}
            valor={mes.maisPedidos.pedidos === 1 ? "1 pedido" : `${mes.maisPedidos.pedidos} pedidos`}
          />
          <Destaque titulo="Mais vendeu" dia={mes.maisVendido} valor={formatCents(mes.maisVendido.centavos)} />
        </div>
      ) : (
        <p className="text-sm text-muted">Assim que entrarem os primeiros pedidos do mês, os melhores dias aparecem aqui.</p>
      )}
    </Card>
  );
}
