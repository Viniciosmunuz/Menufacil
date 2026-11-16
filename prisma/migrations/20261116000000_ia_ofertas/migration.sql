-- A chave "Oferecer no pedido": a IA pode sugerir uma coisa antes de
-- fechar o pedido (acompanhamento, pedido mínimo, bebida ou sobremesa).
-- Nasce desligada: quem decide se o restaurante oferece é o dono dele.
ALTER TABLE "AtendenteIa" ADD COLUMN "ofertas" BOOLEAN NOT NULL DEFAULT false;
