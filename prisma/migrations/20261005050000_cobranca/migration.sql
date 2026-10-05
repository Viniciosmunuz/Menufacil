-- Cobranca das mensalidades.
--
-- O admin nao sabia nada sobre dinheiro: quem esta em qual plano, quem
-- pagou, quem venceu. Com um restaurante isso cabe na cabeca; com cinco,
-- nao.
--
-- "plan" e "billingDay" nascem nulos: nada muda para quem ja esta no ar, e
-- restaurante sem plano definido simplesmente nao entra na cobranca.
--
-- RestaurantPayment guarda um registro por mes pago, e nao um saldo. Saldo
-- nao conta historia -- quando a pergunta e "paguei setembro?", a resposta
-- tem que ser uma linha com data. O valor fica gravado junto, para que
-- mudar o preco amanha nao reescreva o que foi pago ontem.

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('ESSENCIAL', 'FULL_DELIVERY');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "plan" "Plan",
ADD COLUMN     "billingDay" INTEGER;

-- CreateTable
CREATE TABLE "RestaurantPayment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantPayment_restaurantId_paidAt_idx" ON "RestaurantPayment"("restaurantId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantPayment_restaurantId_competencia_key" ON "RestaurantPayment"("restaurantId", "competencia");

-- AddForeignKey
ALTER TABLE "RestaurantPayment" ADD CONSTRAINT "RestaurantPayment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
