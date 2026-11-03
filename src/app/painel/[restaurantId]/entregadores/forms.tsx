"use client";

import { useActionState, useState } from "react";

import { ImageField } from "@/components/panel/image-field";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPhone } from "@/lib/format";

import { cadastrarEntregador, definirSenhaDoEntregador, salvarEntregador, type EntregadorFormState } from "./actions";

// Os formulários da tela de Entregadores.
//
// O telefone é o login porque é o número que o entregador sabe de cor --
// mesma razão do CPF do garçom. A moto e a placa não são enfeite: é por
// elas que o cliente reconhece quem parou na porta, e é o que ele repete
// no telefone quando a entrega atrasa.

/** o telefone digitado vira "(92) 99999-0000" enquanto se escreve */
function CampoTelefone({ id, defaultValue }: { id: string; defaultValue?: string }) {
  const [valor, setValor] = useState(formatPhone(defaultValue) || "");
  return (
    <Input
      id={id}
      name="telefone"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={(e) => setValor(formatPhone(e.target.value.replace(/\D/g, "")) || e.target.value)}
      inputMode="tel"
      maxLength={16}
      placeholder="(92) 99999-0000"
      autoComplete="off"
      className="tabular-nums"
    />
  );
}

function CamposDaMoto({ prefixo, moto, placa }: { prefixo: string; moto?: string | null; placa?: string | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Modelo da moto" htmlFor={`${prefixo}-moto`} hint="Opcional. Ajuda o cliente a reconhecer na porta.">
        <Input id={`${prefixo}-moto`} name="moto" maxLength={40} placeholder="Honda Titan" defaultValue={moto ?? ""} autoComplete="off" />
      </Field>
      <Field label="Placa" htmlFor={`${prefixo}-placa`} hint="Opcional.">
        <Input
          id={`${prefixo}-placa`}
          name="placa"
          maxLength={10}
          placeholder="QZI-7B32"
          defaultValue={placa ?? ""}
          autoComplete="off"
          className="uppercase"
        />
      </Field>
    </div>
  );
}

export function NovoEntregador({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState<EntregadorFormState, FormData>(cadastrarEntregador, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <ImageField name="foto" label="Foto" currentUrl={null} shape="round" maxSide={800} hint="Opcional. O cliente vê quem vai bater na porta." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="e-nome" hint="É o nome que o cliente vê.">
          <Input id="e-nome" name="nome" maxLength={60} placeholder="Carlos Silva" autoComplete="off" />
        </Field>
        <Field label="Telefone" htmlFor="e-telefone" hint="É com ele que o entregador entra.">
          <CampoTelefone id="e-telefone" />
        </Field>
      </div>

      <CamposDaMoto prefixo="e" />

      <Field label="Senha" htmlFor="e-senha" hint="Entregue a ele. Não precisa trocar no primeiro acesso.">
        <Input id="e-senha" name="senha" type="text" maxLength={60} placeholder="4 caracteres ou mais" autoComplete="off" />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <SubmitButton pendingText="Cadastrando...">Cadastrar entregador</SubmitButton>
      </div>
    </form>
  );
}

export function EditarEntregador({
  restaurantId,
  entregador,
}: {
  restaurantId: string;
  entregador: { id: string; nome: string; telefone: string; fotoUrl: string | null; moto: string | null; placa: string | null };
}) {
  const [state, action] = useActionState<EntregadorFormState, FormData>(salvarEntregador, {});
  const prefixo = `ed-${entregador.id}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="entregadorId" value={entregador.id} />

      <ImageField name="foto" label="Foto" currentUrl={entregador.fotoUrl} shape="round" maxSide={800} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor={`${prefixo}-nome`}>
          <Input id={`${prefixo}-nome`} name="nome" maxLength={60} defaultValue={entregador.nome} autoComplete="off" />
        </Field>
        <Field label="Telefone" htmlFor={`${prefixo}-telefone`} hint="Trocar aqui troca o login dele.">
          <CampoTelefone id={`${prefixo}-telefone`} defaultValue={entregador.telefone} />
        </Field>
      </div>

      <CamposDaMoto prefixo={prefixo} moto={entregador.moto} placa={entregador.placa} />

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
      </div>
    </form>
  );
}

export function TrocarSenha({ restaurantId, entregadorId }: { restaurantId: string; entregadorId: string }) {
  const [state, action] = useActionState<EntregadorFormState, FormData>(definirSenhaDoEntregador, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="entregadorId" value={entregadorId} />
      <Field
        label="Nova senha"
        htmlFor={`sn-${entregadorId}`}
        hint="Ao trocar, o aparelho que estiver com a conta aberta é desconectado na hora."
      >
        <Input id={`sn-${entregadorId}`} name="senha" type="text" maxLength={60} placeholder="4 caracteres ou mais" autoComplete="off" />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <div>
        <SubmitButton variant="secondary" pendingText="Trocando...">
          Trocar senha
        </SubmitButton>
      </div>
    </form>
  );
}
