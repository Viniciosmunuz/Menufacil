-- DropIndex
DROP INDEX "Order_restaurantId_number_key";

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "orderSeqDay" TEXT;

-- CreateIndex
CREATE INDEX "Order_restaurantId_number_idx" ON "Order"("restaurantId", "number");

-- A contagem de hoje continua de onde parou; a virada do dia é que zera.
-- createdAt é gravado em UTC, então vira para o fuso da plataforma antes
-- de comparar as datas.
UPDATE "Restaurant" r
SET "orderSeqDay" = to_char(now() AT TIME ZONE 'America/Manaus', 'YYYY-MM-DD'),
    "orderSeq" = COALESCE((
      SELECT MAX(o."number")
      FROM "Order" o
      WHERE o."restaurantId" = r.id
        AND (o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Manaus')::date
            = (now() AT TIME ZONE 'America/Manaus')::date
    ), 0);
