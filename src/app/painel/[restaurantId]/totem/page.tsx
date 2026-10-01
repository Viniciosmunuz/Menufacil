import { CreditCard, Download, ExternalLink, ImageIcon, KeyRound, MonitorSmartphone, Printer, Settings2, Tv } from "lucide-react";
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
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { PRINT_APK_DISPONIVEL, PRINT_APK_URL, PRINT_APK_VERSION } from "@/lib/totem-release";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { listDevices } from "@/server/print/devices";
import { verConfig } from "@/server/totem/config";
import { listarTotens } from "@/server/totem/dispositivos";
import { temChaveDoTotem } from "@/server/totem/segredo";

import { pairPrintDevice, setPrintDeviceRole, unpairPrintDevice } from "../pedidos/actions";
import { PrintFacilPanel } from "@/components/panel/print-settings";
import { AccessTokenForm, CartazForm, DesconectarForm, MaquininhaForm, NovoTotemForm, RemoverTotemForm, WebhookForm } from "./forms";

export const metadata: Metadata = { title: "Totem" };

// A aba Totem, em três blocos na ordem em que o dono precisa deles:
//
//   1. TOTEM      o link que vira o terminal, e os tablets ativados
//   2. IMPRESSÃO  o Menu Fácil Print e as impressoras ligadas
//   3. PAGAMENTOS a conta do Mercado Pago
//
// O que é configuração técnica (credencial, webhook, aparelhos) fica em
// gaveta fechada: ocupa uma linha quando não está em uso, e nada some.
//
// Esta mesma página serve o dono e o admin da plataforma -- o admin entra
// com a própria conta (viaAdmin, ver src/server/auth/dal.ts) e vê o mesmo
// que o dono veria.

