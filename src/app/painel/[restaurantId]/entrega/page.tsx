import { CircleCheck, CreditCard, MessageSquare, Settings2, Webhook } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Gaveta } from "@/components/ui/gaveta";
import { cn } from "@/lib/cn";
import { formatCents, formatDateTime, formatWhen } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { contarNaoLidasDoRestaurante } from "@/server/chat/chat";
import { verConta } from "@/server/pagamentos/conta";
import { temAplicativo } from "@/server/pagamentos/oauth";
import { resumoDoFullDelivery, ultimoAvisoDoMercadoPago } from "@/server/pagamentos/relatorio";
import { temChaveDePagamento } from "@/server/pagamentos/segredo";

import { conectarMercadoPago } from "./actions";
import { ConectarForm, DesconectarForm, SegredoDoWebhookForm, TokenColadoForm } from "./forms";

export const metadata: Metadata = { title: "Pagamentos" };

// A tela do dinheiro do 100% Delivery.
//
// Refeita em 16/11/2026, no rumo das outras: o que entrou vem primeiro e
// grande, porque é o que se abre esta tela para ver. Antes, o primeiro
// terço da página era um parágrafo explicando como o Mercado Pago
// funciona e três passos de como conectar -- tudo isso lido por quem já
// conectou há meses e só queria saber quanto caiu.
//
// Agora a conexão é uma linha com o estado à direita, como a do WhatsApp
// na tela da IA, e os detalhes técnicos (o token guardado, as datas, o
// endereço do aviso) foram para gavetas. O texto que tranquiliza -- o
// dinheiro cai na sua conta, o MenuFácil não fica no meio -- aparece só
// para quem ainda não conectou, que é quem precisa dele.

const RECADOS: Record<string, { tom: "success" | "danger" | "warning"; texto: string }> = {
  ok: { tom: "success", texto: "Conta do Mercado Pago conectada. O Pix do seu delivery já cai nela." },
  "sem-aplicativo": {
    tom: "warning",
    texto: "Este servidor ainda não está cadastrado como aplicativo no Mercado Pago. Fale com o suporte do MenuFácil.",
  },
  negado: { tom: "warning", texto: "A autorização foi cancelada no Mercado Pago. Nada mudou aqui." },
  expirado: { tom: "warning", texto: "A volta do Mercado Pago demorou demais. Toque em Conectar e faça de novo." },
  erro: { tom: "danger", texto: "Não consegui concluir a conexão com o Mercado Pago. Tente de novo." },
};

