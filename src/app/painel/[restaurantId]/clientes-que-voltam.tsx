import { ChevronRight, Repeat2 } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// Quantos pedidos do mês vieram de quem já tinha pedido antes.
//
// Entrou em 16/11/2026, no lugar do "Como está o dia", que comparava o
// dia com a média da semana e, enquanto não houvesse semana, ocupava um
// quarto da tela para avisar que ainda não tinha o que dizer.
//
// Este número não existe no iFood nem no WhatsApp solto: lá o cliente é
// da plataforma ou é um nome na agenda. Aqui ele tem cadastro, e dá para
// saber se voltou. É o argumento de venda do MenuFácil virado em conta --
// e, para o dono, é o único número da tela que fala do mês que vem, não
// do dia de hoje.
//
// A conta e os nomes já vinham de `quemMaisPede`, que a tela de Clientes
// usa: nenhuma consulta nova foi acrescentada ao painel por causa deste
// cartão.

export function ClientesQueVoltam({
  deQuemVoltou,
  totalDePedidos,
  href,
}: {
  /** pedidos do mês feitos por quem já havia pedido antes */
  deQuemVoltou: number;
  totalDePedidos: number;
  href: string;
}) {
  // sem pedido no mês não há fração, e uma porcentagem de nada mentiria
  const pct = totalDePedidos > 0 ? Math.round((deQuemVoltou / totalDePedidos) * 100) : null;

  return (
    <Card className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-muted uppercase">
        <Repeat2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
        Clientes que voltam
      </p>

      {pct === null ? (
        <p className="text-sm text-muted">
          Quando os primeiros pedidos chegarem, aqui aparece quanto do movimento vem de quem já comprou com você.
        </p>
      ) : (
        <>
          <p>
            <span
              className={cn(
                "text-4xl leading-none font-extrabold tracking-tight tabular-nums",
                // metade ou mais do movimento vindo de cliente antigo é
                // casa que se sustenta sozinha; abaixo disso, o número
                // ainda é informação, mas não é notícia boa
                pct >= 50 ? "text-brand" : "text-ink",
              )}
            >
              {pct}%
            </span>
          </p>
          <p className="text-sm text-muted">
            dos {totalDePedidos} pedidos deste mês são de quem <strong className="text-ink">já tinha pedido</strong> no seu
            restaurante.
          </p>
        </>
      )}

      <Link href={href} className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-bold text-brand hover:underline">
        Ver os clientes
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
