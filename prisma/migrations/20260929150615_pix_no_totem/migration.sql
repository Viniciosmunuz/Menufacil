-- CreateEnum
CREATE TYPE "TotemPaymentMethod" AS ENUM ('CARD', 'PIX');

-- AlterTable
ALTER TABLE "TotemPayment" ADD COLUMN     "method" "TotemPaymentMethod" NOT NULL DEFAULT 'CARD',
ALTER COLUMN "intentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TotemPayment_mpPaymentId_idx" ON "TotemPayment"("mpPaymentId");
