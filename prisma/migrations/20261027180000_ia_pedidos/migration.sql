-- AlterTable
ALTER TABLE "Order" ADD COLUMN "feitoPelaIa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AtendenteIa" ADD COLUMN "fazPedidos" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "IaRascunho" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "resumo" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaRascunho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IaRascunho_restaurantId_contato_key" ON "IaRascunho"("restaurantId", "contato");

-- AddForeignKey
ALTER TABLE "IaRascunho" ADD CONSTRAINT "IaRascunho_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
