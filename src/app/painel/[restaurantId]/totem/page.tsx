import { ChevronDown, CircleCheck, CreditCard, Download, ExternalLink, Globe, ImageIcon, KeyRound, MonitorSmartphone, Printer, Tv } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Gaveta } from "@/components/ui/gaveta";
import { formatWhen } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { PRINT_APK_DISPONIVEL, PRINT_APK_URL, PRINT_APK_VERSION } from "@/lib/totem-release";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { temAplicativo } from "@/server/pagamentos/oauth";
import { temChaveDePagamento } from "@/server/pagamentos/segredo";
import { listDevices } from "@/server/print/devices";
import { verConfig } from "@/server/totem/config";
import { listarTotens } from "@/server/totem/dispositivos";
import { pagamentosSemPedido } from "@/server/totem/pagos";
import { temChaveDoTotem } from "@/server/totem/segredo";

import { pairPrintDevice, setPrintDeviceRole, unpairPrintDevice } from "../pedidos/actions";
import { PrintFacilPanel } from "@/components/panel/print-settings";
import {
  AccessTokenForm,
  ConectarContaForm,
  DesconectarContaForm,
  DesconectarForm,
  Maquininha,
  NovoTotemForm,
  RemoverTotemForm,
  WebhookForm,
} from "./forms";
import { PagosSemPedido } from "./pagos";

export const metadata: Metadata = { title: "Totem" };

/** a volta do Mercado Pago, depois de o dono autorizar (ou desistir) */
const RECADOS: Record<string, { tom: "success" | "danger" | "warning"; texto: string }> = {
  ok: { tom: "success", texto: "Conta do Mercado Pago conectada. O totem já cobra por ela." },
  "sem-aplicativo": {
    tom: "warning",
    texto: "Este servidor ainda não está cadastrado como aplicativo no Mercado Pago. Fale com o suporte do MenuFácil.",
  },
  negado: { tom: "warning", texto: "A autorização foi cancelada no Mercado Pago. Nada mudou aqui." },
  erro: { tom: "danger", texto: "Não consegui concluir a conexão com o Mercado Pago. Tente de novo." },
};

// A aba Totem, em dois blocos na ordem em que o dono precisa deles:
//
//   1. TOTEM      o aplicativo, as impressoras, as senhas e o descanso -- e,
//                 numa gaveta, o link pelo navegador
//   2. PAGAMENTOS a conta do Mercado Pago e a maquininha
//
// O que é configuração técnica (credencial, webhook, aparelhos) fica em
// gaveta fechada: ocupa uma linha quando não está em uso, e nada some.
//
// Esta mesma página serve o dono e o admin da plataforma -- o admin entra
// com a própria conta (viaAdmin, ver src/server/auth/dal.ts) e vê o mesmo
// que o dono veria.

