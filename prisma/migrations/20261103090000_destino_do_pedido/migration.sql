-- O endereco de entrega em coordenadas, para o mapa.
--
-- O pedido guarda o endereco como texto, do jeito que o cliente digitou.
-- Mapa precisa de numero. A conversao e feita uma vez, quando alguem abre
-- o mapa daquele pedido, e o resultado fica aqui: o servico de busca e de
-- graca mas tem limite de uso, e o endereco nao muda depois que o pedido
-- sai.
--
-- Nascem vazias, e vazio quer dizer "ainda nao tentei" ou "nao achei" --
-- nos dois casos o mapa mostra so a moto, sem o alfinete do destino.
ALTER TABLE "Order" ADD COLUMN "destinoLat" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "destinoLng" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "destinoEm" TIMESTAMP(3);
