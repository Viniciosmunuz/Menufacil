-- Area de entrega: os bairros que o restaurante atende, com a taxa de cada um.
--
-- Nasce vazia para todo mundo, e lista vazia quer dizer "como era antes":
-- bairro digitado pelo cliente e taxa unica do restaurante. Nenhum
-- restaurante muda de comportamento com esta migracao.
CREATE TABLE "DeliveryArea" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryArea_restaurantId_name_key" ON "DeliveryArea"("restaurantId", "name");

CREATE INDEX "DeliveryArea_restaurantId_active_idx" ON "DeliveryArea"("restaurantId", "active");

ALTER TABLE "DeliveryArea" ADD CONSTRAINT "DeliveryArea_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
