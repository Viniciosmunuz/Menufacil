import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCents, formatDateTime } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { verConta } from "@/server/salao/comanda";

export const metadata: Metadata = { title: "Conta da mesa" };

// A conta que vai para a mesa.
//
// É a folha que o cliente pede e confere antes de pagar: o que foi
// consumido, linha por linha, e o total. Não é a comanda da cozinha --
// aquela não leva preço, porque quem está no fogão não tem o que fazer com
// um valor.
//
// Página estreita e sem enfeite, do tamanho da bobina, com fundo branco e
// letra preta mesmo no tema escuro: papel térmico não tem tema.

export default async function ContaPage({ params }: PageProps<"/painel/[restaurantId]/salao/conta/[comandaId]">) {
  const { restaurantId, comandaId } = await params;
  const { restaurant } = await requireSalao(restaurantId);
  const c = await verConta(restaurant.id, comandaId);
  if (!c) notFound();

  const linha = "border-b border-dashed border-black/30 py-1.5";

  return (
    <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-[13px] leading-snug text-black print:max-w-none">
      <h1 className="text-center text-base font-bold uppercase">{restaurant.name}</h1>
      <p className="mb-3 text-center text-xs uppercase">Conta &middot; não é documento fiscal</p>

      <p className="text-center text-lg font-bold uppercase">{c.rotulo}</p>
      {c.nomeDaMesa && <p className="text-center text-xs uppercase">{c.nomeDaMesa}</p>}

      <p className={"mt-2 " + linha}>
        Aberta: {formatDateTime(c.abertaAt)}
        {c.garcom ? (
          <>
            <br />
            Garçom: {c.garcom}
          </>
        ) : null}
      </p>

      <p className="mt-3 mb-1 font-bold uppercase">Consumo</p>
      {c.itens.length === 0 ? (
        <p className={linha}>Nada lançado.</p>
      ) : (
        c.itens.map((i, n) => (
          <div key={n} className={linha}>
            <p className="flex justify-between gap-2">
              <span>
                {i.quantidade}x {i.nome}
              </span>
              <span className="shrink-0">{formatCents(i.centavos)}</span>
            </p>
            {i.opcoes && <p className="pl-4 text-[11px]">{i.opcoes}</p>}
            {i.observacao && <p className="pl-4 text-[11px]">obs: {i.observacao}</p>}
          </div>
        ))
      )}

      <p className={"flex justify-between " + linha}>
        <span>Subtotal</span>
        <span>{formatCents(c.subtotalCents)}</span>
      </p>
      {c.servicoCents > 0 && (
        <p className={"flex justify-between " + linha}>
          <span>Serviço</span>
          <span>{formatCents(c.servicoCents)}</span>
        </p>
      )}
      {c.descontoCents > 0 && (
        <p className={"flex justify-between " + linha}>
          <span>Desconto</span>
          <span>-{formatCents(c.descontoCents)}</span>
        </p>
      )}
      <p className="flex justify-between py-1.5 text-base font-bold">
        <span>Total</span>
        <span>{formatCents(c.totalCents)}</span>
      </p>

      {c.pagamentos.length > 0 && (
        <>
          <p className="mt-3 mb-1 font-bold uppercase">Pago</p>
          {c.pagamentos.map((p, n) => (
            <p key={n} className={"flex justify-between " + linha}>
              <span>{p.forma}</span>
              <span>{formatCents(p.centavos)}</span>
            </p>
          ))}
          <p className="flex justify-between py-1.5 font-bold">
            <span>{c.faltaCents > 0 ? "Falta" : "Conta paga"}</span>
            <span>{c.faltaCents > 0 ? formatCents(c.faltaCents) : ""}</span>
          </p>
        </>
      )}

      <p className="mt-6 text-center text-xs">MenuFácil</p>

      {/* a via sai sozinha ao abrir, como as outras do sistema */}
      <script dangerouslySetInnerHTML={{ __html: "window.onload = function(){ window.print(); }" }} />
    </div>
  );
}
