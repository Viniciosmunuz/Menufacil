"use client";

import { MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { pedirAjuda, type SuporteFormState } from "./actions";
import { ASSUNTOS } from "./assuntos";

// O pedido de ajuda.
//
// Duas perguntas, e nenhuma obrigatória de entender: do que se trata e o
// que está acontecendo. O assunto existe para a resposta já vir do lado
// certo -- impressora e cartão não se resolvem do mesmo jeito --, e não
// para classificar o problema de quem está no meio do movimento.

export function SuporteForm({ restaurantId }: { restaurantId: string }) {
  const [estado, enviar] = useActionState<SuporteFormState, FormData>(pedirAjuda, {});
  const [assunto, setAssunto] = useState<string>("Outro");

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="assunto" value={assunto} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-muted">Do que se trata</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Assunto">
          {ASSUNTOS.map((a) => {
            const aceso = assunto === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={aceso}
                onClick={() => setAssunto(a)}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-bold transition-colors",
                  aceso ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:text-ink",
                )}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label="O que está acontecendo?"
        htmlFor="mensagem"
        hint="Conte como se estivesse falando com a gente. Se puder, diga o número do pedido ou o nome do prato."
      >
        <Textarea id="mensagem" name="mensagem" rows={5} maxLength={2000} placeholder="Ex.: a comanda do pedido #42 não saiu na impressora do balcão." />
      </Field>

      {estado.error && <Alert tone="danger">{estado.error}</Alert>}

      <div>
        <SubmitButton pendingText="Abrindo o WhatsApp...">
          <MessageCircle className="size-4" aria-hidden="true" />
          Enviar e falar no WhatsApp
        </SubmitButton>
      </div>
    </form>
  );
}
