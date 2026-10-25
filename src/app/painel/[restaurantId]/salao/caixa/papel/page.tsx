import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCents, formatDateTime } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { resumoDoCaixa } from "@/server/salao/resumo-do-caixa";
import { turnoAberto } from "@/server/salao/turno";

export const metadata: Metadata = { title: "Resumo do caixa" };

// O resumo do caixa no papel, para o dono conferir a gaveta com a folha na
// mão em vez de na tela.
//
// É a mesma soma da tela, lida pelo mesmo caminho. Página do tamanho da
// bobina, fundo branco e letra preta: papel térmico não tem tema.

export default async function PapelDoCaixaPage({ params }: PageProps<"/painel/[restaurantId]/salao/caixa/papel">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireSalao(restaurantId);

  const turno = await turnoAberto(restaurant.id);
  if (!turno) notFound();
  const r = await resumoDoCaixa(restaurant.id, turno.id);
  if (!r) notFound();

  const linha = "border-b border-dashed border-black/30 py-1.5";

  return (
    <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-[13px] leading-snug text-black print:max-w-none">
      <h1 className="text-center text-base font-bold uppercase">{restaurant.name}</h1>
      <p className="mb-3 text-center text-xs uppercase">Resumo do caixa &middot; caixa aberto</p>

      <p className={linha}>
        Aberto: {formatDateTime(r.abertoAt)}
        {r.abertoPor ? (
          <>
            <br />
            Por: {r.abertoPor}
          </>
        ) : null}
        <br />
        Tirado: {formatDateTime(new Date())}
      </p>

      <p className="mt-3 mb-1 font-bold uppercase">Recebido</p>
      {r.porForma.length === 0 ? (
        <p className={linha}>Nada recebido.</p>
      ) : (
        r.porForma.map((l) => (
          <p key={l.forma} className={"flex justify-between gap-2 " + linha}>
            <span>
              {l.nome} ({l.vendas})
            </span>
            <span className="shrink-0">{formatCents(l.centavos)}</span>
          </p>
        ))
      )}
      <p className="flex justify-between py-1.5 font-bold">
        <span>Vendas</span>
        <span>{formatCents(r.vendasCents)}</span>
      </p>

      <p className="mt-3 mb-1 font-bold uppercase">Gaveta</p>
      <p className={"flex justify-between " + linha}>
        <span>Valor de abertura</span>
        <span>{formatCents(r.aberturaCents)}</span>
      </p>
      <p className={"flex justify-between " + linha}>
        <span>Entradas</span>
        <span>+{formatCents(r.entradasCents)}</span>
      </p>
      <p className={"flex justify-between " + linha}>
        <span>Saidas</span>
        <span>-{formatCents(r.saidasCents)}</span>
      </p>
      <p className="flex justify-between py-1.5 text-base font-bold">
        <span>Deve ter</span>
        <span>{formatCents(r.naGavetaCents)}</span>
      </p>

      <p className="mt-3 mb-1">
        Contado: ______________________
        <br />
        <br />
        Diferenca: ____________________
      </p>

      {r.movimentos.length > 0 && (
        <>
          <p className="mt-3 mb-1 font-bold uppercase">Entradas e saidas</p>
          {r.movimentos.map((m) => (
            <p key={m.id} className={linha}>
              <span className="flex justify-between gap-2">
                <span>{m.motivo}</span>
                <span className="shrink-0">
                  {m.tipo === "ENTRADA" ? "+" : "-"}
                  {formatCents(m.centavos)}
                </span>
              </span>
              <span className="block text-[11px]">{m.quem}</span>
            </p>
          ))}
        </>
      )}

      {r.anotadoCents > 0 && (
        <p className="mt-3 flex justify-between font-bold">
          <span>Anotado, a receber</span>
          <span>{formatCents(r.anotadoCents)}</span>
        </p>
      )}

      {r.abertas.length > 0 && (
        <>
          <p className="mt-3 mb-1 font-bold uppercase">Mesas ainda abertas</p>
          {r.abertas.map((m) => (
            <p key={m.id} className={"flex justify-between gap-2 " + linha}>
              <span>{m.rotulo}</span>
              <span className="shrink-0">{formatCents(m.centavos)}</span>
            </p>
          ))}
        </>
      )}

      <p className="mt-6 text-center text-xs">MenuFácil</p>

      {/* a via sai sozinha ao abrir, como as outras do sistema */}
      <script dangerouslySetInnerHTML={{ __html: "window.onload = function(){ window.print(); }" }} />
    </div>
  );
}
