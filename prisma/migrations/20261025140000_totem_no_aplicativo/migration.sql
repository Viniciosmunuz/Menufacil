-- O aplicativo Menu Fácil Totem: o totem aberto pela impressora do
-- tablet. Só acrescenta; some junto quando a impressora é desligada.
ALTER TABLE "TotemDevice" ADD COLUMN "printDeviceId" TEXT;

CREATE UNIQUE INDEX "TotemDevice_printDeviceId_key" ON "TotemDevice"("printDeviceId");

ALTER TABLE "TotemDevice" ADD CONSTRAINT "TotemDevice_printDeviceId_fkey" FOREIGN KEY ("printDeviceId") REFERENCES "PrintDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
