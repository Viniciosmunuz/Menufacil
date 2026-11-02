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
  barra,
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
  /** a cor da tarja na ponta esquerda: o estado do pedido, de longe */
  barra?: string;
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      {/* O cartão é feito nas células: numa tabela com espaço entre as
          linhas a borda vive nelas, não no <tr>. Primeira e última arredondam
          as pontas, e é isso que dá o bloco. */}
      <tr
        className={cn(
          "[&>td]:border-y [&>td]:border-line [&>td:first-child]:rounded-l-card [&>td:first-child]:border-l-4",
          "[&>td:last-child]:rounded-r-card [&>td:last-child]:border-r",
          barra,
          aberta ? "[&>td]:border-line-strong [&>td]:bg-surface-2/50 [&>td:first-child]:rounded-bl-none [&>td:last-child]:rounded-br-none" : "[&>td]:bg-surface hover:[&>td]:bg-surface-2/40",
        )}
      >
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
        // a gaveta encosta na linha de cima: é o mesmo cartão, aberto
        // o -translate-y-2 come o vão que separa as linhas: aqui não é outro
        // pedido, é o mesmo cartão continuando
        <tr className={cn("[&>td]:-translate-y-2 [&>td]:border-x [&>td]:border-b [&>td]:border-line-strong [&>td]:bg-surface-2/30", "[&>td:first-child]:border-l-4", barra)}>
          <td colSpan={colunas} className="rounded-b-card px-4 pt-1 pb-5">
            <div className="flex flex-col gap-5">{detalhe}</div>
          </td>
        </tr>
      )}
    </>
  );
}
