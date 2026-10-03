"use client";

import { useEffect, useRef } from "react";

import { Conversa, type MensagemNaTela } from "@/components/chat/conversa";

import { lerConversa, responderNoChat } from "../actions";

// A conversa do pedido, no painel do restaurante.
//
// Abrir o pedido já marca como lidas as mensagens do cliente: quem chegou
// até aqui leu. É um efeito de montagem, e não uma gravação na hora de
// desenhar a tela, porque desenhar não deveria mudar nada no banco -- e
// porque a lista de pedidos passa por este mesmo pedido sem abri-lo.

export function ChatDoPedido({
  restaurantId,
  orderId,
  mensagens,
  naoLidas,
  fechada,
}: {
  restaurantId: string;
  orderId: string;
  mensagens: MensagemNaTela[];
  naoLidas: number;
  fechada: boolean;
}) {
  const jaMarcou = useRef(false);

  useEffect(() => {
    if (naoLidas === 0 || jaMarcou.current) return;
    jaMarcou.current = true;
    const dados = new FormData();
    dados.set("restaurantId", restaurantId);
    dados.set("orderId", orderId);
    void lerConversa(dados);
  }, [naoLidas, restaurantId, orderId]);

  return (
    <Conversa
      mensagens={mensagens}
      euSou="RESTAURANT"
      acao={responderNoChat}
      hidden={{ restaurantId, orderId }}
      vazio="O cliente ainda não escreveu nada. Se precisar avisar algo a ele, escreva aqui — aparece na tela do pedido dele na hora."
      fechada={fechada}
      fechadaTexto="Pedido encerrado. O que foi conversado fica guardado aqui."
    />
  );
}
