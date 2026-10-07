import Link from "next/link";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { LugarNoMapa } from "@/server/salao/mesas";

// Um lugar no mapa do salão.
//
// Três informações, e nada mais: o número, em que pé está e quanto tem na
// conta. Itens e minutos saíram -- quem atravessa o salão decidindo para
// onde ir não lê "5 itens · 91 min", lê a cor; e quem quer o detalhe abre
// a mesa, que é um toque.
//
// A cor diz o estado de longe e a palavra confirma de perto, dentro do
// próprio cartão. Era uma legenda no alto da tela, que obrigava o olho a
// subir, decorar três cores e voltar.

const CORES: Record<LugarNoMapa["status"], string> = {
  LIVRE: "border-line bg-surface hover:border-line-strong",
  OCUPADA: "border-brand/60 bg-brand-soft hover:border-brand",
  PAGO: "border-success/60 bg-success/15 hover:border-success",
};

const PALAVRA: Record<LugarNoMapa["status"], string> = {
  LIVRE: "Livre",
  OCUPADA: "Ocupada",
  PAGO: "Pago",
};

const COR_DA_PALAVRA: Record<LugarNoMapa["status"], string> = {
  LIVRE: "text-faint",
  OCUPADA: "text-brand",
  PAGO: "text-success",
};

export function MesaCard({ lugar, href }: { lugar: LugarNoMapa; href: string }) {
  const livre = lugar.status === "LIVRE";
  const rotulo = lugar.tipo === "BALCAO" ? "Balcão" : "Mesa";

  return (
    <Link
      href={href}
      aria-label={`${rotulo} ${lugar.numero}: ${PALAVRA[lugar.status].toLowerCase()}${livre ? "" : `, ${formatCents(lugar.centavos)}`}`}
      className={cn("flex min-h-24 flex-col justify-between gap-2 rounded-card border p-3 transition-colors", CORES[lugar.status])}
    >
      <span className={cn("text-xs font-bold tracking-wide uppercase", COR_DA_PALAVRA[lugar.status])}>{PALAVRA[lugar.status]}</span>

      <span>
        <span className="block font-extrabold text-ink">
          {rotulo} {lugar.numero}
        </span>
        {/* a mesa livre não mostra R$ 0,00: zero não é informação, é ruído
            numa grade onde metade das mesas está vazia */}
        {!livre && <span className="block text-xl font-extrabold tabular-nums text-ink">{formatCents(lugar.centavos)}</span>}
      </span>
    </Link>
  );
}
