-- Até onde vai a mão do garçom na mesa.
--
-- Aditiva: a coluna nasce com GARCOM, e quem já podia finalizar a mesa
-- vira GARCOM_II -- era essa permissão que separava quem só lança pedido
-- de quem mexe no que já aconteceu.

CREATE TYPE "NivelGarcom" AS ENUM ('GARCOM', 'GARCOM_II');

ALTER TABLE "RestaurantOwner" ADD COLUMN "nivel" "NivelGarcom" NOT NULL DEFAULT 'GARCOM';

UPDATE "RestaurantOwner" SET "nivel" = 'GARCOM_II' WHERE "podeFinalizarMesa" = true;
