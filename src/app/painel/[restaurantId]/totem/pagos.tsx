"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCents } from "@/lib/format";

import { baixarPagamento, gravarPedidoPago, type TotemState } from "./actions";

// Pagamento que entrou sem o pedido entrar.
//
// Esta é a tela mais importante da aba, e por isso ela não mora numa
// gaveta: quando tem alguma linha aqui, tem dinheiro de cliente parado e
// comida que ninguém está fazendo. Sem linha nenhuma, não aparece nada --
// o balcão não precisa ver um bloco vazio todo dia.
//
// Cada linha tem as duas saídas lado a lado: gravar o pedido (que é o que
// resolve quando o cliente ainda está ali) e dar baixa escrevendo o que
// foi feito (quando o jeito foi devolver o dinheiro).

export type PagoSemPedido = {
  id: string;
  metodo: "CARD" | "PIX";
  valorCents: number;
  quando: string;
  mpPaymentId: string | null;
  motivo: string | null;
  cliente: string;
  comerAqui: boolean;
  observacao: string | null;
  itens: { nome: string; quantidade: number }[];
};

function Recado({ state }: { state: TotemState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-success" role="status">
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        {state.message}
      </span>
    );
  }
  return null;
}

export function PagosSemPedido({ restaurantId, pagamentos }: { restaurantId: string; pagamentos: PagoSemPedido[] }) {
  if (pagamentos.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-extrabold tracking-widest text-danger uppercase">Precisa da sua atenção</h2>

      <div className="flex flex-col gap-3 rounded-card border-2 border-danger/60 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <TriangleAlert className="size-6 shrink-0 text-danger" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-extrabold">
              {pagamentos.length === 1
                ? "Um cliente pagou e o pedido não entrou"
                : `${pagamentos.length} clientes pagaram e o pedido não entrou`}
            </h3>
            <p className="text-sm text-muted">
              O dinheiro já saiu do cartão, mas a cozinha não recebeu nada. Grave o pedido para ele sair na impressora, ou
              devolva o dinheiro e dê baixa aqui.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {pagamentos.map((p) => (
            <Linha key={p.id} restaurantId={restaurantId} pagamento={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Linha({ restaurantId, pagamento }: { restaurantId: string; pagamento: PagoSemPedido }) {
  const [gravarState, gravar] = useActionState<TotemState, FormData>(gravarPedidoPago, {});
  const [baixaState, baixar] = useActionState<TotemState, FormData>(baixarPagamento, {});
  const [daBaixa, setDaBaixa] = useState(false);

  return (
    <li className="flex flex-col gap-3 rounded-control border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-lg">{formatCents(pagamento.valorCents)}</strong>
          <Badge tone="neutral">{pagamento.metodo === "PIX" ? "Pix" : "Cartão"}</Badge>
          <Badge tone="neutral">{pagamento.comerAqui ? "Comer no local" : "Para viagem"}</Badge>
        </span>
        <span className="text-sm text-muted">{pagamento.quando}</span>
      </div>

      <div className="text-sm">
        <p className="font-bold">{pagamento.cliente}</p>
        {pagamento.itens.length > 0 && (
          <ul className="mt-1 text-muted">
            {pagamento.itens.map((item, i) => (
              <li key={i}>
                {item.quantidade}x {item.nome}
              </li>
            ))}
          </ul>
        )}
        {pagamento.observacao && <p className="mt-1 text-muted">Obs.: {pagamento.observacao}</p>}
      </div>

      {pagamento.motivo && (
        <p className="rounded-control bg-surface-2 p-3 text-sm text-muted">
          <strong className="text-ink">Por que não entrou:</strong> {pagamento.motivo}
        </p>
      )}

      {/* o número do Mercado Pago é o que o dono procura no extrato para
          conferir ou estornar: sem ele, achar o pagamento é no olho */}
      {pagamento.mpPaymentId && (
        <p className="text-sm text-faint">
          No Mercado Pago: <code className="text-muted">{pagamento.mpPaymentId}</code>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form action={gravar}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="pagamentoId" value={pagamento.id} />
          <SubmitButton pendingText="Gravando...">Gravar o pedido</SubmitButton>
        </form>
        {!daBaixa && (
          <Button variant="ghost" size="md" onClick={() => setDaBaixa(true)}>
            Resolvi por fora
          </Button>
        )}
      </div>

      <Recado state={gravarState} />

      {daBaixa && (
        <form action={baixar} className="flex flex-col gap-2 border-t border-line pt-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="pagamentoId" value={pagamento.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold">O que foi feito?</span>
            <input
              name="nota"
              placeholder="Devolvi o dinheiro / entreguei a comida na mão"
              maxLength={200}
              autoComplete="off"
              className="h-11 w-full rounded-control border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton variant="secondary" size="sm" pendingText="Dando baixa...">
              Dar baixa
            </SubmitButton>
            <Button variant="ghost" size="sm" onClick={() => setDaBaixa(false)}>
              Cancelar
            </Button>
          </div>
          <Recado state={baixaState} />
        </form>
      )}
    </li>
  );
}

/** o aviso curto, para a aba Pedidos: só diz que tem e leva para cá */
export function AvisoDePagosSemPedido({ quantos, href }: { quantos: number; href: string }) {
  if (quantos === 0) return null;
  return (
    <Alert tone="danger">
      <span className="flex flex-wrap items-center gap-x-2">
        <strong>
          {quantos === 1 ? "Um cliente pagou no totem e o pedido não entrou." : `${quantos} clientes pagaram no totem e o pedido não entrou.`}
        </strong>
        <a href={href} className="font-bold underline">
          Resolver na aba Totem
        </a>
      </span>
    </Alert>
  );
}
