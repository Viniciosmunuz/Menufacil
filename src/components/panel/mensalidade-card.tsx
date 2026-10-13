import { MessageCircle, TriangleAlert } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { competenciaLabel, type SituacaoDaCobranca } from "@/lib/cobranca";
import { linkWhatsappMenuFacil } from "@/lib/contato";
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

export function MensalidadeCard({ situacao, restaurante }: { situacao: SituacaoDaCobranca; restaurante: string }) {
  if (situacao.estado !== "vencido") return null;

  const { competencia, centavos, vence, diasEmAtraso } = situacao;
  // a conversa já abre dizendo quem é e de que mês se trata: do outro lado,
  // "oi" sem contexto vira uma pergunta a mais no meio do movimento
  const whatsapp = linkWhatsappMenuFacil(
    `Olá! Sou do ${restaurante} e quero regularizar a mensalidade do MenuFácil de ${competenciaLabel(competencia)}.`,
  );

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
          {diasEmAtraso === 1 ? "há 1 dia" : `há ${diasEmAtraso} dias`}.
        </p>
      </div>

      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "sm", "shrink-0")}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Falar no WhatsApp
        </a>
      )}
    </Card>
  );
}
