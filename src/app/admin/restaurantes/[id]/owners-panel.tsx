"use client";

import { HandPlatter, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import { CredentialsCard } from "@/components/panel/credentials-card";
import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatPhone } from "@/lib/format";

import { addOwner, removeOwner, resetOwnerPasswordAction, type AdminFormState } from "../actions";

type Owner = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export type Garcom = {
  id: string;
  nome: string;
  nivel: "GARCOM" | "GARCOM_II";
  lastLoginAt: string | null;
};

export function OwnersPanel({
  restaurantId,
  owners,
  garcons,
}: {
  restaurantId: string;
  owners: Owner[];
  garcons: Garcom[];
}) {
  const [adding, setAdding] = useState(owners.length === 0);

  return (
    <Card>
      <SectionTitle description="Quem entra no painel deste restaurante. Você não precisa da senha deles para gerenciar.">
        Acesso do dono
      </SectionTitle>

      {owners.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Nenhum dono com acesso ainda.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-3">
          {owners.map((o) => (
            <OwnerRow key={o.id} restaurantId={restaurantId} owner={o} />
          ))}
        </ul>
      )}

      {adding ? (
        <AddOwnerForm restaurantId={restaurantId} onCancel={owners.length ? () => setAdding(false) : undefined} />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden="true" />
          Adicionar dono
        </Button>
      )}

      {/* O garçom tem vínculo com o restaurante igual ao do dono, e por
          isso aparecia nesta mesma lista -- um CPF com endereço ".garcom"
          no meio dos donos assusta sem motivo, e o botão de remover ali
          tirava do salão alguém que o dono acabou de cadastrar.

          Aqui ele só é mostrado: quem cria, troca a senha e remove garçom
          é o dono, na configuração do salão dele. */}
      {garcons.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-3 flex items-center gap-2">
            <HandPlatter className="size-4 shrink-0 text-faint" aria-hidden="true" />
            <h3 className="font-extrabold">
              {garcons.length === 1 ? "1 garçom no salão" : `${garcons.length} garçons no salão`}
            </h3>
          </div>
          <p className="mb-3 text-sm text-muted">
            Contas de salão, que só lançam pedido na mesa. Quem cadastra e remove é o próprio dono, na configuração do salão.
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {garcons.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{g.nome}</span>
                  <span className="block text-xs text-faint">
                    {g.lastLoginAt ? `Último acesso: ${formatDateTime(g.lastLoginAt)}` : "Nunca entrou"}
                  </span>
                </span>
                <Badge tone={g.nivel === "GARCOM_II" ? "brand" : "neutral"}>
                  {g.nivel === "GARCOM_II" ? "Garçom II" : "Garçom"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function OwnerRow({ restaurantId, owner }: { restaurantId: string; owner: Owner }) {
  const [resetState, resetAction] = useActionState<AdminFormState, FormData>(resetOwnerPasswordAction, {});
  const [removeState, removeAction] = useActionState<AdminFormState, FormData>(removeOwner, {});
  const lastLogin = owner.lastLoginAt
    ? formatDateTime(owner.lastLoginAt)
    : null;

  return (
    <li className="rounded-control border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{owner.name}</p>
          <p className="truncate text-sm text-muted">{owner.email}</p>
          {owner.phone && <p className="text-sm text-muted">{formatPhone(owner.phone)}</p>}
        </div>
        {owner.mustChangePassword ? (
          <Badge tone="warning">Ainda não criou a senha</Badge>
        ) : (
          <Badge tone="success">Acesso ativo</Badge>
        )}
      </div>
      <p className="mt-2 text-xs text-faint">{lastLogin ? `Último acesso: ${lastLogin}` : "Nunca entrou no painel"}</p>

      {(resetState.error || removeState.error) && (
        <Alert tone="danger" className="mt-3">
          {resetState.error ?? removeState.error}
        </Alert>
      )}
      {resetState.credentials && (
        <div className="mt-3">
          <CredentialsCard credentials={resetState.credentials} title="Nova senha provisória" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={resetAction}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="userId" value={owner.id} />
          <ConfirmButton confirmText="Gerar e derrubar sessões" variant="secondary" size="sm">
            Gerar nova senha
          </ConfirmButton>
        </form>
        <form action={removeAction}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="userId" value={owner.id} />
          <ConfirmButton confirmText="Confirmar remoção" size="sm">
            Remover acesso
          </ConfirmButton>
        </form>
      </div>
    </li>
  );
}

function AddOwnerForm({ restaurantId, onCancel }: { restaurantId: string; onCancel?: () => void }) {
  const [state, action] = useActionState<AdminFormState, FormData>(addOwner, {});
  const err = state.fieldErrors ?? {};

  if (state.ok) {
    return state.credentials ? (
      <CredentialsCard credentials={state.credentials} title="Acesso do dono criado" />
    ) : (
      <Alert tone="success">{state.message}</Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-control border border-line p-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nome do dono" htmlFor="owner-name" error={err.name}>
        <Input id="owner-name" name="name" required maxLength={80} defaultValue={state.values?.name} autoComplete="off" aria-invalid={!!err.name} />
      </Field>
      <Field label="E-mail de acesso" htmlFor="owner-email" error={err.email} hint="Se já tiver conta de dono, só liga a este restaurante.">
        <Input id="owner-email" name="email" type="email" required defaultValue={state.values?.email} autoComplete="off" aria-invalid={!!err.email} />
      </Field>
      <Field label="Celular" htmlFor="owner-phone" error={err.phone} hint="Opcional.">
        <Input id="owner-phone" name="phone" type="tel" inputMode="tel" defaultValue={state.values?.phone} placeholder="(92) 99999-0000" aria-invalid={!!err.phone} />
      </Field>
      <Field
        label="Senha provisória"
        htmlFor="owner-password"
        error={err.password}
        hint="Opcional. Mínimo de 8 caracteres. Em branco, o sistema cria uma. O dono troca no primeiro acesso."
      >
        <Input
          id="owner-password"
          name="password"
          type="text"
          minLength={8}
          maxLength={72}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!err.password}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Criando...">Criar acesso</SubmitButton>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
