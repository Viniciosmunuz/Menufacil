-- Seção que só existe no salão.
--
-- A taxa de embalagem, a comissão do couvert, o "para viagem" que o garçom
-- lança na comanda: são produtos de verdade, com preço, que o cliente do
-- link não pode ver nem pedir. Marcando a seção, tudo que estiver dentro
-- dela some do cardápio público e do totem, e continua no salão.
--
-- Nasce desligado, então nenhuma seção existente muda de comportamento.
ALTER TABLE "MenuCategory" ADD COLUMN "somenteSalao" BOOLEAN NOT NULL DEFAULT false;
