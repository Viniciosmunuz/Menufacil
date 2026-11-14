"use client";

import { ArrowRight, CircleCheck, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

import { createLeadRapido, type LeadRapidoState } from "./actions";
import { SECOES } from "./conteudo";

// O cadastro de um campo só: o WhatsApp.
//
// Mora na chamada final da página. Já existiu também uma barra presa no pé
// da tela, que seguia a pessoa enquanto ela lia; ele pediu para tirar, porque
// tapava o conteúdo no celular.

/** a armadilha para robôs, igual à do formulário completo */
function Armadilha() {
  return (
    <div hidden aria-hidden="true">
      <label>
        Site
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

function Enviar({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(className, pending && "opacity-70")}>
      {children}
    </button>
  );
}

const CAMPO =
  "w-full min-w-0 rounded-full border px-5 text-base outline-none transition-colors placeholder:text-faint focus:border-brand";

export function CadastroRapido() {
  const [state, action] = useActionState<LeadRapidoState, FormData>(createLeadRapido, {});

  return (
    <div id={SECOES.cadastro} className="relative scroll-mt-24 rounded-[1.75rem] bg-bg p-6 text-ink shadow-[0_30px_70px_-30px_rgb(0_0_0/0.55)] sm:p-8">
      <span className="absolute -top-3.5 left-6 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[0.68rem] font-extrabold tracking-wide text-brand-ink uppercase sm:left-8">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Leva 1 minuto
      </span>

      {state.ok ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CircleCheck className="size-11 text-success" aria-hidden="true" />
          <p className="text-xl font-extrabold">Recebemos!</p>
          <p className="max-w-xs text-muted">A nossa equipe vai te chamar no WhatsApp em breve.</p>
        </div>
      ) : (
        <form action={action} className="flex flex-col">
          <p className="text-[1.35rem] leading-tight font-extrabold">Fale com a nossa equipe</p>
          <p className="mt-1 text-[0.95rem] text-muted">Deixe o seu WhatsApp que a gente te chama.</p>

          <Armadilha />
          <label htmlFor="whatsapp-topo" className="mt-6 mb-2 text-sm font-extrabold">
            WhatsApp<span className="text-brand">*</span>
          </label>
          <input
            id="whatsapp-topo"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel-national"
            placeholder="(92) 99999-0000"
            defaultValue={state.whatsapp}
            aria-invalid={!!state.error}
            className={cn(CAMPO, "h-14 bg-bg", state.error ? "border-danger" : "border-line-strong")}
          />
          {state.error && <p className="mt-2 text-sm font-bold text-danger">{state.error}</p>}

          <Enviar className="mt-4 flex h-14 items-center justify-center gap-2 rounded-full bg-brand text-[1.05rem] font-extrabold text-brand-ink shadow-[0_14px_30px_-12px_rgb(249_104_11/0.8)] transition-colors hover:bg-brand-hover">
            Quero conhecer o sistema
            <ArrowRight className="size-5" aria-hidden="true" />
          </Enviar>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-faint">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Lock className="size-3.5" aria-hidden="true" />
              Dados protegidos
            </span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Resposta no WhatsApp
            </span>
          </p>
        </form>
      )}
    </div>
  );
}
