"use client";

import { useActionState, useState } from "react";

import { LockKeyhole } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCents } from "@/lib/format";
import { parseMoneyToCents } from "@/lib/validation";

import { abrirCaixa, fecharCaixa, type SalaoFormState } from "./actions";

/** o que a pessoa digitou, em centavos; null enquanto não dá para ler */
const parseMoney = (v: string) => (v.trim() ? parseMoneyToCents(v) : null);

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

/**
 * O "Abrir caixa" da tela de caixa fechado, como no Yooga: primeiro só o
 * botão, embaixo do aviso; o toque abre a pergunta do troco no lugar dele.
 */
export function AbrirCaixaForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(abrirCaixa, {});
  const [abrindo, setAbrindo] = useState(false);

  if (!abrindo) {
    return (
      <button
        type="button"
        onClick={() => setAbrindo(true)}
        className="flex min-h-14 w-full items-center justify-center rounded-control bg-brand px-8 text-lg font-bold text-brand-ink transition hover:brightness-105"
      >
        Abrir caixa
      </button>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-4 text-left">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <Field label="Valor de abertura" htmlFor="abertura" hint="O troco que já está na gaveta. Pode ser zero.">
        <MoneyInput id="abertura" name="abertura" defaultValue="" className="h-14" autoFocus />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="flex flex-col gap-2">
        <SubmitButton pendingText="Abrindo..." className="min-h-14 w-full text-lg">
          Abrir caixa
        </SubmitButton>
        <button type="button" onClick={() => setAbrindo(false)} className="min-h-11 rounded-control font-bold text-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Fechar o caixa da noite, com a conferência da gaveta.
 *
 * O sistema já sabe quanto deveria haver: abertura mais o dinheiro das
 * mesas, mais as entradas, menos as saídas. O que ele não sabe é quanto
 * tem de verdade -- e é a diferença entre os dois números que interessa.
 *
 * Conferir é opcional: quem não quer contar a gaveta deixa em branco e
 * fecha, como sempre fez. Quem conta vê a diferença na hora, antes de
 * confirmar, e ela fica gravada no fechamento.
 */
export function FecharCaixaForm({
  restaurantId,
  podeFechar,
  esperadoCents,
}: {
  restaurantId: string;
  podeFechar: boolean;
  /** quanto deve haver na gaveta; sem ele, não há o que conferir */
  esperadoCents?: number;
}) {
  const [state, action] = useActionState<SalaoFormState, FormData>(fecharCaixa, {});
  const [confirmando, setConfirmando] = useState(false);
  const [contado, setContado] = useState("");

  const esperado = esperadoCents ?? null;
  const contadoCents = parseMoney(contado);
  const diferenca = esperado !== null && contadoCents !== null ? contadoCents - esperado : null;

  // Fechou: a própria ação leva para a via da noite, que sai sozinha na
  // impressora. Era uma aba aberta daqui, e não funcionava -- fechar o
  // caixa faz esta tela virar o pedido de abrir, e o formulário some antes
  // de chegar a abrir a aba.
  if (!confirmando) {
    return (
      <div className="flex flex-col gap-3">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
        <button
          type="button"
          disabled={!podeFechar}
          onClick={() => setConfirmando(true)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-[#e2483d] text-lg font-bold text-white transition hover:brightness-105 disabled:opacity-40"
        >
          <LockKeyhole className="size-5" aria-hidden="true" />
          Quero fechar meu Caixa
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-warning/50 bg-warning/10 p-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      {esperado !== null && <input type="hidden" name="esperado" value={esperado} />}

      <div>
        <p className="text-lg font-extrabold">Fechar o caixa da noite?</p>
        <p className="text-sm text-muted">
          O salão para de receber pedidos, as mesas voltam a ficar livres e sai o papel com o fechamento. Para voltar a atender, é preciso
          abrir o caixa de novo.
        </p>
      </div>

      {esperado !== null && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Deve ter na gaveta" htmlFor="esperado-visivel">
            <div className="flex h-12 items-center rounded-control border border-line bg-surface-2 px-4 font-bold tabular-nums text-muted">
              {formatCents(esperado)}
            </div>
          </Field>
          <Field label="Contei na gaveta" htmlFor="contado" hint="Pode deixar em branco.">
            <MoneyInput id="contado" name="contado" value={contado} onChange={(e) => setContado(e.target.value)} className="h-12" />
          </Field>
          <Field label="Diferença" htmlFor="diferenca">
            <div
              className={
                "flex h-12 items-center rounded-control border px-4 font-extrabold tabular-nums " +
                (diferenca === null
                  ? "border-line bg-surface-2 text-faint"
                  : diferenca === 0
                    ? "border-[#1fc46e]/50 bg-[#c3f0d4] text-[#157f47]"
                    : "border-danger/50 bg-danger/10 text-danger")
              }
            >
              {diferenca === null ? "—" : (diferenca > 0 ? "+" : "") + formatCents(diferenca)}
            </div>
          </Field>
        </div>
      )}

      {diferenca !== null && diferenca !== 0 && (
        <p className="text-sm font-semibold text-warning">
          {diferenca < 0 ? "Está faltando dinheiro na gaveta." : "Está sobrando dinheiro na gaveta."} A diferença fica registrada no
          fechamento, e o caixa fecha assim mesmo.
        </p>
      )}

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
