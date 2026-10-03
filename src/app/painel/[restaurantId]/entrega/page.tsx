import { Bike, CircleCheck, CreditCard, Link2, MessageSquare, Webhook } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Gaveta } from "@/components/ui/gaveta";
import { formatCents, formatDateTime, formatWhen } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { contarNaoLidasDoRestaurante } from "@/server/chat/chat";
import { prontoParaCobrar, verConta } from "@/server/pagamentos/conta";
import { temAplicativo } from "@/server/pagamentos/oauth";
import { resumoDoFullDelivery, ultimoAvisoDoMercadoPago } from "@/server/pagamentos/relatorio";
import { temChaveDePagamento } from "@/server/pagamentos/segredo";

import { conectarMercadoPago } from "./actions";
import { ConectarForm, DesconectarForm, ModoForm, SegredoDoWebhookForm, TokenColadoForm } from "./forms";

export const metadata: Metadata = { title: "Entrega" };

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

  const [conta, pronto, resumo, naoLidas, ultimoAviso] = await Promise.all([
    verConta(restaurant.id),
    // dá para cobrar agora? não é a mesma pergunta que "ligou pelo Mercado
    // Pago": quem já tinha colado o Access Token na seção Totem consegue
    // cobrar sem ligar nada -- é a conta dele do mesmo jeito
    prontoParaCobrar(restaurant.id),
    resumoDoFullDelivery(restaurant.id),
    contarNaoLidasDoRestaurante(restaurant.id),
    ultimoAvisoDoMercadoPago(restaurant.id),
  ]);


  const podeLigar = temAplicativo();
  const temChave = temChaveDePagamento();
  const ligado = restaurant.deliveryMode === "FULL_DELIVERY";
  const enderecoDoWebhook = `${appUrl()}/api/pagamento/webhook?r=${restaurant.id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Entrega"
        description="Como o cliente fecha e paga o pedido. Dá para trocar quando quiser: o que já está em pé não muda."
      />

      {recado && <Alert tone={recado.tom}>{recado.texto}</Alert>}

      {!temChave && (
        <Alert tone="danger">
          Este servidor ainda não tem a chave que guarda o token do Mercado Pago. Enquanto isso não for resolvido, não dá para
          conectar a conta. Fale com o suporte do MenuFácil.
        </Alert>
      )}

      {/* ---- a escolha ---- */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Bike className="size-5 text-brand" aria-hidden="true" />
            Como você recebe os pedidos
          </h2>
          {ligado && <Badge tone="success">100% Delivery ligado</Badge>}
        </div>
        <ModoForm
          restaurantId={restaurant.id}
          modo={restaurant.deliveryMode}
          contaPronta={pronto}
        />
      </Card>

      {/* ---- a conta do Mercado Pago ---- */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <CreditCard className="size-5 text-brand" aria-hidden="true" />
            Mercado Pago
          </h2>
          {conta.conectada ? (
            conta.producao ? (
              <Badge tone="success">Conectado</Badge>
            ) : (
              <Badge tone="warning">Conta de teste</Badge>
            )
          ) : (
            <Badge tone="neutral">Desconectado</Badge>
          )}
        </div>

        <p className="text-sm text-muted">
          O dinheiro do Pix cai na <strong className="text-ink">sua</strong> conta, direto. O MenuFácil não fica no meio do
          caminho: ele só pede ao Mercado Pago para gerar o QR em seu nome e escuta a confirmação. Você autoriza na sua conta e
          pode cortar o acesso por lá quando quiser.
        </p>

        {conta.conectada ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 rounded-control border border-line bg-surface-2 p-4 text-sm sm:grid-cols-2">
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

            {!conta.producao && (
              <Alert tone="warning">
                A conta que está ligada é de teste. Dá para experimentar o caminho inteiro, mas nenhum pagamento de verdade
                entra. Para receber, conecte a sua conta do Mercado Pago de produção.
              </Alert>
            )}
            {conta.precisaReconectar && (
              <Alert tone="danger">O acesso venceu e não há como renovar sozinho. Toque em Conectar outra conta.</Alert>
            )}
            {conta.ultimoErro && (
              <Alert tone="warning">
                Último recado do Mercado Pago: {conta.ultimoErro}
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {podeLigar && temChave && <ConectarForm restaurantId={restaurant.id} acao={conectarMercadoPago} conectada />}
            </div>
            <div className="border-t border-line pt-4">
              <DesconectarForm restaurantId={restaurant.id} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
            {podeLigar && temChave && (
              <div>
                <ConectarForm restaurantId={restaurant.id} acao={conectarMercadoPago} conectada={false} />
              </div>
            )}
            {!podeLigar && (
              <Alert tone="warning">
                Este servidor ainda não está cadastrado como aplicativo no Mercado Pago. Fale com o suporte do MenuFácil.
              </Alert>
            )}
            {temChave && (
              <div className="border-t border-line pt-4">
                <TokenColadoForm restaurantId={restaurant.id} resumo={conta.tokenResumo} />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ---- números, quando já houver ---- */}
      {resumo && resumo.pedidos.total > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold">Seu 100% Delivery até agora</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-faint">Pedidos</dt>
              <dd className="text-xl font-extrabold tabular-nums">{resumo.pedidos.total}</dd>
            </div>
            <div>
              <dt className="text-faint">Pagos</dt>
              <dd className="text-xl font-extrabold tabular-nums">{resumo.pedidos.pagos}</dd>
            </div>
            <div>
              <dt className="text-faint">Recebido por Pix</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatCents(resumo.transacionadoCents)}</dd>
            </div>
            <div>
              <dt className="text-faint">Esperando pagar</dt>
              <dd className="text-xl font-extrabold tabular-nums">{resumo.pedidos.esperandoPagamento}</dd>
            </div>
          </dl>
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

      {/* ---- o aviso automático do Mercado Pago ---- */}
      <Gaveta
        titulo="Aviso automático do Mercado Pago"
        resumo="Já funciona sozinho: você não precisa cadastrar nada"
        icone={<Webhook />}
        selo={<Badge tone="success">Automático</Badge>}
      >
        <p className="text-sm text-muted">
          Quando o cliente paga, o Mercado Pago avisa o MenuFácil na hora, e o pedido aparece aqui como pago mesmo que ele
          tenha fechado o navegador ou pago pelo aplicativo do banco em outro aparelho.
        </p>
        <p className="text-sm text-muted">
          <strong className="text-ink">Você não precisa fazer nada.</strong> O endereço do aviso vai junto com cada cobrança, já
          apontando para o seu restaurante. Não há nada para cadastrar na sua conta do Mercado Pago — e nem haveria onde: esse
          tipo de aviso mora dentro de uma aplicação de desenvolvedor, que quem vende não tem.
        </p>
        <p className="text-sm text-muted">
          E há uma segunda rede embaixo dessa: enquanto o cliente está com a tela do Pix aberta, o MenuFácil pergunta sozinho ao
          Mercado Pago de poucos em poucos segundos. Os dois caminhos chegam no mesmo lugar, e o pedido não é marcado como pago
          duas vezes.
        </p>

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
          ) : resumo && resumo.pedidos.pagos > 0 ? (
            <p className="mt-1 text-sm text-warning">
              Nenhum aviso chegou até agora, e já houve pedido pago. Enquanto for assim, o pagamento só confirma com a tela do
              cliente aberta. Vale avisar o suporte do MenuFácil.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Nada ainda — o primeiro aparece aqui depois da primeira venda por Pix.</p>
          )}
        </div>

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

      {/* ---- o que o cliente vê ---- */}
      <Gaveta titulo="O que muda para o seu cliente" resumo="O caminho do pedido, do cardápio até a entrega" icone={<Link2 />}>
        <ol className="flex flex-col gap-3 text-sm">
          {[
            ["Monta o pedido", "No mesmo cardápio de sempre, pelo seu link."],
            ["Escolhe entrega ou retirada", "Entrega pede o endereço; retirada não pede nada disso."],
            ["Paga por Pix", "QR e copia e cola na tela. O valor vai para a sua conta do Mercado Pago."],
            ["O pedido aparece aqui", "Só depois de o Mercado Pago confirmar. Aí a comanda sai e o sino toca."],
            ["Acompanha cada passo", "A tela dele muda sozinha: recebido, em preparo, pronto, saiu para entrega."],
            ["Conversa com você", "Pela mesma tela, amarrada ao pedido dele. Você responde na aba Pedidos."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">
                {i + 1}
              </span>
              <span>
                <strong className="block">{titulo}</strong>
                <span className="text-muted">{texto}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="rounded-control bg-surface-2 p-3 text-sm text-muted">
          Cartão e dinheiro continuam valendo, do jeito que estão em <strong className="text-ink">Meu restaurante</strong>:
          quem escolher uma dessas paga na entrega ou na retirada, como sempre.
        </p>
      </Gaveta>
    </div>
  );
}
