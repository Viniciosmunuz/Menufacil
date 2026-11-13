-- A Lia passou a conversa para uma pessoa: o painel precisa ver isso.
CREATE TABLE "IaChamado" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "nome" TEXT,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaChamado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IaChamado_restaurantId_createdAt_idx" ON "IaChamado"("restaurantId", "createdAt");

ALTER TABLE "IaChamado" ADD CONSTRAINT "IaChamado_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
