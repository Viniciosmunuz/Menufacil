import { Bell, BellOff, CircleAlert, CircleCheck, CircleSlash, Printer, QrCode, Tablet } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatWhen } from "@/lib/format";

// O que está de pé no restaurante, visto daqui.
//
// Quando o dono liga dizendo "não está imprimindo" ou "não chegou aviso", a
// resposta já estava no banco -- só não estava em lugar nenhum que desse
// para olhar. Era pedir print, ou entrar no painel dele e procurar.
//
// Três estados por linha, e nenhum deles é alarme: "ligado" (verde),
// "nunca foi ligado" (cinza, que é normal em quem não usa o recurso) e
// "ligado mas parou" (amarelo), que é o único que pede uma ligação.

export type Saude = {
  /**
   * A impressão do balcão, medida pelo que saiu no papel.
   *
   * O Menu Fácil para PC não se cadastra em lugar nenhum -- ele abre o
   * painel numa janela e imprime por dentro, e quem o enxerga é o navegador
   * do balcão, não o servidor. Perguntar por "computador pareado" dizia
   * "nenhum" num restaurante que estava imprimindo a noite toda.
   */
  impressao: { ultima: Date | null; ultimoNumero: number | null; naoImpressos: number; sumiu: boolean };
  /**
   * `sumiu` vem calculado da página: comparar com o relógio durante o
   * desenho é impuro, e o lint pega.
   */
  impressoras: { name: string; printerName: string | null; role: string; lastSeenAt: Date | null; sumiu: boolean }[];
  avisos: { quantos: number; ultimoOk: Date | null; sumiu: boolean };
  mercadoPago: { conectado: boolean; producao: boolean; ultimoAviso: Date | null } | null;
  totemLigado: boolean;
};

function Linha({ icone, titulo, estado, detalhe }: { icone: ReactNode; titulo: string; estado: "ok" | "parado" | "desligado"; detalhe: string }) {
  const Selo = estado === "ok" ? CircleCheck : estado === "parado" ? CircleAlert : CircleSlash;
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-control",
          estado === "ok" ? "bg-success/15 text-success" : estado === "parado" ? "bg-warning/15 text-warning" : "bg-surface-3 text-faint",
        )}
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{titulo}</span>
        <span className="block text-sm text-muted">{detalhe}</span>
      </span>
      <Selo
        className={cn("size-5 shrink-0", estado === "ok" ? "text-success" : estado === "parado" ? "text-warning" : "text-faint")}
        aria-label={estado === "ok" ? "funcionando" : estado === "parado" ? "parou de dar sinal" : "desligado"}
      />
    </li>
  );
}

export function SaudePanel({ saude, cemPorCento }: { saude: Saude; cemPorCento: boolean }) {
  const { impressao } = saude;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">Está tudo de pé?</h2>
        <p className="text-sm text-muted">O que o restaurante tem ligado agora, sem precisar pedir print.</p>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        <Linha
          icone={<Printer className="size-5" aria-hidden="true" />}
          titulo="Impressão das comandas"
          estado={impressao.naoImpressos > 0 ? "parado" : impressao.ultima ? "ok" : "desligado"}
          detalhe={
            impressao.naoImpressos > 0
              ? `${impressao.naoImpressos} ${impressao.naoImpressos === 1 ? "pedido entrou e não saiu" : "pedidos entraram e não saíram"} no papel.`
              : impressao.ultima
                ? `Última via: pedido #${impressao.ultimoNumero} · ${formatWhen(impressao.ultima)}`
                : "Nenhuma comanda impressa ainda."
          }
        />

        <Linha
          icone={saude.avisos.quantos > 0 ? <Bell className="size-5" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}
          titulo="Avisos no celular"
          estado={saude.avisos.quantos === 0 ? "desligado" : saude.avisos.sumiu ? "parado" : "ok"}
          detalhe={
            saude.avisos.quantos === 0
              ? "Nenhum aparelho ligado. Pedido novo não apita."
              : `${saude.avisos.quantos} ${saude.avisos.quantos === 1 ? "aparelho" : "aparelhos"} · ${
                  saude.avisos.ultimoOk ? `último entregue ${formatWhen(saude.avisos.ultimoOk)}` : "ainda sem nenhum aviso entregue"
                }`
          }
        />

        {/* o Mercado Pago só importa para quem está no 100% Delivery: nos
            outros, Pix é a chave copiada e não há conta para conectar */}
        {cemPorCento && (
          <Linha
            icone={<QrCode className="size-5" aria-hidden="true" />}
            titulo="Mercado Pago"
            estado={!saude.mercadoPago?.conectado ? "desligado" : saude.mercadoPago.ultimoAviso ? "ok" : "parado"}
            detalhe={
              !saude.mercadoPago?.conectado
                ? "Sem conta conectada. O Pix do 100% Delivery não tem como ser cobrado."
                : saude.mercadoPago.ultimoAviso
                  ? `${saude.mercadoPago.producao ? "Conta de produção" : "Conta de teste"} · último aviso recebido ${formatWhen(saude.mercadoPago.ultimoAviso)}`
                  : `${saude.mercadoPago.producao ? "Conta de produção" : "Conta de teste"} · nenhum aviso recebido ainda`
            }
          />
        )}

        {saude.totemLigado && (
          <Linha
            icone={<Tablet className="size-5" aria-hidden="true" />}
            titulo="Totem"
            estado="ok"
            detalhe={
              saude.impressoras.some((i) => i.role === "SENHA")
                ? "Ligado, com impressora de senha pareada."
                : "Ligado. Sem impressora de senha: o cliente não leva papel."
            }
          />
        )}
      </ul>
    </Card>
  );
}
