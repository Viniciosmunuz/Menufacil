import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCents, formatDateTime } from "@/lib/format";
import { oQueFalta, type ResumoDoFullDelivery } from "@/server/pagamentos/relatorio";

// O 100% Delivery deste restaurante, visto pelo admin da plataforma.
//
// Só leitura: ligar e desligar o recurso é no quadro Recursos, logo acima, e
// conectar a conta do Mercado Pago é do dono -- a plataforma não entra na
// conta de ninguém. Aqui é para responder ao telefone quando o restaurante
// liga dizendo que não está entrando pedido.

function Linha({ ok, children, aviso = false }: { ok: boolean; children: React.ReactNode; aviso?: boolean }) {
  const Icone = ok ? CircleCheck : aviso ? TriangleAlert : CircleX;
  return (
    <li className="flex items-start gap-2">
      <Icone
        className={`mt-0.5 size-4 shrink-0 ${ok ? "text-success" : aviso ? "text-warning" : "text-faint"}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

export function FullDeliveryPanel({ restaurantId, resumo }: { restaurantId: string; resumo: ResumoDoFullDelivery }) {
  const falta = oQueFalta(resumo);
  const { conta } = resumo;

  return (
    <Card>
      <SectionTitle description="Como está a modalidade neste restaurante. Quem liga e desliga o recurso é o quadro acima.">
        <span className="flex flex-wrap items-center gap-2">
          100% Delivery
          {resumo.ligado ? <Badge tone="success">Em uso</Badge> : resumo.liberado ? <Badge tone="warning">Liberado</Badge> : <Badge tone="neutral">Desligado</Badge>}
        </span>
      </SectionTitle>

      {falta ? <Alert tone={resumo.ligado ? "warning" : "info"}>{falta}</Alert> : <Alert tone="success">Tudo configurado.</Alert>}

      <ul className="mt-4 flex flex-col gap-2 text-sm">
        <Linha ok={resumo.liberado}>Recurso liberado pela plataforma</Linha>
        <Linha ok={resumo.ligado}>
          Fluxo escolhido pelo dono: <strong>{resumo.ligado ? "100% Delivery" : "Pedido pelo WhatsApp"}</strong>
        </Linha>
        <Linha ok={conta.conectada}>
          Conta do Mercado Pago{" "}
          {conta.conectada ? (
            <>
              <strong>conectada</strong>
              {conta.mpUserId && <span className="text-muted"> · conta {conta.mpUserId}</span>}
              {conta.conectadaEm && <span className="text-muted"> · desde {formatDateTime(conta.conectadaEm)}</span>}
            </>
          ) : (
            <strong>desconectada</strong>
          )}
        </Linha>
        {conta.conectada && !conta.producao && (
          <Linha ok={false} aviso>
            A conta ligada é de <strong>teste</strong>: serve para experimentar, não para receber.
          </Linha>
        )}
        <Linha ok={conta.webhook} aviso={conta.conectada && !conta.webhook}>
          Webhook do Mercado Pago {conta.webhook ? "cadastrado" : "sem a chave da assinatura"}
        </Linha>
      </ul>

      {conta.ultimoErro && (
        <p className="mt-3 rounded-control border border-danger/40 bg-danger/5 p-3 text-sm">
          <strong className="text-danger">Último erro do Mercado Pago:</strong> <span className="text-muted">{conta.ultimoErro}</span>
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-faint">Pedidos pelo 100% Delivery</dt>
          <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.total}</dd>
        </div>
        <div>
          <dt className="text-faint">Pagos</dt>
          <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.pagos}</dd>
        </div>
        <div>
          <dt className="text-faint">Valor transacionado</dt>
          <dd className="text-lg font-extrabold tabular-nums">{formatCents(resumo.transacionadoCents)}</dd>
          <dd className="text-xs text-faint">na conta do próprio restaurante</dd>
        </div>
        <div>
          <dt className="text-faint">Esperando pagamento</dt>
          <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.esperandoPagamento}</dd>
        </div>
        {resumo.mensagensSemResposta > 0 && (
          <div className="col-span-2">
            <dt className="text-faint">Mensagens de cliente sem resposta</dt>
            <dd className="text-lg font-extrabold tabular-nums text-warning">{resumo.mensagensSemResposta}</dd>
          </div>
        )}
      </dl>

      <Link
        href={`/painel/${restaurantId}/entrega`}
        className="mt-4 inline-block text-sm font-bold text-brand underline-offset-4 hover:underline"
      >
        Abrir a seção Entrega no painel dele
      </Link>
    </Card>
  );
}
