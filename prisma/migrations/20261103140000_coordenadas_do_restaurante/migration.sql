-- Onde fica o restaurante.
--
-- Serve para o mapa do cliente abrir ja no lugar certo quando ele vai
-- marcar o pino da propria casa: sem isso o mapa nasceria no meio do
-- oceano, e a pessoa teria de arrastar o mundo inteiro ate a cidade dela.
--
-- Traduzido do endereco do restaurante uma vez, na primeira necessidade,
-- e guardado aqui. Nasce vazio; vazio quer dizer "ainda nao traduzi".
ALTER TABLE "Restaurant" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Restaurant" ADD COLUMN "longitude" DOUBLE PRECISION;
