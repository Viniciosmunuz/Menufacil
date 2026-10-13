import { TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { competenciaLabel, type SituacaoDaCobranca } from "@/lib/cobranca";
import { formatCents } from "@/lib/format";

// A mensalidade em atraso, na tela de quem precisa saber.
//
// O dono só descobria que estava devendo quando alguém ligava. O aviso
// aparece aqui porque é a primeira tela que ele abre, e some sozinho
// assim que o pagamento é registrado -- não é cobrança automática nem
// corta nada: o sistema lembra, quem cobra é gente.
//
// Em dia ou a vencer, não aparece nada: avisar quem está certo é ruído
// que ensina a ignorar o aviso de quem está errado.

export function MensalidadeCard({ situacao }: { situacao: SituacaoDaCobranca }) {
  if (situacao.estado !== "vencido") return null;

  const { competencia, centavos, vence, diasEmAtraso } = situacao;

  return (
    <Card className="flex flex-wrap items-center gap-4 border-danger/50 bg-danger/5">
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-danger/15 text-danger">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-extrabold text-danger">
          Mensalidade em atraso · {formatCents(centavos)}
        </p>
        <p className="text-sm text-muted">
          {competenciaLabel(competencia)}, venceu dia {vence} —{" "}
          {diasEmAtraso === 1 ? "há 1 dia" : `há ${diasEmAtraso} dias`}. Fale com o MenuFácil para regularizar.
        </p>
      </div>
    </Card>
  );
}
