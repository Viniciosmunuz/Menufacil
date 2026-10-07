-- O que cada garcom pode fazer na mesa.
--
-- Todo garcom lanca pedido e adiciona pagamento -- e disso que o trabalho
-- dele e feito. Apagar item de comanda ja enviada e finalizar a mesa sao
-- outra coisa: mexem no que a cozinha ja produziu e no que entra no caixa.
-- Por isso nascem desligados, e o dono liga um por um, para o garcom de
-- confianca que fecha mesa sozinho.
ALTER TABLE "RestaurantOwner" ADD COLUMN "podeExcluirItem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RestaurantOwner" ADD COLUMN "podeFinalizarMesa" BOOLEAN NOT NULL DEFAULT false;
