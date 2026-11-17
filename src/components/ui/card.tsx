import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

// O cartão do painel.
//
// Ganhou sombra em 16/11/2026. Até então era borda e mais nada: num fundo
// creme, uma moldura de 1px da mesma família de cor não levanta o cartão
// do papel -- tudo fica na mesma altura, e uma tela com oito cartões
// parece uma tabela.
//
// A sombra é de duas camadas, como a luz faz: um fio escuro logo embaixo
// da borda, que dá a espessura da folha, e um borrão largo e muito claro
// mais abaixo, que dá a distância até o fundo. É o que separa papel bom de
// papel comum, e é de propósito que ela quase não se vê: sombra que se
// nota vira plástico.
//
// No escuro ela some sozinha (preto sobre preto), e lá quem separa é a
// diferença entre `surface` e o fundo.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-[0_1px_2px_-1px_rgb(28_25_23/0.06),0_12px_28px_-16px_rgb(28_25_23/0.14)] sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
