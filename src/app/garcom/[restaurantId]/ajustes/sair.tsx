"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { logout } from "@/server/auth/actions";

// Sair da conta, em dois toques.
//
// A confirmação existe porque sair custa caro para quem está do outro lado:
// o garçom teria de digitar CPF e senha de pé, no meio do salão, com mesa
// esperando. É o oposto da razão de a sessão se renovar sozinha -- e um
// toque errado na engrenagem não pode desfazer isso.

export function BotaoSair({ nome }: { nome: string | null }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control border border-line-strong font-extrabold text-danger transition-colors active:bg-danger/10"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Sair da conta
      </button>
    );
  }

  return (
    <form action={logout} className="flex flex-col gap-3 rounded-control border border-danger/50 bg-danger/10 p-4">
      <div>
        <p className="font-extrabold">Sair da conta{nome ? ` de ${nome}` : ""}?</p>
        <p className="text-sm text-muted">Para voltar a lançar pedido, você vai precisar do seu CPF e da sua senha.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-danger px-5 font-extrabold text-white"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Sim, sair
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="flex min-h-12 items-center justify-center rounded-control px-5 font-bold text-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
