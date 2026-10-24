-- Cobrança no cartão pela API de Orders do Mercado Pago: guarda o id da
-- order ao lado do intentId do caminho antigo. Só acrescenta.
ALTER TABLE "TotemPayment" ADD COLUMN "mpOrderId" TEXT;

CREATE UNIQUE INDEX "TotemPayment_mpOrderId_key" ON "TotemPayment"("mpOrderId");
