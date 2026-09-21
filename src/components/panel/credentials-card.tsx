"use client";

import { KeyRound } from "lucide-react";
import { useSyncExternalStore } from "react";

import { CopyButton } from "@/components/ui/copy-button";

type Credentials = { name: string; email: string; password: string };

const subscribe = () => () => {};

// Acesso do dono, mostrado uma única vez depois de criar ou redefinir a
// senha. O admin copia e entrega ao dono (a senha não fica guardada em lugar
// nenhum além do hash no banco).
export function CredentialsCard({ credentials, title }: { credentials: Credentials; title: string }) {
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
  const loginUrl = `${origin}/entrar`;

  const message = [
    `Olá, ${credentials.name}! Seu acesso ao painel do MenuFácil:`,
    "",
    `Endereço: ${loginUrl}`,
    `E-mail: ${credentials.email}`,
    `Senha provisória: ${credentials.password}`,
    "",
    "No primeiro acesso você vai criar a sua própria senha.",
  ].join("\n");

  return (
    <div className="rounded-card border border-brand/40 bg-brand-soft p-5">
      <p className="flex items-center gap-2 font-extrabold text-brand">
        <KeyRound className="size-5" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1 text-sm text-muted">
        Copie e entregue ao dono agora. Por segurança, esta senha não aparece de novo.
      </p>

      <dl className="mt-4 grid gap-3 rounded-control bg-bg/60 p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <dt className="font-bold text-muted">Endereço</dt>
        <dd className="break-all">{loginUrl}</dd>
        <dt className="font-bold text-muted">E-mail</dt>
        <dd className="break-all">{credentials.email}</dd>
        <dt className="font-bold text-muted">Senha provisória</dt>
        <dd className="font-mono text-base font-bold tracking-wider text-ink">{credentials.password}</dd>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton text={message} label="Copiar acesso completo" variant="primary" size="md" />
        <CopyButton text={credentials.password} label="Copiar só a senha" size="md" />
      </div>
    </div>
  );
}
