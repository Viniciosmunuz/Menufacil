import { Download, MonitorSmartphone, Printer, Wifi } from "lucide-react";
import type { Metadata } from "next";

import { CloudPrinterIcon } from "@/components/panel/cloud-printer-icon";
import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { PrintFacilPanel } from "@/components/panel/print-settings";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { PAPER_WIDTHS } from "@/lib/ticket";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { listDevices } from "@/server/print/devices";

import { pairPrintDevice, setReceiptWidth, unpairPrintDevice } from "../pedidos/actions";

export const metadata: Metadata = { title: "Print Fácil" };

const PASSOS = [
  {
    icon: Download,
    titulo: "Baixe e instale",
    texto:
      "Clique duas vezes no arquivo baixado. Se aparecer a tela azul “O Windows protegeu o seu computador”, toque em Mais informações e depois em Executar assim mesmo.",
  },
  { icon: MonitorSmartphone, titulo: "Entre com a sua conta", texto: "No programa, use o mesmo e-mail e senha deste painel. Ele já se liga ao seu restaurante." },
  {
    icon: Printer,
    titulo: "Escolha a impressora",
    texto:
      "Selecione a impressora do balcão e toque em Imprimir teste. Se ela for térmica, vale ligar o Modo térmica ali mesmo: a via sai com o número do pedido maior, o total em negrito e o papel cortado sozinho.",
  },
  { icon: Wifi, titulo: "Deixe rodando", texto: "Marque para abrir junto com o Windows. Dali em diante o pedido sai sozinho, sem ninguém mexer." },
];

// A página que o dono abre pelo menu do painel: baixa o programa, vê os
// computadores ligados e liga um novo.
export default async function PrintFacilPage({ params }: PageProps<"/painel/[restaurantId]/print-facil">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const devices = await listDevices(restaurant.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Print Fácil" description="O programa que imprime os pedidos sozinho no computador do restaurante." />

      <Card className="flex flex-col items-start gap-4 border-brand/50 sm:flex-row sm:items-center">
        <CloudPrinterIcon className="size-14 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Baixe para o computador do restaurante</h2>
          <p className="text-sm text-muted">
            Windows · instalador de 98 MB. O pedido chega pela internet, então o computador não precisa estar na mesma rede do celular.
          </p>
        </div>
        <a href="/print-facil-setup.exe" download className={buttonClasses("primary", "lg")}>
          <Download className="size-5" aria-hidden="true" />
          Baixar para Windows
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
        <SectionTitle description="A via sai no tamanho da bobina que o restaurante usa. Vale para a impressão pelo computador, pelo celular e pelo Print Fácil.">
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

      <Card>
        <SectionTitle description="Cada computador com o Print Fácil instalado aparece aqui.">Computadores ligados</SectionTitle>
        <div className="mt-3">
          <PrintFacilPanel devices={devices.map((d) => ({
            id: d.id,
            name: d.name,
            printerName: d.printerName,
            pairedAt: d.pairedAt?.toISOString() ?? null,
            lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
          }))} restaurantId={restaurant.id} pairAction={pairPrintDevice} unpairAction={unpairPrintDevice} />
        </div>
      </Card>
    </div>
  );
}