export default async function TotemPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/totem">) {
  const { restaurantId } = await params;
  const sp = await searchParams;
  const recado = typeof sp.mp === "string" ? RECADOS[sp.mp] : undefined;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // o admin libera restaurante por restaurante; o menu esconde, e aqui
  // barra de novo, para o endereço digitado na mão também não passar
  if (!restaurant.totemEnabled) notFound();

  const [config, totens, impressoras, pendentes] = await Promise.all([
    verConfig(restaurant.id),
    listarTotens(restaurant.id),
    listDevices(restaurant.id),
    pagamentosSemPedido(restaurant.id),
  ]);

  const servidor = appUrl();
  const linkDoTotem = `${servidor}/totem/${restaurant.slug}`;
  const linkDasSenhas = `${servidor}/painel/senhas/${restaurant.id}`;
  const linkDoWebhook = `${servidor}/api/totem/webhook?r=${restaurant.id}`;
  const guardaSegredo = temChaveDoTotem();
  // o botão de conectar precisa do aplicativo do MenuFácil no Mercado Pago
  // e da chave que guarda o token da conta conectada
  const podeConectar = temAplicativo() && temChaveDePagamento();

  const ativados = totens.filter((t) => !t.pairingCode);
  const esperando = totens.filter((t) => t.pairingCode);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Totem de autoatendimento"
        description="Transforme um tablet em terminal do balcão: o cliente monta o pedido, paga no cartão ou por Pix, e a comanda sai sozinha."
      />

      {recado && <Alert tone={recado.tom}>{recado.texto}</Alert>}

      {/* dinheiro de cliente parado vem antes de qualquer configuração */}
      <PagosSemPedido
        restaurantId={restaurant.id}
        pagamentos={pendentes.map((p) => ({
          id: p.id,
          metodo: p.metodo,
          valorCents: p.valorCents,
          quando: formatWhen(p.pagoEm ?? p.criadoEm),
          mpPaymentId: p.mpPaymentId,
          motivo: p.motivo,
          cliente: p.cliente,
          comerAqui: p.comerAqui,
          observacao: p.observacao,
          itens: p.itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade })),
        }))}
      />

      {/* ---- 1. TOTEM ---------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold tracking-widest text-faint uppercase">Totem</h2>

        {/* O caminho de todo restaurante é o aplicativo: ele abre o totem,
            imprime a senha e se ativa sozinho pelo código da impressora.
            O link no navegador ficou de reserva, na gaveta lá embaixo. */}
        <Card className="flex flex-col gap-4 border-brand/50">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <MonitorSmartphone className="size-12 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold">Menu Fácil Totem</h3>
              <p className="text-sm text-muted">
                O aplicativo do tablet: abre o seu totem em tela cheia e imprime a senha do cliente sozinho.
              </p>
            </div>
            {PRINT_APK_DISPONIVEL ? (
              <a href={PRINT_APK_URL} download className={buttonClasses("primary")}>
                <Download className="size-4" aria-hidden="true" />
                Baixar (versão {PRINT_APK_VERSION})
              </a>
            ) : (
              <Badge tone="warning">Em preparo</Badge>
            )}
          </div>
          <ol className="flex flex-col gap-2 text-sm text-muted">
            <li>
              <strong className="text-ink">1.</strong> Baixe e instale no tablet.
            </li>
            <li>
              <strong className="text-ink">2.</strong> Digite em <strong className="text-ink">Impressoras ligadas</strong>,
              logo abaixo, o código que aparecer nele, e marque essa impressora como Senha.
            </li>
            <li>
              <strong className="text-ink">3.</strong> Pronto: o totem abre sozinho no tablet, já cobrando. Não precisa
              ativar o tablet à parte.
            </li>
          </ol>
        </Card>

        <Gaveta
          titulo="Impressoras ligadas"
          resumo={
            impressoras.length === 0
              ? "Nenhuma impressora pareada"
              : `${impressoras.length} aparelho${impressoras.length === 1 ? "" : "s"} imprimindo`
          }
          icone={<Printer />}
          // sem nenhuma impressora, é aqui que o dono vai digitar o código
          aberta={impressoras.length === 0}
        >
          <p className="text-sm text-muted">
            Um pedido de totem rende <strong className="text-ink">dois papéis</strong>, e os dois trazem a senha:
          </p>
          <ul className="ml-5 list-disc text-sm text-muted">
            <li>
              <strong className="text-ink">Comanda</strong> — sai na impressora do computador do balcão, para a cozinha,
              com tudo que foi pedido. É como toda impressora vem de fábrica.
            </li>
            <li>
              <strong className="text-ink">Senha</strong> — sai na impressora do tablet, para o cliente levar: os itens,
              quanto pagou, como pagou e a senha dele.
            </li>
          </ul>
          <p className="text-sm text-muted">
            Marque a impressora do tablet como senha e a do computador como comanda. Cada papel tem a sua conta, então um
            não cancela o outro e nenhum sai duas vezes.
          </p>
          <PrintFacilPanel
            devices={impressoras.map((d) => ({
              id: d.id,
              name: d.name,
              role: d.role,
              printerName: d.printerName,
              pairedAt: d.pairedAt?.toISOString() ?? null,
              lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
            }))}
            restaurantId={restaurant.id}
            pairAction={pairPrintDevice}
            unpairAction={unpairPrintDevice}
            roleAction={setPrintDeviceRole}
          />
        </Gaveta>

        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Tv className="size-10 shrink-0 text-faint" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold">Painel de senhas</h3>
            <p className="text-sm text-muted">
              A tela virada para o salão, com as senhas em preparo e as que já podem ser retiradas. Abra numa TV ou num
              segundo monitor.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/painel/senhas/${restaurant.id}`} target="_blank" rel="noopener" className={buttonClasses("secondary")}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Abrir
            </Link>
            <CopyLinkButton url={linkDasSenhas} />
          </div>
        </Card>

        {/* um modelo só para todos os totens: a logo e o nome vêm do
            restaurante, e não há nada para configurar aqui */}
        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <ImageIcon className="size-10 shrink-0 text-faint" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold">Tela de descanso</h3>
            <p className="text-sm text-muted">
              Sem ninguém tocar por um minuto, o totem mostra a sua logo, o nome do restaurante e &ldquo;Toque para
              pedir&rdquo;. Para trocar a logo, use Meu restaurante.
            </p>
          </div>
          <Link
            href={`/totem/${restaurant.slug}?descanso=1`}
            target="_blank"
            rel="noopener"
            className={buttonClasses("secondary")}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver como fica
          </Link>
        </Card>

        {/* O jeito de antes, sem o aplicativo: o link aberto no navegador do
            tablet e a ativação à parte. Continua valendo -- é a reserva se o
            aplicativo der problema --, só não é mais o caminho principal. A
            lista mostra também os tablets do aplicativo, para o dono ver
            quando cada um falou com o servidor. */}
        <Gaveta
          titulo="Usar pelo navegador, sem o aplicativo"
          resumo={
            ativados.length === 0
              ? "O link do totem e a ativação do tablet à parte"
              : `${ativados.length} aparelho${ativados.length === 1 ? "" : "s"} cobrando`
          }
          icone={<Globe />}
          selo={esperando.length > 0 ? <Badge tone="warning">código em aberto</Badge> : undefined}
        >
          <p className="text-sm text-muted">
            O link abre o totem no navegador de qualquer aparelho, sem instalar nada. Ele só mostra o cardápio: para{" "}
            <strong className="text-ink">cobrar</strong>, o aparelho precisa ser ativado uma vez, com um código gerado aqui
            embaixo e digitado no endereço de ativação.
          </p>

          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface-2 p-3">
            <code className="min-w-0 flex-1 truncate text-sm">{linkDoTotem}</code>
            <CopyButton text={linkDoTotem} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/totem/${restaurant.slug}`} target="_blank" rel="noopener" className={buttonClasses("secondary")}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Abrir Totem
            </Link>
            <Link
              href={`/totem/${restaurant.slug}?ativar=1`}
              target="_blank"
              rel="noopener"
              className={buttonClasses("secondary")}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Ativar aparelho
            </Link>
          </div>

          {ativados.length === 0 && esperando.length === 0 ? (
            <p className="text-muted">Nenhum aparelho cobrando ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {ativados.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{t.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {t.appVersion ? `versão ${t.appVersion} · ` : ""}
                      {t.lastSeenAt ? `visto ${formatWhen(t.lastSeenAt)}` : "nunca abriu"}
                    </span>
                  </span>
                  {/* o do aplicativo se refaz sozinho ao abrir: quem tira é
                      desligar a impressora dele, em Impressoras ligadas */}
                  {t.printDeviceId ? (
                    <span className="text-sm text-muted">Pelo aplicativo</span>
                  ) : (
                    <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
                  )}
                </li>
              ))}
              {esperando.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      Aguardando o tablet
                      <Badge tone="warning">código {t.pairingCode}</Badge>
                    </span>
                    <span className="block text-sm text-muted">Digite este código no endereço de ativação.</span>
                  </span>
                  <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
                </li>
              ))}
            </ul>
          )}

          <NovoTotemForm restaurantId={restaurant.id} />
        </Gaveta>
      </section>

      {/* ---- 2. PAGAMENTOS ----------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold tracking-widest text-faint uppercase">Pagamentos</h2>

        {!config.prontoPix ? (
          <Alert tone="info">
            Falta conectar a conta do Mercado Pago para o totem conseguir cobrar. Sem ela, nem cartão nem Pix funcionam.
          </Alert>
        ) : config.prontoCartao ? (
          <Alert tone="success">
            Tudo cadastrado. No totem o cliente paga no cartão (na maquininha) ou por Pix (QR na tela).
          </Alert>
        ) : (
          <Alert tone="warning">
            O Pix já funciona. Falta o número da maquininha para o cliente também poder pagar no cartão.
          </Alert>
        )}

        <Gaveta
          titulo="Mercado Pago"
          resumo="Conta que recebe e maquininha Point"
          icone={<CreditCard />}
          selo={
            config.prontoCartao ? (
              <Badge tone="success">Pronto</Badge>
            ) : config.prontoPix ? (
              <Badge tone="warning">Só Pix</Badge>
            ) : (
              <Badge tone="neutral">Falta cadastrar</Badge>
            )
          }
        >
          <p className="text-sm text-muted">
            O dinheiro cai direto na sua conta: o MenuFácil só manda a cobrança para a sua maquininha e não fica com nada
            no meio.
          </p>

          {/* De onde vem a conta. O botão é o caminho de todo restaurante
              novo: ninguém copia token. O token colado continua valendo
              para quem já tinha, e fica de reserva para quem não consegue
              conectar. */}
          {config.origem === "colado" ? (
            <>
              <AccessTokenForm restaurantId={restaurant.id} resumo={config.tokenResumo} />
              {!guardaSegredo && <AvisoSemChave />}
            </>
          ) : config.origem === "conectado" ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-bold">
                <CircleCheck className="size-5 text-success" aria-hidden="true" />
                Conta do Mercado Pago conectada
              </p>
              <p className="text-sm text-muted">
                {restaurant.fullDeliveryEnabled
                  ? "É a mesma conta que recebe o Pix da entrega. Para trocar ou desligar, use a aba Mercado Pago."
                  : "O totem cobra por ela, sem token para copiar."}
              </p>
              {!restaurant.fullDeliveryEnabled && (
                <div className="flex flex-wrap items-center gap-3">
                  {podeConectar && <ConectarContaForm restaurantId={restaurant.id} conectada />}
                  <DesconectarContaForm restaurantId={restaurant.id} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ol className="flex flex-col gap-2 text-sm text-muted">
                <li>
                  <strong className="text-ink">1.</strong> Toque em Conectar Mercado Pago. Você sai para o site deles.
                </li>
                <li>
                  <strong className="text-ink">2.</strong> Entre com a conta do restaurante e autorize o MenuFácil.
                </li>
                <li>
                  <strong className="text-ink">3.</strong> Você volta para esta tela, e o totem já cobra por ela.
                </li>
              </ol>
              {podeConectar ? (
                <div>
                  <ConectarContaForm restaurantId={restaurant.id} conectada={false} />
                </div>
              ) : (
                <Alert tone="warning">
                  Este servidor ainda não está preparado para conectar contas do Mercado Pago. Fale com o suporte do
                  MenuFácil.
                </Alert>
              )}
              <details className="group rounded-control border border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-muted">
                  Não consigo conectar: colar o Access Token
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  {guardaSegredo ? (
                    <AccessTokenForm restaurantId={restaurant.id} resumo={config.tokenResumo} />
                  ) : (
                    <AvisoSemChave />
                  )}
                </div>
              </details>
            </div>
          )}

          <div className="border-t border-line pt-5">
            <Maquininha restaurantId={restaurant.id} deviceId={config.deviceId} temConta={config.prontoPix} />
          </div>

          {/* tira o token colado e a maquininha; a conta conectada fica */}
          {(config.tokenResumo || config.deviceId) && (
            <div className="border-t border-line pt-5">
              <DesconectarForm restaurantId={restaurant.id} />
            </div>
          )}
        </Gaveta>

        {/* O aviso assinado é coisa de quem tem aplicação própria no
            Mercado Pago, que é quem colou o token. Com a conta conectada
            não há onde cadastrar: o totem pergunta ao Mercado Pago, e basta. */}
        {(config.origem === "colado" || config.temWebhook) && (
          <Gaveta
            titulo="Avisos de pagamento"
            resumo="Endereço e chave para colar no Mercado Pago (opcional)"
            icone={<KeyRound />}
            selo={config.temWebhook ? <Badge tone="success">Cadastrada</Badge> : undefined}
          >
            <p className="text-sm text-muted">
              Sem isto o totem funciona: ele pergunta ao Mercado Pago de dois em dois segundos como está o pagamento. Com o
              aviso cadastrado, o pedido entra mesmo se o tablet travar no meio da passada.
            </p>

            <div className="rounded-control border border-line bg-surface-2 p-4">
              <p className="text-sm font-bold">Endereço para colar no Mercado Pago</p>
              <p className="mt-1 text-sm text-muted">
                Em Suas integrações → Webhooks, cadastre este endereço e marque o evento de pagamentos.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="min-w-0 flex-1 truncate rounded-control bg-surface-3 px-3 py-2 text-sm">{linkDoWebhook}</code>
                <CopyButton text={linkDoWebhook} />
              </div>
            </div>

            <WebhookForm restaurantId={restaurant.id} temChave={config.temWebhook} />
          </Gaveta>
        )}
      </section>
    </div>
  );
}

function AvisoSemChave() {
  return (
    <Alert tone="warning">
      Este servidor ainda não está preparado para guardar o token do Mercado Pago com segurança. Fale com a equipe do
      MenuFácil antes de colar.
    </Alert>
  );
}
