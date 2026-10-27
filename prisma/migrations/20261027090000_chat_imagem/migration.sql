-- Foto na conversa do pedido.
--
-- Quem paga por Pix fora do sistema manda o comprovante; quem recebeu o
-- pedido errado manda a foto do prato. Hoje os dois têm de sair da página
-- e ir para o WhatsApp -- justamente o que o 100% Delivery tirou do
-- caminho -- e aí a conversa do pedido fica pela metade.
--
-- Nula por padrão: mensagem pode ter só texto, só foto, ou os dois, e
-- nenhuma mensagem existente muda.
ALTER TABLE "ChatMessage" ADD COLUMN "imageUrl" TEXT;
