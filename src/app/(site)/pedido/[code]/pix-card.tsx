"use client";

import { Check, CircleCheck, Clock, QrCode, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCents } from "@/lib/format";

// O Pix do 100% Delivery, na tela do cliente.
//
// Três coisas e nada mais: o valor, o QR e o copia e cola. É a tela em que
// a pessoa está com o aplicativo do banco na outra mão, então ela não
// ganhou explicação comprida nem botão "já paguei" -- quem diz que o
// dinheiro entrou é o Mercado Pago, e a tela vira sozinha quando ele diz
// (ver PedidoAoVivo).
//
// O "já paguei" foi deixado de fora de propósito. No fluxo do WhatsApp ele
// existe porque alguém do restaurante precisa ir conferir o comprovante na
// mão. Aqui não há o que conferir: botão que não muda nada só ensina o
// cliente a achar que avisou.

/** conta o tempo que falta para o QR vencer, do lado de quem está olhando */
function useTempoRestante(venceEmIso: string | null) {
  const [agora, setAgora] = useState<number | null>(null);

  // o relógio só existe no navegador, e começa a contar no primeiro tique:
  // por isso a contagem aparece um instante depois do QR, e não no servidor
  useEffect(() => {
    if (!venceEmIso) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [venceEmIso]);

  if (!venceEmIso || agora === null) return null;
  const faltam = Math.max(0, Math.floor((new Date(venceEmIso).getTime() - agora) / 1000));
  const minutos = Math.floor(faltam / 60);
  const segundos = faltam % 60;
  return { faltam, texto: `${minutos}:${String(segundos).padStart(2, "0")}` };
}

export function PixCard({
  totalCents,
  copiaECola,
  qrBase64,
  venceEm,
  gerarOutro,
  desistir,
  code,
}: {
  totalCents: number;
  copiaECola: string;
  qrBase64: string | null;
  /** quando o QR perde a validade, em ISO */
  venceEm: string | null;
  /** ação que cria outro QR quando este vence */
  gerarOutro: (formData: FormData) => Promise<void>;
  /** o cliente mudou de ideia antes de pagar */
  desistir: (formData: FormData) => Promise<void>;
  code: string;
}) {
  const tempo = useTempoRestante(venceEm);
  const venceu = tempo !== null && tempo.faltam === 0;

  return (
    <Card className="flex flex-col gap-4 border-brand/50">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <QrCode className="size-5 text-brand" aria-hidden="true" />
          Pague com Pix
        </h2>
        <p className="text-2xl font-extrabold text-brand tabular-nums">{formatCents(totalCents)}</p>
      </div>

      {venceu ? (
        <div className="flex flex-col gap-3">
          <Alert tone="warning">Este código venceu sem o pagamento entrar. Gere outro para continuar — o pedido continua guardado.</Alert>
          <form action={gerarOutro}>
            <input type="hidden" name="code" value={code} />
            <SubmitButton size="lg" pendingText="Gerando..." className="w-full">
              <RefreshCw className="size-5" aria-hidden="true" />
              Gerar outro código
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          {qrBase64 && (
            <div className="flex justify-center">
              {/* o QR vem do Mercado Pago já em base64: é imagem de uma
                  cobrança só, que vence em minutos, então não passa pelo
                  otimizador de imagem nem vale guardar em lugar nenhum */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${qrBase64}`}
                alt="QR do Pix para pagar este pedido"
                width={260}
                height={260}
                className="rounded-control bg-white p-3"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold">Ou copie o código e cole no seu banco:</p>
            <div className="rounded-control border border-line bg-surface-2 p-3">
              <p className="max-h-20 overflow-y-auto font-mono text-xs break-all text-muted">{copiaECola}</p>
            </div>
            <CopyButton
              text={copiaECola}
              label="Copiar código do Pix"
              copiedLabel="Código copiado!"
              variant="primary"
              size="lg"
              className="w-full"
            />
          </div>

          {tempo && (
            <p className="flex items-center justify-center gap-2 text-sm font-bold text-muted">
              <Clock className="size-4" aria-hidden="true" />
              Este código vale por {tempo.texto}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-control bg-brand-soft px-4 py-3 text-sm font-bold text-brand">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Pode pagar e ficar nesta tela: ela avisa sozinha quando o pagamento cair, e o restaurante recebe o pedido nesse
              instante. Não precisa mandar comprovante para ninguém.
            </span>
          </div>

          {/* Discreto de propósito: quem chegou aqui veio pagar, e um botão
              de desistir do tamanho do de pagar convida a desistir. Mas ele
              precisa existir -- sem ele, quem muda de ideia só fecha a aba, e
              o pedido fica pendurado em "aguardando pagamento" para sempre,
              com o balcão olhando um pedido que nunca vai chegar. */}
          <form action={desistir} className="text-center">
            <input type="hidden" name="code" value={code} />
            <BotaoDeDesistir />
          </form>
        </>
      )}
    </Card>
  );
}

/** o "não quero mais": o segundo toque é que vale */
function BotaoDeDesistir() {
  const [perguntando, setPerguntando] = useState(false);
  const { pending } = useFormStatus();

  if (!perguntando) {
    return (
      <button
        type="button"
        onClick={() => setPerguntando(true)}
        className="text-sm font-semibold text-faint underline-offset-4 hover:text-muted hover:underline"
      >
        Mudei de ideia, cancelar o pedido
      </button>
    );
  }

  return (
    <span className="flex flex-col items-center gap-2">
      <span className="text-sm text-muted">Cancelar este pedido e voltar ao cardápio?</span>
      <span className="flex flex-wrap justify-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-control border border-danger/50 px-4 text-sm font-bold text-danger hover:bg-danger/10 disabled:opacity-60"
        >
          {pending ? "Cancelando..." : "Sim, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setPerguntando(false)}
          disabled={pending}
          className="h-10 rounded-control px-4 text-sm font-bold text-muted hover:text-ink"
        >
          Continuar pagando
        </button>
      </span>
    </span>
  );
}

/** depois de pago: um aviso curto, no lugar onde estava o QR */
export function PixPago({ totalCents }: { totalCents: number }) {
  return (
    <Card className="flex flex-col gap-1 border-success/50">
      <p className="flex items-center gap-2 text-lg font-extrabold text-success">
        <Check className="size-5 shrink-0" aria-hidden="true" />
        Pagamento confirmado
      </p>
      <p className="text-muted">
        Recebemos {formatCents(totalCents)} por Pix. O restaurante já está com o seu pedido.
      </p>
    </Card>
  );
}
