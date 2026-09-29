"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ResumoDaExclusao } from "@/server/restaurants/delete";

import { deleteRestaurant, type AdminFormState } from "../actions";

// Excluir de vez. Desativar e bloquear já tiram do site guardando tudo;
// isto apaga, e não tem volta.
//
// O caminho é comprido de propósito, e cada etapa faz uma pergunta
// diferente: o restaurante precisa estar fora do ar (você já decidiu que
// ele sai?), a gaveta precisa ser aberta (é isto mesmo que você quer?) e o
// nome precisa ser digitado (é este restaurante mesmo?).

export function DeletePanel({ resumo }: { resumo: ResumoDaExclusao }) {
  const [state, action] = useActionState<AdminFormState, FormData>(deleteRestaurant, {});
  const [digitado, setDigitado] = useState("");

  const noAr = resumo.status === "ACTIVE";
  const confere = digitado.trim().toLocaleLowerCase("pt-BR") === resumo.name.trim().toLocaleLowerCase("pt-BR");

  const leva = [
    resumo.pedidos && `${resumo.pedidos} ${resumo.pedidos === 1 ? "pedido" : "pedidos"}`,
    resumo.produtos && `${resumo.produtos} ${resumo.produtos === 1 ? "produto" : "produtos"}`,
    resumo.categorias && `${resumo.categorias} ${resumo.categorias === 1 ? "categoria" : "categorias"} do cardápio`,
  ].filter(Boolean) as string[];

  return (
    <Card className="border-danger/40">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-6 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">Excluir restaurante</h2>
          <p className="mt-0.5 text-sm text-muted">
            Sai da lista e do banco de dados, para sempre. Para só tirar do site guardando tudo, use Desativar ali em cima.
          </p>
        </div>
      </div>

      {noAr ? (
        <p className="mt-5 rounded-control border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          Este restaurante está <strong className="text-ink">no ar</strong>. Desative ou bloqueie antes — é a primeira etapa, e ela
          existe para ninguém apagar um restaurante que está vendendo agora.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-2 rounded-control border border-line bg-surface-2 p-4 text-sm">
            <p className="font-bold">O que vai junto</p>
            <p className="text-muted">{leva.length ? leva.join(", ") : "Nada: este restaurante não tem cardápio nem pedidos."}</p>
            <p className="font-bold">O que fica</p>
            <p className="text-muted">
              O histórico desta tela, registrando que ele existiu e quem apagou
              {resumo.donos > 0 && `, e a conta ${resumo.donos === 1 ? "do dono" : "dos donos"} (a pessoa continua no sistema; só o vínculo com este restaurante some)`}
              .
            </p>
          </div>

          {resumo.semeado && (
            <Alert tone="warning" className="mt-3">
              Este restaurante faz parte dos dados iniciais do sistema (pelo endereço <strong>{resumo.slug}</strong>). Apagar resolve
              agora, mas ele volta sozinho na próxima publicação do site. Nesse caso, desativar é o caminho certo.
            </Alert>
          )}

          <details className="drawer mt-4 rounded-control border border-danger/30 bg-danger/5">
            <summary className="cursor-pointer list-none p-4 text-sm font-extrabold text-danger [&::-webkit-details-marker]:hidden">
              Quero excluir este restaurante
            </summary>
            <form action={action} className="flex flex-col gap-3 px-4 pb-4">
              <input type="hidden" name="restaurantId" value={resumo.id} />
              {state.error && <Alert tone="danger">{state.error}</Alert>}
              <Field label={`Digite ${resumo.name} para confirmar`} htmlFor="confirmacao">
                <Input
                  id="confirmacao"
                  name="confirmacao"
                  autoComplete="off"
                  placeholder={resumo.name}
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value)}
                />
              </Field>
              <SubmitButton variant="danger" disabled={!confere} pendingText="Excluindo...">
                Excluir para sempre
              </SubmitButton>
            </form>
          </details>
        </>
      )}
    </Card>
  );
}
