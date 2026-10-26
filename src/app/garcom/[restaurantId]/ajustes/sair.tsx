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

/**
 * `discreto` é para as telas em que sair não é o assunto.
 *
 * Numa tela de aviso -- caixa fechado, salão não liberado -- quem está ali
 * quase sempre só quer ler o recado e esperar. Mas quem entrou com a conta
 * errada fica preso, porque essas telas não têm a barra de baixo. Então o
 * caminho existe, pequeno, no rodapé: quem procura acha, e quem não está
 * procurando não esbarra.
 *
 * A confirmação continua igual nas duas formas.
 */
export function BotaoSair({ nome, discreto = false }: { nome: string | null; discreto?: boolean }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    if (discreto) {
      return (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="flex min-h-11 items-center justify-center gap-1.5 px-3 text-sm font-bold text-faint transition-colors active:text-danger"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair da conta
        </button>
      );
    }

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
