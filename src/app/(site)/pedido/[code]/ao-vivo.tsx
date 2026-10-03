"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// O canal ao vivo da página do pedido, no 100% Delivery.
//
// Mesma ideia do painel (ver OrdersLive): um sinal leve é perguntado de
// poucos em poucos segundos e, quando a resposta muda, a tela se refaz pelo
// servidor. Quem desenha continua sendo o servidor, com os dados do banco --
// assim não existem dois desenhos da mesma coisa para discordarem.
//
// É isto que faz três coisas acontecerem sem o cliente tocar em nada:
//
// 1. o Pix cair e a tela virar "pago";
// 2. cada passo do balcão aparecer (recebido, em preparo, saiu para entrega);
// 3. a resposta do restaurante entrar na conversa.
//
// Enquanto o pagamento não entrou, pergunta mais rápido: é o momento em que
// a pessoa está olhando a tela esperando. Depois, devagar.

const RAPIDO_MS = 4000;
const CALMO_MS = 10_000;

export function PedidoAoVivo({ code, esperandoPagamento }: { code: string; esperandoPagamento: boolean }) {
  const router = useRouter();
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let relogio: ReturnType<typeof setTimeout>;
    const intervalo = esperandoPagamento ? RAPIDO_MS : CALMO_MS;

    const olhar = async () => {
      try {
        const resposta = await fetch(`/api/pagamento/situacao?code=${encodeURIComponent(code)}`, { cache: "no-store" });
        if (!resposta.ok) return;
        const dados = (await resposta.json()) as {
          status?: string;
          pagamento?: string;
          venceu?: boolean;
          chat?: { mensagens?: number; ultimaEm?: number };
        };
        // uma linha com tudo que faria a tela mudar: compará-la é mais
        // barato e mais seguro do que tentar adivinhar o que mexeu
        const agora = [dados.status, dados.pagamento, dados.venceu, dados.chat?.mensagens, dados.chat?.ultimaEm].join(":");
        if (ultimo.current !== null && ultimo.current !== agora) router.refresh();
        ultimo.current = agora;
      } catch {
        // internet caiu: na próxima volta tenta de novo
      }
    };

    const voltar = () => {
      relogio = setTimeout(async () => {
        if (!vivo) return;
        // aba escondida não gasta bateria nem dados: espera voltar à frente
        if (document.visibilityState === "visible") await olhar();
        if (vivo) voltar();
      }, intervalo);
    };

    void olhar();
    voltar();

    // ao voltar para a aba, pergunta na hora em vez de esperar o relógio
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void olhar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      vivo = false;
      clearTimeout(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [code, esperandoPagamento, router]);

  return null;
}
