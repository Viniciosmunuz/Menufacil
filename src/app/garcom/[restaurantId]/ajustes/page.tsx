import { Lock, Trash2, UserRound, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { GarcomNav } from "@/components/panel/garcom-nav";
import { formatCpf } from "@/lib/cpf";
import { requireSalao } from "@/server/auth/dal";

import { BotaoSair } from "./sair";

export const metadata: Metadata = { title: "Ajustes" };

// Os ajustes do garçom.
//
// Pouca coisa de propósito: quem usa isto está de pé, no meio do salão, e
// não veio aqui configurar nada -- veio ver de quem é a conta aberta neste
// aparelho e, de vez em quando, trocar de garçom no fim do turno.
//
// O que ele pode fazer aparece escrito porque é pergunta que o garçom faz
// ao balcão ("eu consigo fechar a mesa?"), e a resposta estava só no
// cadastro, do outro lado do salão. Quem muda isso é o dono, no painel: aqui
// é só o espelho.

export default async function AjustesDoGarcomPage({ params }: PageProps<"/garcom/[restaurantId]/ajustes">) {
  const { restaurantId } = await params;
  const { user, restaurant, papel, pode } = await requireSalao(restaurantId);
  const base = `/garcom/${restaurant.id}`;

  // o login do garçom é o CPF; o do dono é um e-mail de verdade
  const ehGarcom = papel === "STAFF" && user.email.endsWith(".garcom");
  const entra = ehGarcom ? formatCpf(user.email.split("@")[0]) : user.email;

  const permissoes = [
    { ligada: pode.excluirItem, icone: Trash2, titulo: "Apagar item da comanda", nao: "Só o balcão apaga item já enviado." },
    { ligada: pode.finalizarMesa, icone: Wallet, titulo: "Finalizar a mesa", nao: "Quem libera a mesa e dá desconto é o balcão." },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-5">
      <h1 className="text-2xl font-extrabold">Ajustes</h1>

      <section className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-3 text-muted">
          <UserRound className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-extrabold">{user.name ?? "Garçom"}</span>
          <span className="block truncate text-sm tabular-nums text-muted">{entra}</span>
          <span className="block truncate text-sm text-faint">{restaurant.name}</span>
        </span>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-faint uppercase">O que você pode fazer</h2>
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
          <li className="flex items-start gap-3 px-4 py-3">
            <Wallet className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-bold">Lançar pedido e receber</span>
              <span className="block text-sm text-muted">É o seu trabalho; todo garçom faz.</span>
            </span>
          </li>
          {permissoes.map(({ ligada, icone: Icone, titulo, nao }) => (
            <li key={titulo} className="flex items-start gap-3 px-4 py-3">
              {ligada ? (
                <Icone className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
              ) : (
                <Lock className="mt-0.5 size-5 shrink-0 text-faint" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className={ligada ? "block font-bold" : "block font-bold text-muted"}>{titulo}</span>
                <span className="block text-sm text-muted">{ligada ? "Liberado para você." : nao}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="px-1 text-sm text-faint">Para mudar isso, fale com o dono do restaurante.</p>
      </section>

      <div className="mt-auto pb-4">
        <BotaoSair nome={user.name} />
      </div>

      <GarcomNav base={base} />
    </main>
  );
}
