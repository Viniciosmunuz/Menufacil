"use client";

import { Minus, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { apagarDoCaixa, lancarNoCaixa, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

// Entrada e saída de dinheiro da gaveta, fora da venda.
//
// Sangria para o cofre, troco trazido de casa, a conta do gás paga na hora.
// O motivo é obrigatório porque quem confere o caixa no dia seguinte não
// estava aqui: "saída de R$ 200,00" sem motivo é a mesma coisa que uma
// diferença inexplicada.

export function BotaoDeMovimento({ restaurantId, tipo }: { restaurantId: string; tipo: "ENTRADA" | "SAIDA" }) {
  const [aberto, setAberto] = useState(false);
  const [estado, lancar] = useActionState<SalaoFormState, FormData>(lancarNoCaixa, {});
  const entrada = tipo === "ENTRADA";

  // deu certo: a folha fecha, porque a página já voltou com o número novo
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimo) {
    setUltimo(estado.message);
    setAberto(false);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-control border px-4 font-bold transition-colors",
          entrada ? "border-[#1fc46e]/50 text-[#157f47] hover:bg-[#1fc46e]/10" : "border-danger/50 text-danger hover:bg-danger/10",
        )}
      >
        {entrada ? <Plus className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
        {entrada ? "Adicionar entrada" : "Adicionar saída"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="absolute inset-0 bg-black/60" />
      <div className="relative flex w-full flex-col rounded-t-card border border-line bg-surface sm:max-w-md sm:rounded-card">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">{entrada ? "Entrada no caixa" : "Saída do caixa"}</h2>
            <p className="text-sm text-muted">
              {entrada ? "Dinheiro que entrou na gaveta e não é venda." : "Dinheiro que saiu da gaveta, como a sangria para o cofre."}
            </p>
          </div>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <form action={lancar} className="flex flex-col gap-4 px-4 py-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="tipo" value={tipo} />

          <Field label="Valor" htmlFor="valor">
            <MoneyInput id="valor" name="valor" autoFocus />
          </Field>

          <Field label="Motivo" htmlFor="motivo" hint={entrada ? "Ex.: troco trazido de casa." : "Ex.: sangria para o cofre, pagamento do gás."}>
            <Input id="motivo" name="motivo" maxLength={120} autoComplete="off" />
          </Field>

          {estado.error && <Alert tone="danger">{estado.error}</Alert>}

          <SubmitButton pendingText="Registrando...">{entrada ? "Registrar entrada" : "Registrar saída"}</SubmitButton>
        </form>
      </div>
    </div>
  );
}

/** a lixeira ao lado do lançamento, para desfazer o que foi digitado errado */
export function ApagarMovimento({ restaurantId, movimentoId, motivo }: { restaurantId: string; movimentoId: string; motivo: string }) {
  const [estado, apagar, apagando] = useActionState<SalaoFormState, FormData>(apagarDoCaixa, {});

  return (
    <form action={apagar} className="shrink-0">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="movimentoId" value={movimentoId} />
      <button
        type="submit"
        disabled={apagando}
        aria-label={"Apagar o lançamento: " + motivo}
        title={estado.error ?? "Apagar este lançamento"}
        className={cn("grid size-8 place-items-center rounded-control text-faint hover:text-danger disabled:opacity-40", estado.error && "text-danger")}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
