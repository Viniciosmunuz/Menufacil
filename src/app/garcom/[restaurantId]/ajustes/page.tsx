import { Check, Lock, MessageCircle, Store, UserRound, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { GarcomNav } from "@/components/panel/garcom-nav";
import { linkWhatsappMenuFacil, WHATSAPP_MENUFACIL } from "@/lib/contato";
import { formatCpf } from "@/lib/cpf";
import { NOME_DO_NIVEL } from "@/lib/niveis";
import { GRUPOS } from "@/lib/permissoes-salao";
import { noAr } from "@/lib/features";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { SalaoNaoLiberado } from "../aviso";
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

/** "(92) 99913-0838", do jeito que se lê, a partir do número com DDI */
const TELEFONE_MENUFACIL = WHATSAPP_MENUFACIL.replace(/^55(d{2})(d{5})(d{4})$/, "($1) $2-$3");

export default async function AjustesDoGarcomPage({ params }: PageProps<"/garcom/[restaurantId]/ajustes">) {
  const { restaurantId } = await params;
  const { user, restaurant, papel, pode, nivel } = await requireRestaurantAccess(restaurantId);
  if (!noAr("salaoEnabled") || !restaurant.salaoEnabled) return <SalaoNaoLiberado nome={restaurant.name} />;
  const base = `/garcom/${restaurant.id}`;

  // o login do garçom é o CPF; o do dono é um e-mail de verdade
  const ehGarcom = papel === "STAFF" && user.email.endsWith(".garcom");
  const entra = ehGarcom ? formatCpf(user.email.split("@")[0]) : user.email;

  // o que ele pode, chave por chave, do jeito que o dono ligou no painel.
  // O que está desligado também aparece, apagado: a pergunta do garçom é
  // "eu consigo fechar a mesa?", e some da lista não responde nada.
  const permissoes = GRUPOS.flatMap((g) => g.chaves.map((c) => ({ chave: c.chave, titulo: c.nome, resumo: c.resumo, ligada: pode[c.chave] })));

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
          {nivel && <span className="mt-1 inline-block rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-muted">{NOME_DO_NIVEL[nivel]}</span>}
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
          {permissoes.map(({ chave, ligada, titulo, resumo }) => (
            <li key={chave} className="flex items-start gap-3 px-4 py-3">
              {ligada ? (
                <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Lock className="mt-0.5 size-5 shrink-0 text-faint" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className={ligada ? "block font-bold" : "block font-bold text-faint"}>{titulo}</span>
                <span className="block text-sm text-muted">{ligada ? resumo : "Isso quem faz é o balcão."}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="px-1 text-sm text-faint">Para mudar isso, fale com o dono do restaurante.</p>
      </section>

      {/* Fale conosco.
          A primeira porta é o dono: quase tudo que trava o garçom -- a
          permissão, o caixa fechado, a mesa que sumiu -- se resolve ali
          mesmo, e no meio do movimento ele é quem está por perto. O
          MenuFácil fica embaixo, para quando o problema for do sistema.
          É também o que a loja de aplicativos da Stone exige: uma seção
          de contato visível dentro do aplicativo. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-faint uppercase">Fale conosco</h2>
        <div className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
          <p className="flex items-start gap-3 px-4 py-3">
            <Store className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-bold">Dúvida no atendimento</span>
              <span className="block text-sm text-muted">Fale com o dono de {restaurant.name}: permissão, caixa e mesa são com ele.</span>
            </span>
          </p>
          <a
            href={linkWhatsappMenuFacil("Olá! Sou garçom e preciso de ajuda com o MenuFácil.") ?? "#"}
            target="_blank"
            rel="noopener"
            className="flex items-start gap-3 px-4 py-3 active:bg-surface-2"
          >
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-bold">Suporte do MenuFácil</span>
              <span className="block text-sm text-muted">WhatsApp {TELEFONE_MENUFACIL}</span>
            </span>
          </a>
        </div>
      </section>

      <div className="mt-auto pb-4">
        <BotaoSair nome={user.name} />
      </div>

      <GarcomNav base={base} />
    </main>
  );
}
