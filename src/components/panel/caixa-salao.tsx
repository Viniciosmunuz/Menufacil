import { Lock } from "lucide-react";
import type { ReactNode } from "react";

// O aviso de caixa fechado, que é a tela inteira do salão enquanto ninguém
// abriu o caixa.
//
// Quem abre o salão às seis da tarde quer saber de uma coisa: dá para
// começar. Mostrar o mapa com todas as mesas livres e esconder o aviso
// atrás de uma aba faria o dono tocar numa mesa, tentar lançar e só aí
// descobrir que o salão não abriu.
//
// A prestação de contas do turno mora em outra tela, o Resumo do Caixa.

/**
 * O caixa fechado, no jeito do Yooga: o aviso grande no meio da tela e o
 * "Abrir caixa" embaixo dele. É o primeiro toque da noite, então não
 * divide a tela com mais nada.
 */
export function CaixaFechado({ abrir }: { abrir: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-card border border-line bg-surface px-6 py-10 text-center shadow-sm sm:px-10">
        <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
          <Lock className="size-9" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold">Caixa fechado</h2>
          <p className="text-muted">Enquanto o caixa não abrir, os garçons veem o caixa fechado e não conseguem lançar pedido.</p>
        </div>
        {abrir}
      </div>
    </div>
  );
}
