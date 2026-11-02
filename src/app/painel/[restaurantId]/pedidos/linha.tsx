"use client";

import { Eye } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// A linha da tabela que abre embaixo.
//
// É a gaveta do cartão antigo, trazida para dentro da tabela: o olho abre o
// pedido ali mesmo, com os itens e o endereço, sem sair da lista. Quem
// quiser a página inteira acha o caminho dentro da gaveta aberta.
//
// Sair da lista para ver um pedido custa caro no movimento: perde-se o
// lugar, a rolagem e os outros pedidos que estavam na frente.

export function LinhaDePedido({
  children,
  acoes,
  detalhe,
  colunas,
  rotulo,
}: {
  /** as células da linha, menos a de ações */
  children: ReactNode;
  /** o botão do próximo passo, que fica ao lado do olho */
  acoes?: ReactNode;
  /** o que aparece embaixo quando a linha abre */
  detalhe: ReactNode;
  colunas: number;
  /** para o leitor de tela saber qual pedido este olho abre */
  rotulo: string;
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <tr className={cn("border-b border-line/70", aberta ? "bg-surface-2/50" : "hover:bg-surface-2/40")}>
        {children}
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center justify-end gap-2">
            {acoes}
            <button
              type="button"
              onClick={() => setAberta((a) => !a)}
              aria-expanded={aberta}
              aria-label={aberta ? `Fechar ${rotulo}` : `Ver ${rotulo}`}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-control border transition-colors",
                aberta ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <Eye className="size-4" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>

      {aberta && (
        <tr className="border-b border-line/70 bg-surface-2/30">
          <td colSpan={colunas} className="px-4 pt-1 pb-5">
            <div className="flex flex-col gap-5">{detalhe}</div>
          </td>
        </tr>
      )}
    </>
  );
}