export default async function TotemPage({ params }: PageProps<"/painel/[restaurantId]/totem">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // o admin libera restaurante por restaurante; o menu esconde, e aqui
  // barra de novo, para o endereço digitado na mão também não passar
  if (!restaurant.totemEnabled) notFound();

  const [config, totens, impressoras, cartaz] = await Promise.all([
    verConfig(restaurant.id),
    listarTotens(restaurant.id),
    listDevices(restaurant.id),
    // o acesso traz só o essencial do restaurante; o cartaz é desta tela
    db.restaurant.findUnique({ where: { id: restaurant.id }, select: { totemIdleUrl: true } }),
  ]);
  const cartazUrl = cartaz?.totemIdleUrl ?? null;

  const servidor = appUrl();
  const linkDoTotem = `${servidor}/totem/${restaurant.slug}`;
  const linkDasSenhas = `${servidor}/painel/senhas/${restaurant.id}`;
  const linkDoWebhook = `${servidor}/api/totem/webhook?r=${restaurant.id}`;
  const guardaSegredo = temChaveDoTotem();

  const ativados = totens.filter((t) => !t.pairingCode);
  const esperando = totens.filter((t) => t.pairingCode);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Totem de autoatendimento"
        description="Transforme um tablet em terminal do balcão: o cliente monta o pedido, paga no cartão ou por Pix, e a comanda sai sozinha."
      />

      {!guardaSegredo && (
        <Alert tone="warning">
          Este servidor ainda não está preparado para guardar os dados da sua conta do Mercado Pago com segurança. Fale com
          a equipe do MenuFácil antes de cadastrar o token.
        </Alert>
      )}

      {/* ---- 1. TOTEM ---------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold tracking-widest text-faint uppercase">Totem</h2>

        <Card className="flex flex-col gap-4 border-brand/50">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <MonitorSmartphone className="size-12 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold">O link do seu totem</h3>
              <p className="text-sm text-muted">
                Abra este endereço no navegador do tablet e deixe em tela cheia. Não precisa instalar nada e não precisa de
                senha: o link já diz qual é o restaurante.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/totem/${restaurant.slug}`} target="_blank" rel="noopener" className={buttonClasses("primary")}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Abrir Totem
              </Link>
              <CopyLinkButton url={linkDoTotem} />
            </div>
          </div>

          {/* O link abre o cardápio e não pergunta nada -- é ele que o cliente
              vai usar. Ativar é outro endereço, e é por onde o dono passa uma
              vez em cada tablet para aquele aparelho poder cobrar. */}
          <div className="flex flex-col items-start gap-3 rounded-control border border-dashed border-brand/50 bg-brand/5 p-4 sm:flex-row sm:items-center">
            <KeyRound className="size-6 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Primeira vez neste tablet? Ative o aparelho</p>
              <p className="text-sm text-muted">
                O link acima só mostra o cardápio: ele não pede código nenhum, de propósito, para o cliente nunca ver essa
                tela. Para o tablet conseguir <strong className="text-ink">cobrar</strong>, abra o endereço de ativação nele
                e digite um código gerado aqui embaixo, em Tablets ativados.
              </p>
            </div>
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

          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface-2 p-3">
            <code className="min-w-0 flex-1 truncate text-sm">{linkDoTotem}</code>
            <CopyButton text={linkDoTotem} />
          </div>
        </Card>

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

        <Gaveta
          titulo="Tablets ativados"
          resumo={
            ativados.length === 0
              ? "Nenhum tablet ativado para cobrar ainda"
              : `${ativados.length} ativado${ativados.length === 1 ? "" : "s"}`
          }
          icone={<Settings2 />}
          selo={esperando.length > 0 ? <Badge tone="warning">código em aberto</Badge> : undefined}
        >
          <p className="text-sm text-muted">
            O cardápio abre em qualquer aparelho, mas <strong className="text-ink">cobrar exige ativação</strong> — é o que
            impede alguém de fora cobrar em nome do seu restaurante. Gere um código aqui e digite no tablet, uma vez por
            aparelho, em <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{linkDoTotem}?ativar=1</code>.
          </p>

          {ativados.length === 0 && esperando.length === 0 ? (
            <p className="text-muted">Nenhum aparelho ligado ainda.</p>
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
                  <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
                </li>
              ))}
              {esperando.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      Aguardando o tablet
                      <Badge tone="warning">código {t.pairingCode}</Badge>
                    </span>
                    <span className="block text-sm text-muted">Digite este código no tablet para ativá-lo.</span>
                  </span>
                  <RemoverTotemForm restaurantId={restaurant.id} deviceId={t.id} />
                </li>
              ))}
            </ul>
          )}

          <NovoTotemForm restaurantId={restaurant.id} />
        </Gaveta>

        <Gaveta
          titulo="Tela de descanso"
          resumo={cartazUrl ? "Cartaz próprio cadastrado" : "Montada com a sua capa"}
          icone={<ImageIcon />}
          selo={cartazUrl ? <Badge tone="success">Cartaz próprio</Badge> : undefined}
        >
          <p className="text-sm text-muted">
            Sem ninguém tocar no tablet por um minuto, o totem vira um cartaz chamando quem passa — e some no primeiro
            toque, abrindo o cardápio. Com comida na sacola o cartaz não entra: quem está escolhendo não é interrompido.
          </p>
          <CartazForm restaurantId={restaurant.id} cartazUrl={cartazUrl} />
        </Gaveta>
      </section>

      {/* ---- 2. IMPRESSÃO ------------------------------------------------ */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold tracking-widest text-faint uppercase">Impressão</h2>

        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Printer className="size-12 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold">Menu Fácil Print</h3>
            <p className="text-sm text-muted">
              Instale no mesmo tablet do totem. Ele fica em segundo plano, recebe os pedidos sozinho e manda para a
              impressora térmica — ninguém precisa tocar em nada.
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
        </Card>

        <Gaveta
          titulo="Impressoras ligadas"
          resumo={
            impressoras.length === 0
              ? "Nenhuma impressora pareada"
              : `${impressoras.length} aparelho${impressoras.length === 1 ? "" : "s"} imprimindo`
          }
          icone={<Printer />}
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
      </section>

      {/* ---- 3. PAGAMENTOS ----------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold tracking-widest text-faint uppercase">Pagamentos</h2>

        {!config.prontoPix ? (
          <Alert tone="info">
            Falta o Access Token para o totem conseguir cobrar. Sem ele, nem cartão nem Pix funcionam.
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
          resumo="Conta que recebe, maquininha Point e avisos de pagamento"
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

          <AccessTokenForm restaurantId={restaurant.id} resumo={config.tokenResumo} />

          <div className="border-t border-line pt-5">
            <MaquininhaForm restaurantId={restaurant.id} deviceId={config.deviceId} />
          </div>

          {(config.tokenResumo || config.deviceId) && (
            <div className="border-t border-line pt-5">
              <DesconectarForm restaurantId={restaurant.id} />
            </div>
          )}
        </Gaveta>

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
      </section>
    </div>
  );
}
