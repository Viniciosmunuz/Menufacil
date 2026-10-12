"use client";

import { useActionState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { SwitchButton } from "@/components/ui/switch-button";
import { FEATURES, type FeatureKey, type RestaurantFeatures } from "@/lib/features";

import { setRestaurantFeatures, type AdminFormState } from "../actions";

/**
 * O que este restaurante pode usar. Desligar some com a tela no painel dele
 * -- e o servidor barra de novo, para o endereço digitado na mão também não
 * passar.
 *
 * O interruptor é o mesmo do cardápio, e vale pelo mesmo motivo: liberar um
 * recurso é ligar ou desligar uma coisa, e o toque já salva. A caixa de
 * marcar com "Salvar recursos" embaixo pedia dois gestos para uma decisão
 * só, e no meio deles a tela mostrava uma marca que ainda não era verdade.
 *
 * Cada interruptor é um formulário próprio, e cada um leva escondido o
 * estado dos outros. É preciso: a ação grava o conjunto inteiro -- liga o
 * que vem marcado e desliga o que não vem --, então um formulário que
 * mandasse só o recurso tocado apagaria os demais.
 */
export function FeaturesPanel({ restaurantId, features }: { restaurantId: string; features: RestaurantFeatures }) {
  const [state, action] = useActionState<AdminFormState, FormData>(setRestaurantFeatures, {});

  /** os que ficam como estão quando este for tocado */
  const osOutros = (alvo: FeatureKey) => FEATURES.filter((f) => f.key !== alvo && features[f.key]);

  // o texto se alinha sob o rótulo do interruptor, não sob o interruptor:
  // largura da chave (3rem) mais o respiro que o próprio botão usa (0.625rem)
  const recuo = "pl-[3.625rem]";

  return (
    <Card>
      <SectionTitle description="Some do painel do restaurante o que estiver desligado.">Recursos</SectionTitle>

      <ul className="flex flex-col divide-y divide-line">
        {/* o WhatsApp não se desliga: é como todo restaurante recebe pedido
            hoje, e sem ele não sobra canal nenhum */}
        <li className="py-3 pt-0 opacity-70">
          <span className="inline-flex h-11 items-center gap-2.5 pr-1 text-sm font-bold text-ink">
            <span
              role="switch"
              aria-checked="true"
              aria-disabled="true"
              aria-label="Pedido pelo WhatsApp"
              className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-success/60 bg-success/80"
            >
              <span className="absolute size-5 translate-x-[1.45rem] rounded-full bg-ink shadow" />
            </span>
            Pedido pelo WhatsApp
          </span>
          <p className={`${recuo} text-sm text-muted`}>É como todo restaurante recebe pedido hoje.</p>
        </li>

        {FEATURES.map((f) => (
          <li key={f.key} className="py-3 last:pb-0">
            <form action={action}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              {/* o estado dos outros, para a gravação do conjunto não apagá-los */}
              {osOutros(f.key).map((o) => (
                <input key={o.key} type="hidden" name="recurso" value={o.key} />
              ))}
              {/* este só vai junto quando está desligado: aí o toque liga.
                  Ligado, ele fica de fora e o toque desliga. */}
              {!features[f.key] && <input type="hidden" name="recurso" value={f.key} />}

              <SwitchButton checked={features[f.key]} label={f.label} />

              <p className={`${recuo} text-sm text-muted`}>
                {f.soon && <span className="mr-2 font-bold text-warning">em construção</span>}
                {f.hint}
              </p>
            </form>
          </li>
        ))}
      </ul>

      {state.error && (
        <div className="mt-4">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}
      {state.ok && state.message && (
        <div className="mt-4">
          <Alert tone="success">{state.message}</Alert>
        </div>
      )}
    </Card>
  );
}
