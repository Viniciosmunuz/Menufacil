-- Salao: mesas, comandas e o canal de pedido.
--
-- Nasce desligado para todo mundo: nenhum restaurante muda de
-- comportamento ate o admin da plataforma liberar o recurso.
ALTER TABLE "Restaurant" ADD COLUMN "salaoEnabled" BOOLEAN NOT NULL DEFAULT false;

-- o pedido do garcom entra pelo mesmo caminho dos outros, so muda a origem
ALTER TYPE "OrderOrigin" ADD VALUE 'SALAO';

CREATE TYPE "MesaStatus" AS ENUM ('LIVRE', 'OCUPADA', 'FECHANDO', 'PAGANDO');

CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT,
    "lugares" INTEGER NOT NULL DEFAULT 4,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "garcomUserId" TEXT,
    "status" "MesaStatus" NOT NULL DEFAULT 'OCUPADA',
    "pessoas" INTEGER NOT NULL DEFAULT 1,
    "observacao" TEXT,
    "servicoCents" INTEGER NOT NULL DEFAULT 0,
    "descontoCents" INTEGER NOT NULL DEFAULT 0,
    "abertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- a comanda que agrupa os envios da mesa; vazio em todo pedido de delivery
ALTER TABLE "Order" ADD COLUMN "comandaId" TEXT;

CREATE UNIQUE INDEX "Mesa_restaurantId_numero_key" ON "Mesa"("restaurantId", "numero");
CREATE INDEX "Mesa_restaurantId_sortOrder_idx" ON "Mesa"("restaurantId", "sortOrder");
CREATE INDEX "Comanda_restaurantId_status_idx" ON "Comanda"("restaurantId", "status");
CREATE INDEX "Comanda_mesaId_abertaAt_idx" ON "Comanda"("mesaId", "abertaAt");
CREATE INDEX "Order_comandaId_idx" ON "Order"("comandaId");

ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_garcomUserId_fkey" FOREIGN KEY ("garcomUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
