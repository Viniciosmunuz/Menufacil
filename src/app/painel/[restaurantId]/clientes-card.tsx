import { MessageCircle, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCents, formatPhone } from "@/lib/format";
import type { ClienteDoMes } from "@/server/stats";

// Quem mais pede no mês.
//
// O painel sabia dizer quais pratos mais saem e não sabia dizer quem os
// compra. Num restaurante de bairro essa é a informação que todo sistema
// deixa de fora e que o dono tem na cabeça pela metade: quem vem toda
// semana, quem sumiu, quem chegou agora.
//
// O WhatsApp vem junto porque é assim que esse dono fala com o cliente dele
// -- agradecer, avisar de uma promoção, perguntar por que sumiu. O número já
// estava em cada pedido; o que faltava era juntar.

const link = (whatsapp: string, nome: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Oi, ${nome.split(" ")[0]}! `)}`;

export function ClientesCard({
  clientes,
  deQuemVoltou,
  totalDePedidos,
}: {
  clientes: ClienteDoMes[];
  deQuemVoltou: number;
  totalDePedidos: number;
}) {
  if (clientes.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Quem mais pede</h2>
          <p className="text-sm text-muted">Seus clientes dos últimos 30 dias.</p>
        </div>
        <Users className="size-5 text-faint" aria-hidden="true" />
      </div>

      <ol className="flex flex-col divide-y divide-line">
        {clientes.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0">
            <span
              className={
                i === 0
                  ? "grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink"
                  : "grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-sm text-muted"
              }
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2">
                <span className="truncate font-bold">{c.nome}</span>
                {/* quem chegou agora merece um aceno diferente de quem já era
                    de casa: são duas conversas diferentes */}
                {!c.jaPediaAntes && <span className="shrink-0 text-xs font-bold text-success">novo</span>}
              </span>
              <span className="block text-sm text-muted">
                {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"} · {formatCents(c.centavos)}
              </span>
            </span>
            {c.whatsapp && (
              <a
                href={link(c.whatsapp, c.nome)}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-ink"
                aria-label={`Falar com ${c.nome} no WhatsApp, ${formatPhone(c.whatsapp)}`}
                title={formatPhone(c.whatsapp)}
              >
                <MessageCircle className="size-5" aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ol>

      {/* o número que diz se o restaurante está criando freguesia ou
          trocando de cliente toda semana */}
      {totalDePedidos > 0 && (
        <p className="border-t border-line pt-3 text-sm text-muted">
          {deQuemVoltou === 0
            ? "Todos os pedidos deste mês são de clientes novos."
            : `${deQuemVoltou} de ${totalDePedidos} ${totalDePedidos === 1 ? "pedido é" : "pedidos são"} de quem já pedia antes.`}
        </p>
      )}
    </Card>
  );
}
