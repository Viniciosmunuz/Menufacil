-- Em qual impressora sai o que foi pedido de cada seção do cardápio.
--
-- Aditiva e inerte: enquanto nenhuma seção tiver impressora escolhida, a
-- coluna fica nula e a impressão continua exatamente como está hoje -- o
-- pedido inteiro, na impressora do balcão, com a trava do printedAt.

ALTER TABLE "MenuCategory" ADD COLUMN "printDeviceId" TEXT;

CREATE INDEX "MenuCategory_printDeviceId_idx" ON "MenuCategory"("printDeviceId");

ALTER TABLE "MenuCategory"
  ADD CONSTRAINT "MenuCategory_printDeviceId_fkey"
  FOREIGN KEY ("printDeviceId") REFERENCES "PrintDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A via que já saiu em cada impressora. Só ganha linha no modo dividido:
-- ali o printedAt do pedido não serve de trava, porque ele é um só e a
-- primeira impressora a marcar tiraria o pedido da fila da outra.
CREATE TABLE "OrderPrint" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "printedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderPrint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPrint_orderId_deviceId_key" ON "OrderPrint"("orderId", "deviceId");
CREATE INDEX "OrderPrint_deviceId_idx" ON "OrderPrint"("deviceId");

ALTER TABLE "OrderPrint"
  ADD CONSTRAINT "OrderPrint_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderPrint"
  ADD CONSTRAINT "OrderPrint_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "PrintDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
