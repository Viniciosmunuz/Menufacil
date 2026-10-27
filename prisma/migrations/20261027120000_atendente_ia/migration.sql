-- Menu Fácil IA: o atendente no WhatsApp do restaurante.
--
-- Só tabelas novas. Nenhuma coluna de restaurante, pedido, pagamento ou
-- cardápio é criada ou alterada -- a IA lê o cardápio e escreve apenas
-- aqui. O atendente nasce desligado em todo restaurante.
--
-- De propósito, esta migração não leva nada além disto: o diff automático
-- do Prisma também trazia uma reescrita do enum MesaStatus (diferença
-- antiga do banco local), que mexeria no salão sem relação com a IA.

-- CreateEnum
CREATE TYPE "IaPapel" AS ENUM ('CLIENTE', 'IA', 'HUMANO');

-- CreateTable
CREATE TABLE "AtendenteIa" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "kapsoCustomerId" TEXT,
    "linkDeConexao" TEXT,
    "phoneNumberId" TEXT,
    "numeroExibido" TEXT,
    "kapsoWebhookId" TEXT,
    "segredoWebhook" TEXT,
    "conectadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtendenteIa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IaMensagem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "papel" "IaPapel" NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IaEventoProcessado" (
    "chave" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaEventoProcessado_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtendenteIa_restaurantId_key" ON "AtendenteIa"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "AtendenteIa_phoneNumberId_key" ON "AtendenteIa"("phoneNumberId");

-- CreateIndex
CREATE INDEX "IaMensagem_restaurantId_contato_createdAt_idx" ON "IaMensagem"("restaurantId", "contato", "createdAt");

-- AddForeignKey
ALTER TABLE "AtendenteIa" ADD CONSTRAINT "AtendenteIa_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaMensagem" ADD CONSTRAINT "IaMensagem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
