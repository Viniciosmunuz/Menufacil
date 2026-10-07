"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";

import { abrirCaixa, fecharCaixa, type SalaoFormState } from "./actions";

// Abrir e fechar o caixa do salão.
//
// Na abertura o dono diz o troco que já está na gaveta. É a única pergunta
// do dia: sem ela, a conferência da noite não fecha, porque o dinheiro ao
// fim é o troco do começo mais o que entrou.
//
// No fechamento não se pergunta nada. O sistema já sabe quanto entrou em
// cada forma de pagamento -- pedir o valor contado seria pedir ao dono que
// repetisse uma conta que o papel vai trazer pronta. O que ele faz é
// confirmar, porque fechar o caixa encerra a noite e libera as mesas.

export function AbrirCaixaForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(abrirCaixa, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <Field label="Dinheiro na gaveta" htmlFor="abertura" hint="O troco com que a noite começa. Pode ser zero.">
        <MoneyInput id="abertura" name="abertura" defaultValue="" className="h-12" />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div>
        <SubmitButton pendingText="Abrindo...">Abrir o salão</SubmitButton>
      </div>
    </form>
  );
}

export function FecharCaixaForm({ restaurantId, podeFechar }: { restaurantId: string; podeFechar: boolean }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(fecharCaixa, {});
  const [confirmando, setConfirmando] = useState(false);

  // Fechou: o papel abre numa aba e sai na impressora sozinho, como as
  // outras vias do sistema. O ajuste acontece no render porque é reação a
  // um dado novo que chegou, não efeito colateral.
  const [jaAbriu, setJaAbriu] = useState<string | undefined>(undefined);
  if (state.fechamentoId && state.fechamentoId !== jaAbriu) {
    setJaAbriu(state.fechamentoId);
    setConfirmando(false);
    window.open("/painel/" + restaurantId + "/salao/fechamento/" + state.fechamentoId, "_blank", "noopener");
  }

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-3">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
        <div>
          <button
            type="button"
            disabled={!podeFechar}
            onClick={() => setConfirmando(true)}
            className="flex min-h-12 items-center justify-center rounded-control border border-line-strong px-5 font-extrabold transition-colors hover:border-ink disabled:opacity-40"
          >
            Fechar o caixa
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-control border border-warning/50 bg-warning/10 p-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <div>
        <p className="font-extrabold">Fechar o caixa da noite?</p>
        <p className="text-sm text-muted">
          O salão para de receber pedidos, as mesas voltam a ficar livres e sai o papel com o fechamento. Para voltar a atender, é preciso
          abrir o caixa de novo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Fechando...">Sim, fechar</SubmitButton>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="flex min-h-12 items-center justify-center rounded-control px-5 font-bold text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
