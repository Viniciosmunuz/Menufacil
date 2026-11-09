-- A IA no chat do cardapio.
--
-- Ate aqui a IA so existia no WhatsApp, e a chave `ativo` so podia ser
-- ligada depois que o numero conectava na Meta. Como a Meta recusa o
-- envio para numeros brasileiros nesta conta (erro 130497), isso deixava
-- a IA inteira refem de um bloqueio de fora.
--
-- `noChat` e uma chave propria: liga a IA no link que o cliente ja abre,
-- sem depender de WhatsApp nenhum. Nasce desligada, como a outra.
ALTER TABLE "AtendenteIa" ADD COLUMN "noChat" BOOLEAN NOT NULL DEFAULT false;
