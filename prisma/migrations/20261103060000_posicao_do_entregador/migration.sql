-- Onde o entregador está agora.
--
-- Tres colunas no proprio cadastro, e nao uma tabela de rastro: o cliente
-- quer saber onde a moto esta neste momento, e guardar por onde cada
-- entregador andou seria um dado que ninguem pediu, que cresce todo dia e
-- que teria de ser protegido depois. Cada aviso de posicao sobrescreve o
-- anterior.
--
-- Nascem vazias. Entregador que nunca mandou posicao fica sem mapa, e a
-- tela do cliente segue como era.
ALTER TABLE "Entregador" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Entregador" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Entregador" ADD COLUMN "posicaoEm" TIMESTAMP(3);
