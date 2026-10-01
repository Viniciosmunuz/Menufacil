import { Download, MonitorSmartphone, Printer, RefreshCw, Wifi } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CloudPrinterIcon } from "@/components/panel/cloud-printer-icon";
import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { PrintFacilPanel } from "@/components/panel/print-settings";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { APP_SETUP_PATH, APP_VERSION } from "@/lib/app-release";
import { PAPER_WIDTHS } from "@/lib/ticket";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { listDevices } from "@/server/print/devices";

import { pairPrintDevice, setReceiptWidth, unpairPrintDevice } from "../pedidos/actions";

export const metadata: Metadata = { title: "Menu Fácil para PC" };

const PASSOS = [
  {
    icon: Download,
    titulo: "Baixe e instale",
    texto:
      "Clique duas vezes no arquivo baixado. Se aparecer a tela azul “O Windows protegeu o seu computador”, toque em Mais informações e depois em Executar assim mesmo.",
  },
  {
    icon: MonitorSmartphone,
    titulo: "Entre com a sua conta",
    texto: "O aplicativo abre o mesmo painel do site. Use o mesmo e-mail e senha — e você cai na sua tela de sempre.",
  },
  {
    icon: Printer,
    titulo: "Escolha a impressora",
    texto:
      "Na tela de Pedidos, toque na setinha ao lado dos ícones de impressão: ali você escolhe a impressora, faz um teste e liga o modo térmica.",
  },
  {
    icon: Wifi,
    titulo: "Deixe aberto no balcão",
    texto: "Marque para abrir junto com o Windows e para o computador não dormir. O pedido passa a sair sozinho, sem ninguém clicar.",
  },
  {
    icon: RefreshCw,
    titulo: "Depois disso, esqueça",
    texto:
      "Ele se atualiza sozinho: a novidade do painel chega na hora e a versão nova do programa entra quando você fechar e abrir. Você não vai precisar baixar de novo.",
  },
];

// A página que o dono abre pelo menu do painel: baixa o Menu Fácil para
// PC e ajusta o tamanho do papel.
export default async function MenuFacilPcPage({ params }: PageProps<"/painel/[restaurantId]/menu-facil-pc">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // o admin da plataforma pode ter desligado este recurso para o restaurante
  if (!restaurant.printEnabled) notFound();
  const devices = await listDevices(restaurant.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Menu Fácil para PC"
        description="O mesmo painel que você usa aqui, instalado no computador do balcão — com a impressão automática por dentro."
      />

      <Card className="flex flex-col items-start gap-4 border-brand/50 sm:flex-row sm:items-center">
        <CloudPrinterIcon className="size-14 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Tenha o Menu Fácil instalado no computador do seu restaurante</h2>
          <p className="text-sm text-muted">
            Receba seus pedidos com impressão automática. Windows · versão {APP_VERSION}. O aplicativo abre este mesmo
            painel com o seu login e manda o pedido novo direto para a impressora, sem janela de confirmação.
          </p>
        </div>
        <a href={APP_SETUP_PATH} download className={buttonClasses("primary", "lg")}>
          <Download className="size-5" aria-hidden="true" />
          Baixar Menu Fácil para PC
        </a>
      </Card>

      <Card>
        <SectionTitle description="Leva uns três minutos, uma vez só.">Como instalar</SectionTitle>
        <ol className="mt-2 grid gap-4 sm:grid-cols-2">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-extrabold text-brand">{i + 1}</span>
              <span>
                <span className="flex items-center gap-2 font-bold">
                  <passo.icon className="size-4 text-brand" aria-hidden="true" />
                  {passo.titulo}
                </span>
                <span className="block text-sm text-muted">{passo.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <SectionTitle description="A via sai no tamanho da bobina que o restaurante usa. Vale para a impressão pelo computador, pelo celular e pelo aplicativo.">
          Tamanho do papel
        </SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAPER_WIDTHS.map((largura) => (
            <form key={largura} action={setReceiptWidth}>
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <input type="hidden" name="largura" value={largura} />
              <SubmitButton
                variant={restaurant.receiptWidth === largura ? "primary" : "secondary"}
                size="md"
                pendingText="Salvando..."
              >
                {largura} mm{largura === 80 ? " (padrão)" : ""}
              </SubmitButton>
            </form>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          {restaurant.receiptWidth === 80
            ? "Bobina larga, a mais comum em balcão: a via sai com 48 letras por linha."
            : "Bobina estreita, das impressoras pequenas e portáteis: a via sai com 32 letras por linha."}
        </p>
      </Card>

      {devices.length > 0 && (
        <Card>
          <SectionTitle description="Computadores que usavam o programa antigo de impressão. Depois que todos estiverem com o aplicativo novo, dá para desligar estes aqui.">
            Instalações antigas
          </SectionTitle>
          <div className="mt-3">
            <PrintFacilPanel
              devices={devices.map((d) => ({
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
            />
          </div>
        </Card>
      )}
    </div>
  );
}
