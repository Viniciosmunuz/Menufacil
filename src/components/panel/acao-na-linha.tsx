"use client";

import type { ReactNode } from "react";

/**
 * O botão do próximo passo dentro do cabeçalho da gaveta.
 *
 * Clicar em qualquer ponto do <summary> abre e fecha o pedido -- é o que o
 * navegador faz sozinho. Segurar o clique aqui é o que deixa tocar no botão
 * sem a lista abrir debaixo do dedo.
 */
export function AcaoNaLinha({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </span>
  );
}