export default async function EntregaPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/entrega">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // o recurso é do admin: sem ele, esta seção não existe para o restaurante
  if (!restaurant.fullDeliveryEnabled) notFound();
  const sp = await searchParams;
  const recado = typeof sp.mp === "string" ? RECADOS[sp.mp] : undefined;

  const [conta, resumo, naoLidas, ultimoAviso] = await Promise.all([
    verConta(restaurant.id),
    resumoDoFullDelivery(restaurant.id),
    contarNaoLidasDoRestaurante(restaurant.id),
    ultimoAvisoDoMercadoPago(restaurant.id),
  ]);

  const podeLigar = temAplicativo();
  const temChave = temChaveDePagamento();
  const enderecoDoWebhook = `${appUrl()}/api/pagamento/webhook?r=${restaurant.id}`;
  const comNumeros = Boolean(resumo && resumo.pedidos.total > 0);

  /** o estado da conexão numa linha, que é o que o dono precisa saber */
  const estado = !conta.conectada
    ? { texto: "Desconectado", tom: "neutral" as const }
    : conta.precisaReconectar
      ? { texto: "O acesso venceu", tom: "danger" as const }
      : conta.producao
        ? { texto: "Conectado", tom: "success" as const }
        : { texto: "Conta de teste", tom: "warning" as const };

  const ligado = conta.conectada && !conta.precisaReconectar;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pagamentos" />

      {recado && <Alert tone={recado.tom}>{recado.texto}</Alert>}

      {!temChave && (
        <Alert tone="danger">
          Este servidor ainda não tem a chave que guarda o token do Mercado Pago. Enquanto isso não for resolvido, não dá para
          conectar a conta. Fale com o suporte do MenuFácil.
        </Alert>
      )}

      {/* ---- o dinheiro, que é o motivo de abrir esta tela ---- */}
      {resumo && comNumeros && (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="text-sm text-muted">Recebido por Pix</p>
              <p className="text-3xl leading-tight font-extrabold tabular-nums sm:text-4xl">
                {formatCents(resumo.transacionadoCents)}
              </p>
            </div>
            {/* os três contadores ao lado do valor, miúdos: são o detalhe
                do número grande, não três números concorrendo com ele */}
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-faint">Pedidos</dt>
                <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.total}</dd>
              </div>
              <div>
                <dt className="text-faint">Pagos</dt>
                <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.pagos}</dd>
              </div>
              <div>
                <dt className="text-faint">Esperando pagar</dt>
                <dd className="text-lg font-extrabold tabular-nums">{resumo.pedidos.esperandoPagamento}</dd>
              </div>
            </dl>
          </div>

          {naoLidas.mensagens > 0 && (
            <Alert tone="warning">
              <span className="flex flex-wrap items-center gap-x-2">
                <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
                <strong>
                  {naoLidas.mensagens === 1
                    ? "Um cliente escreveu e está esperando resposta."
                    : `${naoLidas.mensagens} mensagens de cliente esperando resposta.`}
                </strong>
                <Link href={`/painel/${restaurant.id}/pedidos`} className="font-bold underline">
                  Ver os pedidos
                </Link>
              </span>
            </Alert>
          )}
        </Card>
      )}

      {/* ---- a conta do Mercado Pago ---- */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-control",
                ligado ? "bg-success/12 text-success" : "bg-surface-2 text-faint",
              )}
            >
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold">Mercado Pago</p>
              <p className="text-sm text-muted">
                {ligado
                  ? conta.mpUserId
                    ? `Conta ${conta.mpUserId} · o Pix do delivery cai nela`
                    : "O Pix do seu delivery cai nesta conta"
                  : "O Pix do delivery precisa de uma conta ligada"}
              </p>
            </div>
          </div>
          <Badge tone={estado.tom}>{estado.texto}</Badge>
        </div>

        {conta.precisaReconectar && (
          <Alert tone="danger">O acesso venceu e não há como renovar sozinho. Toque em Conectar outra conta.</Alert>
        )}
        {conta.conectada && !conta.producao && (
          <Alert tone="warning">
            A conta que está ligada é de teste. Dá para experimentar o caminho inteiro, mas nenhum pagamento de verdade entra.
            Para receber, conecte a sua conta do Mercado Pago de produção.
          </Alert>
        )}
        {conta.conectada && conta.ultimoErro && (
          <Alert tone="warning">Último recado do Mercado Pago: {conta.ultimoErro}</Alert>
        )}

        {/* Só para quem ainda não conectou. Quem já ligou a conta há meses
            não precisa reler toda vez como o Mercado Pago funciona. */}
        {!conta.conectada && (
          <>
            <p className="text-sm text-muted">
              O dinheiro do Pix cai na <strong className="text-ink">sua</strong> conta, direto. O MenuFácil não fica no meio do
              caminho: ele só pede ao Mercado Pago para gerar o QR em seu nome e escuta a confirmação. Você autoriza na sua
              conta e pode cortar o acesso por lá quando quiser.
            </p>
            <ol className="flex flex-col gap-2 text-sm text-muted">
              <li>
                <strong className="text-ink">1.</strong> Toque em Conectar Mercado Pago. Você sai para o site deles.
              </li>
              <li>
                <strong className="text-ink">2.</strong> Entre com a conta do seu restaurante e autorize o MenuFácil.
              </li>
              <li>
                <strong className="text-ink">3.</strong> Você volta para esta tela com a conta ligada.
              </li>
            </ol>
            {!podeLigar && (
              <Alert tone="warning">
                Este servidor ainda não está cadastrado como aplicativo no Mercado Pago. Fale com o suporte do MenuFácil.
              </Alert>
            )}
          </>
        )}

        {podeLigar && temChave && (
          <div className="flex flex-wrap items-center gap-3">
            <ConectarForm restaurantId={restaurant.id} acao={conectarMercadoPago} conectada={conta.conectada} />
          </div>
        )}
      </Card>

      {/* ---- daqui para baixo, o que não se olha todo dia ---- */}

      {/* Os detalhes da conta e o botão de desconectar. Eram quatro campos
          técnicos sempre à vista -- o resumo do token, duas datas -- numa
          tela que o dono abre para ver quanto entrou. E desconectar, que
          derruba o recebimento do delivery inteiro, não é botão de ficar
          na frente. */}
      {conta.conectada && (
        <Gaveta
          titulo="Detalhes da conexão"
          resumo={conta.conectadaEm ? `Ligada em ${formatDateTime(conta.conectadaEm)}` : "O acesso guardado e como desligar"}
          icone={<Settings2 />}
        >
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-faint">Conta</dt>
              <dd className="font-bold">{conta.mpUserId ? `Mercado Pago ${conta.mpUserId}` : "Conectada"}</dd>
            </div>
            <div>
              <dt className="text-faint">Acesso guardado</dt>
              <dd className="font-mono font-bold">{conta.tokenResumo ?? "••••"}</dd>
            </div>
            {conta.conectadaEm && (
              <div>
                <dt className="text-faint">Conectada em</dt>
                <dd className="font-bold">{formatDateTime(conta.conectadaEm)}</dd>
              </div>
            )}
            {conta.ultimaConversa && (
              <div>
                <dt className="text-faint">Última conversa com o Mercado Pago</dt>
                <dd className="font-bold">{formatDateTime(conta.ultimaConversa)}</dd>
              </div>
            )}
          </dl>
          <div className="border-t border-line pt-4">
            <DesconectarForm restaurantId={restaurant.id} />
          </div>
        </Gaveta>
      )}

      {/* O token colado à mão, para quem não consegue ligar pelo OAuth. */}
      {!conta.conectada && temChave && (
        <Gaveta titulo="Não consigo conectar" resumo="Colar o Access Token do Mercado Pago à mão" icone={<Settings2 />}>
          <TokenColadoForm restaurantId={restaurant.id} resumo={conta.tokenResumo} />
        </Gaveta>
      )}

      {/* ---- o aviso automático do Mercado Pago ---- */}
      <Gaveta
        titulo="Aviso automático do Mercado Pago"
        // o resumo responde, fechado, a única pergunta que importa aqui:
        // o aviso está chegando?
        resumo={
          ultimoAviso
            ? `Está chegando · ${formatWhen(ultimoAviso)}`
            : comNumeros && resumo && resumo.pedidos.pagos > 0
              ? "Nenhum aviso chegou, e já houve pedido pago"
              : "Já funciona sozinho: você não precisa cadastrar nada"
        }
        icone={<Webhook />}
        selo={
          ultimoAviso ? (
            <Badge tone="success">Chegando</Badge>
          ) : comNumeros && resumo && resumo.pedidos.pagos > 0 ? (
            <Badge tone="warning">Confira</Badge>
          ) : (
            <Badge tone="neutral">Automático</Badge>
          )
        }
      >
        {/* a única coisa que não dá para descobrir olhando a tela: se o
            aviso automático está mesmo chegando. Com data aqui, está */}
        <div className="rounded-control border border-line bg-surface-2 p-4">
          <p className="text-sm font-bold">Último aviso recebido do Mercado Pago</p>
          {ultimoAviso ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
              <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
              <strong className="text-success">Está chegando</strong>
              <span className="text-muted">· {formatWhen(ultimoAviso)}</span>
            </p>
          ) : comNumeros && resumo && resumo.pedidos.pagos > 0 ? (
            <p className="mt-1 text-sm text-warning">
              Nenhum aviso chegou até agora, e já houve pedido pago. Enquanto for assim, o pagamento só confirma com a tela do
              cliente aberta. Vale avisar o suporte do MenuFácil.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Nada ainda — o primeiro aparece aqui depois da primeira venda por Pix.</p>
          )}
        </div>

        <p className="text-sm text-muted">
          Quando o cliente paga, o Mercado Pago avisa o MenuFácil na hora, e o pedido aparece aqui como pago mesmo que ele
          tenha fechado o navegador ou pago pelo aplicativo do banco em outro aparelho. Enquanto a tela do Pix está aberta, o
          MenuFácil ainda pergunta sozinho de poucos em poucos segundos — são duas redes para a mesma coisa, e o pedido não é
          marcado como pago duas vezes.
        </p>

        {/* O endereço e a chave ficam aqui embaixo, fechados, para o caso de
            quem já tem aplicação própria no Mercado Pago -- é o caso de quem
            usa o Totem, que cadastrou tudo na mão. Para esse, conferir a
            assinatura do aviso é uma camada a mais. Para todo o resto, não é
            para aparecer nada disso na frente. */}
        <details className="border-t border-line pt-4 text-sm">
          <summary className="cursor-pointer font-bold text-muted hover:text-ink">
            Tenho uma aplicação própria no Mercado Pago
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-bold">O endereço do aviso deste restaurante:</p>
              <div className="flex flex-col gap-2 rounded-control border border-line bg-surface-2 p-3 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all text-muted">{enderecoDoWebhook}</code>
                <CopyButton text={enderecoDoWebhook} label="Copiar" copiedLabel="Copiado!" variant="secondary" size="sm" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-bold">A chave secreta da assinatura, se você tiver uma:</p>
              <SegredoDoWebhookForm restaurantId={restaurant.id} cadastrado={conta.temWebhook} />
              <p className="text-muted">
                Com ela, o sistema confere a assinatura de cada aviso antes de olhar para ele. Sem ela, o aviso é tratado com
                desconfiança e só vale o que o próprio sistema for perguntar ao Mercado Pago — que é seguro do mesmo jeito,
                só gasta uma consulta a mais.
              </p>
            </div>
          </div>
        </details>
      </Gaveta>
    </div>
  );
}
