import { Download, ExternalLink, KeyRound, MonitorCheck, Receipt, Tv } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { formatWhen } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { TOTEM_APP_DISPONIVEL, TOTEM_APP_VERSION, TOTEM_SETUP_URL } from "@/lib/totem-release";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { verConfig } from "@/server/totem/config";
import { listarTotens } from "@/server/totem/dispositivos";
import { temChaveDoTotem } from "@/server/totem/segredo";

import { AccessTokenForm, DesconectarForm, MaquininhaForm, NovoTotemForm, RemoverTotemForm, WebhookForm } from "./forms";

export const metadata: Metadata = { title: "Totem" };

// A tela do totem no painel do restaurante.
//
// Três coisas moram aqui: a conta do Mercado Pago que vai cobrar (é a do
// próprio restaurante, o dinheiro não passa pela plataforma), os aparelhos
// de totem ligados a ele, e o link do painel de senhas do segundo monitor.

export default async function TotemPage({ params }: PageProps<"/painel/[restaurantId]/totem">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // o admin da plataforma libera restaurante por restaurante; o menu esconde,
  // e aqui barra de novo, para o endereço digitado na mão também não passar
  if (!restaurant.totemEnabled) notFound();

  const [config, totens] = await Promise.all([verConfig(restaurant.id), listarTotens(restaurant.id)]);
  const servidor = appUrl();
  const linkDasSenhas = `${servidor}/painel/senhas/${restaurant.id}`;
  // o id do restaurante vai no endereço: é por ele que o aviso do Mercado
  // Pago encontra a conta certa, já que cada restaurante usa a conta dele
  const linkDoWebhook = `${servidor}/api/totem/webhook?r=${restaurant.id}`;
  const guardaSegredo = temChaveDoTotem();

  const ligados = totens.filter((t) => !t.pairingCode);
  const esperando = totens.filter((t) => t.pairingCode);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Totem de autoatendimento"
        description="A tela de toque do balcão: o cliente monta o pedido, paga no cartão ou por Pix, e a comanda sai na hora."
      />

      {!guardaSegredo && (
        <Alert tone="warning">
          Este servidor ainda não está preparado para guardar os dados da sua conta do Mercado Pago com segurança. Fale com a
          equipe do MenuFácil antes de cadastrar o token.
        </Alert>
      )}

      <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <MonitorCheck className="size-12 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">A tela do totem</h2>
          <p className="text-sm text-muted">
            É o seu cardápio, o mesmo que você manda pelo WhatsApp — só que o fim do pedido pergunta se é para comer aqui
            ou levar, e cobra no cartão ou no Pix. Abra para ver como o cliente vê.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/totem/${restaurant.slug}`} target="_blank" rel="noopener" className={buttonClasses("secondary")}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver a tela
          </Link>
          <CopyLinkButton url={`${servidor}/totem/${restaurant.slug}`} />
        </div>
      </Card>

      <Card className="flex flex-col items-start gap-4 border-brand/50 sm:flex-row sm:items-center">
        <Tv className="size-12 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Painel de senhas</h2>
          <p className="text-sm text-muted">
            A tela virada para o salão, com o número dos pedidos em preparo e dos que já podem ser retirados. Abra este link
            numa segunda aba do navegador e arraste a janela para o outro monitor — ela se atualiza sozinha.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/painel/senhas/${restaurant.id}`} target="_blank" rel="noopener" className={buttonClasses("primary")}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Abrir
          </Link>
          <CopyLinkButton url={linkDasSenhas} />
        </div>
      </Card>

      <Card>
        <SectionTitle description="No totem o cliente paga no cartão ou por Pix — dinheiro não entra. Os dois caem direto na sua conta do Mercado Pago; o MenuFácil não fica com nada no meio.">
          <span className="flex items-center gap-2">
            <KeyRound className="size-5 text-faint" aria-hidden="true" />
            Sua conta do Mercado Pago
          </span>
        </SectionTitle>

        <div className="flex flex-col gap-6">
          <AccessTokenForm restaurantId={restaurant.id} resumo={config.tokenResumo} />
          <div className="border-t border-line pt-6">
            <MaquininhaForm restaurantId={restaurant.id} deviceId={config.deviceId} />
          </div>
          <div className="border-t border-line pt-6">
            <WebhookForm restaurantId={restaurant.id} temChave={config.temWebhook} />
            <div className="mt-4 rounded-control border border-line bg-surface-2 p-4">
              <p className="text-sm font-bold">Endereço para colar no Mercado Pago</p>
              <p className="mt-1 text-sm text-muted">
                Em Suas integrações → Webhooks, cadastre este endereço e marque o evento de pagamentos.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="min-w-0 truncate rounded-control bg-surface-3 px-3 py-2 text-sm">{linkDoWebhook}</code>
                <CopyButton text={linkDoWebhook} />
              </div>
            </div>
          </div>

          {(config.tokenResumo || config.deviceId) && (
            <div className="border-t border-line pt-6">
              <DesconectarForm restaurantId={restaurant.id} />
            </div>
          )}
        </div>

        {/* no totem o cliente paga no cartão ou por Pix -- dinheiro não existe lá */}
        {!config.prontoPix ? (
          <Alert tone="info" className="mt-6">
            Falta o Access Token para o totem conseguir cobrar. Sem ele, nem cartão nem Pix funcionam.
          </Alert>
        ) : config.prontoCartao ? (
          <Alert tone="success" className="mt-6">
            Tudo cadastrado. No totem o cliente paga no cartão (na maquininha) ou por Pix (QR na tela).
          </Alert>
        ) : (
          <Alert tone="warning" className="mt-6">
            O Pix já funciona. Falta o número da maquininha para o cliente também poder pagar no cartão.
          </Alert>
        )}
      </Card>

      <Card>
        <SectionTitle description="Cada tela de toque instalada no balcão deste restaurante.">
          <span className="flex items-center gap-2">
            <MonitorCheck className="size-5 text-faint" aria-hidden="true" />
            Totens ligados
          </span>
        </SectionTitle>

        {ligados.length === 0 && esperando.length === 0 ? (
          <p className="text-muted">
            Nenhum totem ligado ainda. Instale o aplicativo no computador do totem e entre com o mesmo e-mail e senha deste
            painel — ele já abre no seu cardápio.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {ligados.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{t.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {t.printerName ?? "Impressora não escolhida"}
                    {t.appVersion ? ` · versão ${t.appVersion}` : ""}
                    {t.lastSeenAt ? ` · visto ${formatWhen(t.lastSeenAt)}` : " · nunca abriu"}
                  </span>
                </span>
                <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
              </li>
            ))}
            {esperando.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-bold">
                    Aguardando o totem
                    <Badge tone="warning">código {t.pairingCode}</Badge>
                  </span>
                  <span className="block text-sm text-muted">Digite este código na tela do totem para ligá-lo a este restaurante.</span>
                </span>
                <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <NovoTotemForm restaurantId={restaurant.id} />
          <p className="mt-2 text-sm text-faint">
            Só precisa do código quem vai instalar o totem sem ter a senha do painel à mão.
          </p>
        </div>
      </Card>

      <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Receipt className="size-12 shrink-0 text-faint" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Aplicativo do totem</h2>
          <p className="text-sm text-muted">
            Roda em tela cheia no computador do totem, sem deixar ninguém sair para o Windows. A comanda sai na impressora
            que estiver ligada nele — e a mesma comanda continua saindo na impressora do balcão, pela aba Pedidos.
          </p>
        </div>
        {TOTEM_APP_DISPONIVEL ? (
          <a href={TOTEM_SETUP_URL} download className={buttonClasses("primary")}>
            <Download className="size-4" aria-hidden="true" />
            Baixar (versão {TOTEM_APP_VERSION})
          </a>
        ) : (
          <Badge tone="warning">Em preparo</Badge>
        )}
      </Card>
    </div>
  );
}
