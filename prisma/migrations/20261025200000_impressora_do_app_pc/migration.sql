-- O Menu Fácil PC entra na fila de impressão como um aparelho, igual ao
-- Print Fácil. A chave é o restaurante e o nome do computador, para a
-- mesma instalação nunca virar duas impressoras. Só acrescenta.
ALTER TABLE "PrintDevice" ADD COLUMN "appKey" TEXT;

CREATE UNIQUE INDEX "PrintDevice_appKey_key" ON "PrintDevice"("appKey");
