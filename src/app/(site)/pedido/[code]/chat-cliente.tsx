"use client";

import { MessagesSquare, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Conversa, type MensagemNaTela } from "@/components/chat/conversa";
import {
  abrirChat,
  esquecerChat,
  fecharChat,
  registrarChat,
  useChat,
} from "@/components/site/chat-store";

import { enviarMensagem, lerConversaDoPedido } from "./actions";

// A conversa do cliente com o restaurante, no 100% Delivery.
//
// Ela já morou no meio da página do pedido, entre o andamento e o resumo, e
// não funcionava: quem queria falar tinha de rolar até achar, e quem não
// queria falar tinha uma caixa de mensagens no caminho do que foi ver.
//
// Agora é um botão fixo na barra de baixo -- do lado de Cardápio e Pedidos,
// onde o polegar já está -- que abre a conversa como uma folha por cima da
// tela. Mesma folha da revisão do pedido, no checkout.
//
// Quem desenha as mensagens continua sendo o servidor: a folha mostra o que
// veio pronto, e o canal ao vivo da página traz as novas.

export function ChatDoCliente({
  code,
  restaurante,
  numero,
  mensagens,
  naoLidas,
  fechada,
}: {
  code: string;
  restaurante: string;
  numero: number;
  mensagens: MensagemNaTela[];
  naoLidas: number;
  fechada: boolean;
}) {
  const chat = useChat();
  const folha = useRef<HTMLDialogElement>(null);

  // avisa a barra de baixo que esta tela tem conversa
  useEffect(() => {
    registrarChat(naoLidas);
    return esquecerChat;
  }, [naoLidas]);

  // Abre e fecha a folha conforme o botão da barra.
  //
  // De propósito sem lista de dependências: isto roda depois de todo
  // desenho. A resposta do restaurante chega pelo canal ao vivo, que manda
  // a página inteira se refazer pelo servidor -- e aí o navegador fecha a
  // folha, porque <dialog> aberto é estado do elemento, não do React.
  // Rodando sempre, a folha volta no mesmo instante e quem está escrevendo
  // nem percebe.
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    if (chat.aberto && !el.open) el.showModal();
    if (!chat.aberto && el.open) el.close();
  });

  // Abriu a conversa: agora sim o que o restaurante escreveu está lido.
  // Ter a página aberta não contava -- a conversa fica atrás de um botão.
  // Vale também para a mensagem que chega com a folha já aberta.
  useEffect(() => {
    if (!chat.aberto || naoLidas === 0) return;
    void lerConversaDoPedido(code);
  }, [chat.aberto, naoLidas, code]);

  return (
    <>
      {/* A barra de baixo só existe no celular. No computador, o botão é
          este, flutuando no canto -- senão quem abre o pedido na tela
          grande fica sem jeito nenhum de falar com o restaurante. */}
      <button
        type="button"
        onClick={abrirChat}
        aria-expanded={chat.aberto}
        className="fixed right-6 bottom-6 z-40 hidden h-14 items-center gap-2.5 rounded-full bg-brand px-5 font-extrabold text-brand-ink shadow-lg hover:brightness-110 lg:flex"
      >
        <span className="relative">
          <MessagesSquare className="size-6" aria-hidden="true" />
          {naoLidas > 0 && (
            <span className="absolute -top-2 -right-3 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] font-extrabold text-ink tabular-nums">
              {naoLidas}
            </span>
          )}
        </span>
        Falar com {restaurante}
      </button>

      <dialog
        ref={folha}
        // "cancel" é só o Esc. "close" dispara em qualquer fechamento,
        // inclusive no que o navegador faz quando a página se refaz -- e aí
        // a folha se fecharia sozinha no meio da conversa
        onCancel={fecharChat}
        onClick={(e) => e.target === folha.current && fecharChat()}
        className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-[sheet-up_0.28s_ease-out] sm:my-auto sm:rounded-card"
        aria-label={`Conversa com ${restaurante}`}
      >
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold">{restaurante}</h2>
              <p className="text-sm text-muted">Pedido #{numero}</p>
            </div>
            <button
              type="button"
              onClick={fecharChat}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-surface-3"
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Conversa
              mensagens={mensagens}
              euSou="CUSTOMER"
              acao={enviarMensagem}
              hidden={{ code }}
              vazio="Precisa avisar algo? Escreva aqui — a mensagem vai direto para o balcão, junto com este pedido."
              fechada={fechada}
              fechadaTexto="Este pedido já foi encerrado. O que foi conversado fica guardado aqui."
              className="[&>div:first-child]:max-h-[55dvh]"
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
