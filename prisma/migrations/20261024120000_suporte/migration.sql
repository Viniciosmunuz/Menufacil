-- Pedidos de ajuda do dono do restaurante.
--
-- Aditiva: tabela nova, nada muda no que já existe.

CREATE TYPE "SupportStatus" AS ENUM ('ABERTO', 'RESOLVIDO');

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "abertoPor" TEXT NOT NULL,
  "assunto" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "status" "SupportStatus" NOT NULL DEFAULT 'ABERTO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicket_restaurantId_createdAt_idx" ON "SupportTicket"("restaurantId", "createdAt");

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
