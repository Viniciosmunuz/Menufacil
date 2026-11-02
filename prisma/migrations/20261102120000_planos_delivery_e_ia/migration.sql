-- Dois planos comerciais: Menu Facil Delivery e Menu Facil IA.
--
-- O "100% Delivery" antigo nunca foi um plano de verdade: era um recurso,
-- ligado pela chave fullDeliveryEnabled, que continua valendo depois desta
-- migracao. Por isso os dois planos antigos viram Delivery -- ninguem perde
-- recurso, so muda o valor da mensalidade. Quem contratar a IA entra no
-- plano IA, que ainda nao tem ninguem.
--
-- Tipo novo em vez de ALTER TYPE: trocar o conjunto inteiro de valores de
-- uma vez deixa o enum limpo, sem o FULL_DELIVERY orfao que o banco nao
-- deixaria apagar depois.
CREATE TYPE "Plan_new" AS ENUM ('DELIVERY', 'IA');

ALTER TABLE "Restaurant"
  ALTER COLUMN "plan" TYPE "Plan_new"
  USING (CASE WHEN "plan" IS NULL THEN NULL ELSE 'DELIVERY' END::"Plan_new");

DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";
