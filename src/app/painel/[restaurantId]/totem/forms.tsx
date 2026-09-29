"use client";

import { CircleCheck, Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatTime } from "@/lib/format";

import {
  desconectarMercadoPago,
  gerarCodigoDoTotem,
  removerTotem,
  salvarAccessToken,
  salvarDeviceId,
  salvarWebhook,
  type TotemState,
} from "./actions";

// Formulários da seção Totem. Cada um salva sozinho e avisa na hora, do
// mesmo jeito que os blocos de "Meu restaurante".

type Acao = (state: TotemState, formData: FormData) => Promise<TotemState>;

function Recado({ state }: { state: TotemState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  if (state.ok && state.savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-success" role="status">
        <CircleCheck className="size-4" aria-hidden="true" />
        Salvo às {formatTime(new Date(state.savedAt))}
      </span>
    );
  }
  return null;
}

function useTotemForm(acao: Acao) {
  return useActionState<TotemState, FormData>(acao, {});
}

export function AccessTokenForm({ restaurantId, resumo }: { restaurantId: string; resumo: string | null }) {
  const [state, action] = useTotemForm(salvarAccessToken);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Field
        label="Access Token do Mercado Pago"
        htmlFor="accessToken"
        hint={
          resumo
            ? `Guardado: ${resumo}. Para trocar, cole o token novo. Ele fica criptografado e não volta a aparecer inteiro.`
            : "Está em Seu negócio → Configurações → Gestão e administração → Credenciais, no site do Mercado Pago. Use as credenciais de produção."
        }
      >
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={resumo ? "Cole o token novo" : "APP_USR-..."}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando...">{resumo ? "Trocar token" : "Salvar token"}</SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}

export function MaquininhaForm({ restaurantId, deviceId }: { restaurantId: string; deviceId: string | null }) {
  const [state, action] = useTotemForm(salvarDeviceId);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Field
        label="Número da maquininha (device ID)"
        htmlFor="deviceId"
        hint="Na maquininha Point: Configurações → Informações do equipamento. Só é preciso para o pagamento no cartão — o Pix funciona sem ela."
      >
        <Input
          id="deviceId"
          name="deviceId"
          defaultValue={deviceId ?? ""}
          autoComplete="off"
          spellCheck={false}
          placeholder="PAX_A910__SMARTPOS1234567890"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando...">Salvar maquininha</SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}

export function WebhookForm({ restaurantId, temChave }: { restaurantId: string; temChave: boolean }) {
  const [state, action] = useTotemForm(salvarWebhook);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Field
        label="Chave secreta das notificações"
        htmlFor="webhookKey"
        hint={
          temChave
            ? "Já cadastrada. Só preencha se você gerou uma nova no Mercado Pago. Deixe em branco e salve para remover."
            : "No Mercado Pago, em Suas integrações → Webhooks, o painel mostra uma chave secreta. É com ela que conferimos que o aviso de pagamento veio mesmo de lá."
        }
      >
        <Input id="webhookKey" name="webhookKey" type="password" autoComplete="off" spellCheck={false} placeholder="••••••••" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando...">Salvar chave</SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}

export function DesconectarForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useTotemForm(desconectarMercadoPago);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <ConfirmButton confirmText="Sim, remover" variant="outline" size="sm">
        Remover esta conta do Mercado Pago
      </ConfirmButton>
      <Recado state={state} />
    </form>
  );
}

export function NovoTotemForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useTotemForm(gerarCodigoDoTotem);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <div>
        <SubmitButton variant="secondary" pendingText="Gerando...">
          Gerar código para um totem
        </SubmitButton>
      </div>
      {/* o código também fica na lista abaixo, então não se perde ao sair da tela */}
      <Recado state={state} />
    </form>
  );
}

export function RemoverTotemForm({ restaurantId, deviceId }: { restaurantId: string; deviceId: string }) {
  const [state, action] = useTotemForm(removerTotem);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="deviceId" value={deviceId} />
      <ConfirmButton confirmText="Sim, desligar" variant="outline" size="sm">
        <Trash2 className="size-4" aria-hidden="true" />
        Desligar
      </ConfirmButton>
      <Recado state={state} />
    </form>
  );
}
