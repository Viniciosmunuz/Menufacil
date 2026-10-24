"use client";

import { ChevronDown, CircleCheck, Trash2 } from "lucide-react";
import { useActionState } from "react";

import { ImageField } from "@/components/panel/image-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatTime } from "@/lib/format";

import {
  buscarMaquininhas,
  conectarMercadoPagoDoTotem,
  desconectarContaDoTotem,
  desconectarMercadoPago,
  escolherMaquininha,
  porEmModoIntegrado,
  testarMaquininha,
  type MaquininhasState,
  gerarCodigoDoTotem,
  removerTotem,
  salvarAccessToken,
  salvarCartazDoTotem,
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

/**
 * A maquininha sem digitar nada: buscar as da conta, escolher, pôr em
 * modo integrado e testar. O campo de digitar o número continua, numa
 * gaveta, para quando a busca não achar.
 */
export function Maquininha({ restaurantId, deviceId, temConta }: { restaurantId: string; deviceId: string | null; temConta: boolean }) {
  const [lista, buscar] = useActionState<MaquininhasState, FormData>(buscarMaquininhas, {});
  const [teste, testar] = useTotemForm(testarMaquininha);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold">Maquininha</p>
        <p className="text-sm text-muted">
          {deviceId ? (
            <>
              Escolhida: <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{deviceId}</code>
            </>
          ) : (
            "Nenhuma escolhida ainda. Só é preciso para o cartão — o Pix funciona sem ela."
          )}
        </p>
      </div>

      {temConta && (
        <div className="flex flex-wrap items-start gap-3">
          <form action={buscar}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <SubmitButton variant={deviceId ? "secondary" : "primary"} pendingText="Buscando...">
              Buscar minhas maquininhas
            </SubmitButton>
          </form>
          {deviceId && (
            <form action={testar}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <SubmitButton variant="secondary" pendingText="Enviando...">
                Testar cobrança (R$ 1,00)
              </SubmitButton>
            </form>
          )}
        </div>
      )}
      <Recado state={teste} />
      {lista.error && <Alert tone="danger">{lista.error}</Alert>}

      {lista.maquininhas && lista.maquininhas.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
          {lista.maquininhas.map((m) => (
            <ItemDaMaquininha key={m.id} restaurantId={restaurantId} maquininha={m} escolhida={m.id === deviceId} />
          ))}
        </ul>
      )}

      <details className="group rounded-control border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-muted">
          Digitar o número da maquininha
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-line p-4">
          <MaquininhaForm restaurantId={restaurantId} deviceId={deviceId} />
        </div>
      </details>
    </div>
  );
}

function ItemDaMaquininha({
  restaurantId,
  maquininha,
  escolhida,
}: {
  restaurantId: string;
  maquininha: { id: string; integrada: boolean; modo: string };
  escolhida: boolean;
}) {
  const [escolha, escolher] = useTotemForm(escolherMaquininha);
  const [modo, integrar] = useTotemForm(porEmModoIntegrado);
  // o número de série é o que está na etiqueta atrás da maquininha
  const [modelo, serie] = maquininha.id.split("__");

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-bold">{serie ?? maquininha.id}</span>
          <span className="block truncate text-sm text-muted">{serie ? modelo.replaceAll("_", " ") : "Point"}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {escolhida && <Badge tone="success">Escolhida</Badge>}
          {maquininha.integrada ? <Badge tone="success">Modo integrado</Badge> : <Badge tone="warning">Não integrada</Badge>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!escolhida && (
          <form action={escolher}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="deviceId" value={maquininha.id} />
            <SubmitButton size="sm" variant="secondary" pendingText="Salvando...">
              Usar esta
            </SubmitButton>
          </form>
        )}
        {!maquininha.integrada && (
          <form action={integrar}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="deviceId" value={maquininha.id} />
            <SubmitButton size="sm" pendingText="Mudando...">
              Pôr em modo integrado
            </SubmitButton>
          </form>
        )}
      </div>
      <Recado state={escolha} />
      <Recado state={modo} />
    </li>
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

/** o botão que leva para o Mercado Pago; a ação redireciona, não devolve estado */
export function ConectarContaForm({ restaurantId, conectada }: { restaurantId: string; conectada: boolean }) {
  return (
    <form action={conectarMercadoPagoDoTotem}>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <SubmitButton variant={conectada ? "secondary" : "primary"} pendingText="Abrindo o Mercado Pago...">
        {conectada ? "Conectar outra conta" : "Conectar Mercado Pago"}
      </SubmitButton>
    </form>
  );
}

export function DesconectarContaForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useTotemForm(desconectarContaDoTotem);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <ConfirmButton confirmText="Sim, desconectar" variant="outline" size="sm">
        Desconectar a conta
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

export function CartazForm({ restaurantId, cartazUrl }: { restaurantId: string; cartazUrl: string | null }) {
  const [state, action] = useTotemForm(salvarCartazDoTotem);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <ImageField
        name="cartaz"
        removeName="removerCartaz"
        label="Cartaz da tela de descanso"
        currentUrl={cartazUrl}
        shape="wide"
        maxSide={1600}
        hint="Pode ser em pé ou deitado: ele preenche a tela inteira do tablet. Para voltar à tela que o próprio sistema monta — com a sua capa e o nome do restaurante — toque em Remover e salve."
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando...">Salvar cartaz</SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}
