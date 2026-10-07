import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCents, formatDateTime } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { numerosDaNoite } from "@/server/salao/turno";

export const metadata: Metadata = { title: "Fechamento do salão" };

// O papel do fechamento.
//
// Página estreita e sem enfeite, do tamanho da bobina: é feita para sair na
// impressora e ficar na gaveta junto com o dinheiro. Por isso fundo branco
// e letra preta mesmo no tema escuro -- papel térmico não tem tema.
//
// Tudo sai do que já estava gravado. O dono não digita número nenhum: a
// conta que ele faria de cabeça é a que o papel traz pronta.

export default async function FechamentoPage({ params }: PageProps<"/painel/[restaurantId]/salao/fechamento/[caixaId]">) {
  const { restaurantId, caixaId } = await params;
  const { restaurant } = await requireSalao(restaurantId);
  const n = await numerosDaNoite(restaurant.id, caixaId);
  if (!n) notFound();

  const linha = "border-b border-dashed border-black/30 py-1.5";

  return (
    <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-[13px] leading-snug text-black print:max-w-none">
      <h1 className="text-center text-base font-bold uppercase">{restaurant.name}</h1>
      <p className="mb-3 text-center text-xs uppercase">Fechamento do salão</p>

      <p className={linha}>
        Aberto: {formatDateTime(n.abertoAt)}
        <br />
        Fechado: {formatDateTime(n.fechadoAt)}
      </p>

      <p className="mt-3 mb-1 font-bold uppercase">Recebido</p>
      {n.porForma.length === 0 ? (
        <p className={linha}>Nenhuma mesa paga.</p>
      ) : (
        n.porForma.map((f) => (
          <p key={f.forma} className={`flex justify-between ${linha}`}>
            <span>
              {f.forma} ({f.pedidos})
            </span>
            <span>{formatCents(f.centavos)}</span>
          </p>
        ))
      )}
      <p className="flex justify-between py-1.5 font-bold">
        <span>Total recebido</span>
        <span>{formatCents(n.recebidoCents)}</span>
      </p>

      {/* o que saiu anotado não entrou em lugar nenhum: é a conta que a
          casa ainda vai cobrar, e por isso fica fora do total recebido */}
      {n.anotadoCents > 0 && (
        <p className={`flex justify-between ${linha}`}>
          <span>Anotado (a receber)</span>
          <span>{formatCents(n.anotadoCents)}</span>
        </p>
      )}

      <p className="mt-3 mb-1 font-bold uppercase">Gaveta</p>
      <p className={`flex justify-between ${linha}`}>
        <span>Abertura</span>
        <span>{formatCents(n.aberturaCents)}</span>
      </p>
      {/* só o dinheiro entra nesta conta: Pix e cartão não passam pela gaveta */}
      <p className="flex justify-between py-1.5 font-bold">
        <span>Deve ter em dinheiro</span>
        <span>{formatCents(n.naGavetaCents)}</span>
      </p>

      <p className="mt-3 mb-1 font-bold uppercase">A noite</p>
      <p className={`flex justify-between ${linha}`}>
        <span>Mesas atendidas</span>
        <span>{n.mesas}</span>
      </p>
      <p className={`flex justify-between ${linha}`}>
        <span>Ticket médio</span>
        <span>{formatCents(n.ticketCents)}</span>
      </p>
      {n.garcom && (
        <p className={`flex justify-between gap-3 ${linha}`}>
          <span>Garçom do dia</span>
          <span className="text-right">
            {n.garcom.nome} ({n.garcom.mesas})
          </span>
        </p>
      )}
      {n.prato && (
        <p className={`flex justify-between gap-3 ${linha}`}>
          <span>Mais pedido</span>
          <span className="text-right">
            {n.prato.nome} ({n.prato.quantidade})
          </span>
        </p>
      )}

      <p className="mt-6 text-center text-xs">MenuFácil</p>

      {/* a volta ao salão, que não sai no papel: é a última tela da noite, e
          daqui o dono abre o caixa do dia seguinte */}
      <div className="mt-6 print:hidden">
        <Link
          href={`/painel/${restaurant.id}/salao`}
          className="flex min-h-12 items-center justify-center rounded-lg border border-black/20 font-bold text-black"
        >
          Voltar ao salão
        </Link>
      </div>

      {/* a via sai sozinha ao abrir, como as outras do sistema */}
      <script dangerouslySetInnerHTML={{ __html: "window.onload = function(){ window.print(); }" }} />
    </div>
  );
}
