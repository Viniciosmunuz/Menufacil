-- O numero e unico dentro do tipo, nao do restaurante.
--
-- Com o unico antigo, criar o "Balcao 1" num salao que ja tinha "Mesa 1"
-- dava conflito -- e o garcom fala "mesa 1" e "balcao 1" como dois lugares
-- diferentes, porque sao.
DROP INDEX "Mesa_restaurantId_numero_key";
CREATE UNIQUE INDEX "Mesa_restaurantId_tipo_numero_key" ON "Mesa"("restaurantId", "tipo", "numero");
