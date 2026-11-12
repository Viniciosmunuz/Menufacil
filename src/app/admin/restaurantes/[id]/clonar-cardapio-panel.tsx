"use client";

import { useActionState, useState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";

import { clonarCardapioAction, type AdminFormState } from "../actions";

export type RestauranteParaClonar = {
  id: string;
  name: string;
  categorias: number;
  produtos: number;
};

/**
 * Copiar o cardápio de outro restaurante para este.
 *
 * Existe para a hora da ativação: restaurante novo que é parecido com um
 * que já está dentro -- a segunda loja da mesma dona, a franquia, a
 * lanchonete com o mesmo cardápio do bairro -- começava com alguém
 * digitando item por item.
 *
 * Só aparecem na lista restaurantes que têm cardápio: oferecer os vazios
 * seria oferecer um clique que não faz nada.
 */
export function ClonarCardapioPanel({
  restaurantId,
  temCardapio,
  outros,
}: {
  restaurantId: string;
  temCardapio: { categorias: number; produtos: number };
  outros: RestauranteParaClonar[];
}) {
  const [state, action, pendente] = useActionState<AdminFormState, FormData>(clonarCardapioAction, {});
  const [origemId, setOrigemId] = useState("");

  const origem = outros.find((r) => r.id === origemId);
  const destinoTemItens = temCardapio.produtos > 0;

  if (outros.length === 0) {
    return (
      <Card>
        <SectionTitle description="Nenhum outro restaurante tem cardápio para copiar ainda.">
          Copiar cardápio
        </SectionTitle>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle description="Traz categorias, produtos, opções e preços de outro restaurante.">
        Copiar cardápio
      </SectionTitle>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="destinoId" value={restaurantId} />

        <Field label="Copiar de" htmlFor="origemId">
          <Select id="origemId" name="origemId" value={origemId} onChange={(e) => setOrigemId(e.target.value)} required>
            <option value="">Escolha o restaurante…</option>
            {outros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.produtos} {r.produtos === 1 ? "produto" : "produtos"}
              </option>
            ))}
          </Select>
        </Field>

        {/* A caixa de substituir só aparece quando há o que substituir.
            Num cardápio vazio ela não decide nada, e uma caixa que não
            decide nada numa tela que apaga dados é convite a marcar sem
            ler. */}
        {destinoTemItens ? (
          <label className="flex items-start gap-3 rounded-card border border-line bg-surface-2 p-3">
            <input type="checkbox" name="substituir" className="mt-1" />
            <span className="text-sm">
              <strong>Apagar o cardápio atual antes de copiar.</strong>
              <br />
              <span className="text-muted">
                Este restaurante já tem {temCardapio.produtos}{" "}
                {temCardapio.produtos === 1 ? "produto" : "produtos"} em {temCardapio.categorias}{" "}
                {temCardapio.categorias === 1 ? "categoria" : "categorias"}. Sem marcar, o cardápio copiado
                entra junto com o que já existe. Os pedidos antigos não se perdem.
              </span>
            </span>
          </label>
        ) : null}

        {origem ? (
          <p className="text-sm text-muted">
            Vêm {origem.produtos} {origem.produtos === 1 ? "produto" : "produtos"} em {origem.categorias}{" "}
            {origem.categorias === 1 ? "categoria" : "categorias"}. A impressora de cada categoria não vem
            junto — ela é do outro restaurante.
          </p>
        ) : null}

        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

        <div>
          <Button type="submit" disabled={!origemId || pendente}>
            {pendente ? "Copiando…" : "Copiar cardápio"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
