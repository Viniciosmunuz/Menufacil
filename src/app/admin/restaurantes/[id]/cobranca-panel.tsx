"use client";

import { CircleAlert, CircleCheck, Clock, Wallet } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Plan } from "@/generated/prisma/enums";
import { PLANOS, competenciaLabel, type SituacaoDaCobranca } from "@/lib/cobranca";
import { cn } from "@/lib/cn";
import { formatCents, formatWhen } from "@/lib/format";

import { desfazerMensalidade, registrarMensalidade, setPlano, type AdminFormState } from "../actions";

// A mensalidade deste restaurante.
//
// O MenuFácil não cobra ninguém e não corta nada: a cobrança acontece por
// fora (Pix, combinado), e aqui fica o registro. É essa anotação que faz a
// pergunta "pagou setembro?" ter uma resposta com data em vez de memória --
// e, com mais de um ou dois restaurantes, memória não serve.
//
// Vencido aparece em vermelho e para por aí. Tirar do ar um restaurante
// aberto por um erro de cadastro custaria muito mais do que o atraso.

const vazio: AdminFormState = {};

function Situacao({ s }: { s: SituacaoDaCobranca }) {
  if (s.estado === "sem-plano") {
    return (
      <p className="flex items-center gap-2 text-muted">
        <Wallet className="size-5 shrink-0" aria-hidden="true" />
        Sem plano definido. Este restaurante não entra na cobrança.
      </p>
    );
  }
  if (s.estado === "pago") {
    return (
      <p className="flex flex-wrap items-center gap-2 font-bold text-success">
        <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
        {competenciaLabel(s.competencia)} pago
        <span className="font-semibold text-muted">
          {formatCents(s.centavos)} · {formatWhen(s.pagoEm)}
        </span>
      </p>
    );
  }
  if (s.estado === "a-vencer") {
    return (
      <p className="flex flex-wrap items-center gap-2 font-bold">
        <Clock className="size-5 shrink-0 text-muted" aria-hidden="true" />
        {formatCents(s.centavos)} de {competenciaLabel(s.competencia)}
        <span className="font-semibold text-muted">
          {s.faltam === 0 ? `vence hoje, dia ${s.vence}` : `vence dia ${s.vence}, em ${s.faltam} ${s.faltam === 1 ? "dia" : "dias"}`}
        </span>
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-2 font-bold text-danger">
      <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
      {formatCents(s.centavos)} de {competenciaLabel(s.competencia)} em atraso
      <span className="font-semibold text-muted">
        venceu dia {s.vence} · {s.diasEmAtraso} {s.diasEmAtraso === 1 ? "dia" : "dias"}
      </span>
    </p>
  );
}

export function CobrancaPanel({
  restaurantId,
  plan,
  billingDay,
  situacao,
  historico,
}: {
  restaurantId: string;
  plan: Plan | null;
  billingDay: number | null;
  situacao: SituacaoDaCobranca;
  historico: { competencia: string; amountCents: number; paidAt: Date; note: string | null }[];
}) {
  const [planoState, salvarPlano] = useActionState<AdminFormState, FormData>(setPlano, vazio);
  const [pagoState, registrar] = useActionState<AdminFormState, FormData>(registrarMensalidade, vazio);
  const esteMes = situacao.estado !== "sem-plano" ? situacao.competencia : null;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Mensalidade</h2>
          <p className="text-sm text-muted">A cobrança acontece por fora. Aqui fica o registro do que entrou.</p>
        </div>
        {situacao.estado === "vencido" && <Badge tone="danger">Em atraso</Badge>}
      </div>

      <div className={cn("rounded-control px-4 py-3", situacao.estado === "vencido" ? "bg-danger/10" : "bg-surface-2")}>
        <Situacao s={situacao} />
      </div>

      {(planoState.error || pagoState.error) && <Alert tone="danger">{planoState.error ?? pagoState.error}</Alert>}
      {(planoState.message || pagoState.message) && <Alert tone="success">{planoState.message ?? pagoState.message}</Alert>}

      <form action={salvarPlano} className="flex flex-col gap-4">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Plano" htmlFor="plan">
            <Select id="plan" name="plan" defaultValue={plan ?? ""}>
              <option value="">Sem plano</option>
              {(Object.keys(PLANOS) as Plan[]).map((p) => (
                <option key={p} value={p}>
                  {PLANOS[p].nome} · {formatCents(PLANOS[p].centavos)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vence todo dia" htmlFor="billingDay" error={planoState.fieldErrors?.billingDay} hint="De 1 a 31.">
            <Input
              id="billingDay"
              name="billingDay"
              type="number"
              min={1}
              max={31}
              defaultValue={billingDay ?? ""}
              placeholder="5"
              aria-invalid={!!planoState.fieldErrors?.billingDay}
            />
          </Field>
        </div>
        <SubmitButton variant="secondary" size="sm" pendingText="Salvando...">
          Salvar plano
        </SubmitButton>
      </form>

      {esteMes && situacao.estado !== "pago" && (
        <form action={registrar} className="flex flex-col gap-3 border-t border-line pt-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="competencia" value={esteMes} />
          <Field label={`Recebeu ${competenciaLabel(esteMes)}?`} htmlFor="note" hint="Opcional: como recebeu, combinado, qualquer lembrete.">
            <Input id="note" name="note" maxLength={120} placeholder="Pix do dono, 05/10" />
          </Field>
          <SubmitButton size="sm" pendingText="Registrando...">
            Marcar como pago
          </SubmitButton>
        </form>
      )}

      {historico.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm font-bold text-muted">Últimos pagamentos</p>
          <ul className="flex flex-col divide-y divide-line">
            {historico.map((h) => (
              <li key={h.competencia} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-bold">{competenciaLabel(h.competencia)}</span>
                  <span className="block text-muted">
                    {formatWhen(h.paidAt)}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-extrabold tabular-nums">{formatCents(h.amountCents)}</span>
                  <form action={desfazerMensalidade}>
                    <input type="hidden" name="restaurantId" value={restaurantId} />
                    <input type="hidden" name="competencia" value={h.competencia} />
                    <ConfirmButton size="sm" confirmText="Sim, desfazer" cancelText="Voltar">
                      Desfazer
                    </ConfirmButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
