-- AlterTable
ALTER TABLE "TotemPayment" ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE INDEX "TotemPayment_reference_idx" ON "TotemPayment"("reference");
