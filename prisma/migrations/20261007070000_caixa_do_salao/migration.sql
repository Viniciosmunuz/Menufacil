-- O turno do salao: aberto por alguem, fechado por alguem.
--
-- Enquanto nao ha caixa aberto, o salao nao opera: o garcom entra e ve que
-- esta fechado, em vez de lancar pedido num turno que ninguem conferiu. O
-- valor de abertura e o dinheiro que ja esta na gaveta -- sem ele, o
-- fechamento no fim da noite nao fecha com o que foi recebido.
CREATE TABLE "CaixaSalao" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "abertoPorId" TEXT,
    "aberturaCents" INTEGER NOT NULL DEFAULT 0,
    "abertoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoPorId" TEXT,
    "fechamentoCents" INTEGER,
    "fechadoAt" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaixaSalao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaixaSalao_restaurantId_abertoAt_idx" ON "CaixaSalao"("restaurantId", "abertoAt");
-- um caixa aberto por restaurante de cada vez; o indice parcial garante
CREATE UNIQUE INDEX "CaixaSalao_um_aberto_por_restaurante" ON "CaixaSalao"("restaurantId") WHERE "fechadoAt" IS NULL;

ALTER TABLE "CaixaSalao" ADD CONSTRAINT "CaixaSalao_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaixaSalao" ADD CONSTRAINT "CaixaSalao_abertoPorId_fkey" FOREIGN KEY ("abertoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaixaSalao" ADD CONSTRAINT "CaixaSalao_fechadoPorId_fkey" FOREIGN KEY ("fechadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
