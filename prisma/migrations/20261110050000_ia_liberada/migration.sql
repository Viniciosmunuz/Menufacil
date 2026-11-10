-- A chave da IA passa a viver junto das outras do admin.
--
-- Nasce desligada para todo mundo, menos para quem ja tem a IA ligada ou o
-- WhatsApp conectado: esses ja estao usando, e uma coluna nova nao pode
-- desligar o que esta no ar.
ALTER TABLE "Restaurant" ADD COLUMN "iaEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Restaurant" SET "iaEnabled" = true
WHERE "id" IN (
  SELECT "restaurantId" FROM "AtendenteIa"
  WHERE "ativo" = true OR "noChat" = true
     OR "phoneNumberId" IS NOT NULL OR "zapiChannelId" IS NOT NULL
);
