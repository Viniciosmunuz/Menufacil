import { MessageCircle, Repeat2, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { formatCents, formatPhone, startOfDaysAgo } from "@/lib/format";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { quemMaisPede } from "@/server/stats";

export const metadata: Metadata = { title: "Clientes" };

// Quem sustenta o restaurante.
//
// O painel sabia dizer quais pratos mais saem e não sabia dizer quem os
// compra. Num restaurante de bairro essa é a informação que todo sistema
// deixa de fora e que o dono tem na cabeça pela metade: quem vem toda
// semana, quem sumiu, quem chegou agora.
//
// Na tela de Início cabiam cinco nomes. Aqui cabe a lista inteira do mês,
// que é o que serve para decidir a quem mandar uma mensagem.
//
// O WhatsApp vem junto porque é assim que esse dono fala com o cliente dele
// -- agradecer, avisar de uma promoção, perguntar por que sumiu. O número já
// estava em cada pedido; o que faltava era juntar.

const DIAS = 30;

function Numero({
  icone,
  fundo,
  rotulo,
  valor,
  apoio,
}: {
  icone: ReactNode;
  fundo: string;
  rotulo: string;
  valor: number;
  apoio?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full text-white ${fundo}`}>{icone}</span>
      <div className="min-w-0">
        <p className="text-[0.8rem] leading-tight font-bold text-muted">{rotulo}</p>
        <p className="mt-0.5 text-[1.5rem] leading-none font-extrabold tabular-nums">
          {valor}
          {apoio && <span className="ml-1 text-sm font-bold text-muted">{apoio}</span>}
        </p>
      </div>
    </div>
  );
}

const link = (whatsapp: string, nome: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Oi, ${nome.split(" ")[0]}! `)}`;

export default async function ClientesPage({ params }: PageProps<"/painel/[restaurantId]/clientes">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  // sem limite: esta tela existe justamente para ver além dos cinco
  const { clientes, deQuemVoltou, totalDePedidos } = await quemMaisPede(restaurant.id, startOfDaysAgo(DIAS), 200);
  const novos = clientes.filter((c) => !c.jaPediaAntes).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes frequentes"
        description={`Quem pediu nos últimos ${DIAS} dias, do que mais pede para o que menos pede.`}
        back={{ href: `/painel/${restaurant.id}`, label: "Visão geral" }}
      />

      {clientes.length === 0 ? (
        <Card>
          <p className="text-muted">Assim que chegarem os primeiros pedidos, seus clientes aparecem aqui.</p>
        </Card>
      ) : (
        <>
          {/* o mesmo desenho dos indicadores da Visão geral: ícone cheio
              num círculo, rótulo pequeno e o número grande */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Numero icone={<Users className="size-5" aria-hidden="true" />} fundo="bg-brand" rotulo="Clientes no período" valor={clientes.length} />
            <Numero icone={<UserPlus className="size-5" aria-hidden="true" />} fundo="bg-success" rotulo="Chegaram agora" valor={novos} />
            <Numero
              icone={<Repeat2 className="size-5" aria-hidden="true" />}
              fundo="bg-info"
              rotulo="Pedidos de quem voltou"
              valor={deQuemVoltou}
              apoio={`de ${totalDePedidos}`}
            />
          </div>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold">Quem mais pede</h2>
                <p className="text-sm text-muted">Toque no ícone para falar no WhatsApp.</p>
              </div>
              <Users className="size-5 text-faint" aria-hidden="true" />
            </div>

            <ol className="flex flex-col divide-y divide-line">
              {clientes.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
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
                      {/* quem chegou agora merece um aceno diferente de quem já
                          era de casa: são duas conversas diferentes */}
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
                  ? "Todos os pedidos deste período são de clientes novos."
                  : `${deQuemVoltou} de ${totalDePedidos} ${totalDePedidos === 1 ? "pedido é" : "pedidos são"} de quem já pedia antes.`}
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
