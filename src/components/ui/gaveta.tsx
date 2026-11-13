import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Seção que abre e fecha, para configuração que não precisa ficar à vista
// o tempo todo (credencial, ajuste técnico).
//
// É um <details> de verdade: abre sem JavaScript, o navegador já sabe fazer,
// e quem usa leitor de tela entende sozinho. O mesmo padrão das gavetas da
// lista de pedidos e do cardápio.

export function Gaveta({
  titulo,
  resumo,
  icone,
  selo,
  aberta = false,
  flutuante = false,
  children,
  className,
}: {
  titulo: string;
  /** uma linha dizendo o que tem dentro, visível com a gaveta fechada */
  resumo?: string;
  icone?: ReactNode;
  /** estado curto à direita do título ("Cadastrado", "Falta a chave") */
  selo?: ReactNode;
  aberta?: boolean;
  /**
   * Abre por cima do que vem depois, em vez de empurrar.
   *
   * Para gaveta numa linha de cartões lado a lado. Empurrando, abrir uma
   * esticava o cartão e jogava a linha inteira de baixo para longe --
   * com os vizinhos fechados ficando altos e vazios junto. Flutuando, o
   * resto da tela não se mexe.
   *
   * Não é o padrão porque numa pilha de gavetas (as de configuração) o
   * certo é o contrário: ali elas são uma lista, e tapar a de baixo com
   * a de cima esconderia justamente a próxima da fila.
   */
  flutuante?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      open={aberta}
      className={cn(
        "drawer group rounded-card border border-line bg-surface open:border-line-strong",
        // `open:z-20` e não `z-20` sempre: a gaveta fechada no topo da
        // pilha roubaria o clique de quem está ao lado dela
        flutuante && "relative open:z-20",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-card px-4 py-4 hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
        {icone && <span className="shrink-0 text-faint [&_svg]:size-5">{icone}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">{titulo}</span>
          {resumo && <span className="block truncate text-sm text-muted">{resumo}</span>}
        </span>
        {selo}
        <ChevronDown
          className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div
        className={cn(
          "flex flex-col gap-5 border-t border-line px-4 py-5 sm:px-5",
          // o corpo flutuante repete a moldura do cartão porque sai de
          // dentro dele: sem a borda e a sombra, o conteúdo parece
          // derramado sobre a tela
          flutuante &&
            "absolute inset-x-0 top-full rounded-b-card border-x border-b border-line-strong bg-surface shadow-2xl shadow-black/25",
        )}
      >
        {children}
      </div>
    </details>
  );
}
