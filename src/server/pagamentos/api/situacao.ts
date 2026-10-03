import { db } from "@/lib/db";

import { conferirPagamentoDoPedido } from "../pix";

// Como está o pedido, para a página do cliente.
//
// É o canal de tempo real do lado de fora, e é de propósito pequeno: a
// tela pergunta de poucos em poucos segundos e, quando a resposta muda,
// recarrega a si mesma pelo servidor. Quem desenha a tela continua sendo o
// servidor, com os dados do banco -- aqui não vai nada que a página já não
// mostre.
//
// O mesmo padrão do painel (ver OrdersLive): um sinal leve avisa que mudou,
// e a tela inteira se refaz. Sai mais barato e mais simples do que manter
// dois desenhos da mesma coisa, um no servidor e outro no navegador.
//
// Quem pode perguntar: quem tem o código do pedido, que é o que o link do
// cliente tem. Mesma regra do resto da página do pedido.

export async function situacaoDoPedido(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!code || code.length > 40) return Response.json({ erro: "pedido não informado" }, { status: 400 });

  // a consulta ao Mercado Pago acontece aqui dentro, e só enquanto o Pix
  // está pendente: é o atalho para o cliente ver "pago" mesmo quando o
  // restaurante ainda não cadastrou o webhook
  const situacao = await conferirPagamentoDoPedido(code);
  if (!situacao) return Response.json({ erro: "pedido não encontrado" }, { status: 404 });

  const conversa = await db.chatConversation.findFirst({
    where: { order: { code } },
    select: { lastMessageAt: true, customerUnread: true, _count: { select: { messages: true } } },
  });

  // Aqui não se marca nada como lido. A conversa fica atrás do botão Chat
  // da barra de baixo: ter a página aberta não quer dizer que a pessoa viu
  // a mensagem. Quem marca é a abertura da própria conversa.

  return Response.json(
    {
      status: situacao.status,
      pago: situacao.pago,
      pagamento: situacao.pagamento,
      venceu: situacao.venceu,
      chat: {
        mensagens: conversa?._count.messages ?? 0,
        naoLidas: conversa?.customerUnread ?? 0,
        ultimaEm: conversa?.lastMessageAt?.getTime() ?? 0,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
