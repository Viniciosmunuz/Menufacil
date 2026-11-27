-- A conversa que alguém do restaurante já assumiu.
--
-- Uma linha por conversa, atualizada no lugar: o que importa é "alguém
-- está cuidando desta", não o histórico de quem olhou quando.
CREATE TABLE "IaConversaAtendida" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "quem" TEXT,
    "atendidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaConversaAtendida_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IaConversaAtendida_restaurantId_contato_key"
    ON "IaConversaAtendida"("restaurantId", "contato");

CREATE INDEX "IaConversaAtendida_restaurantId_atendidaEm_idx"
    ON "IaConversaAtendida"("restaurantId", "atendidaEm");

ALTER TABLE "IaConversaAtendida"
    ADD CONSTRAINT "IaConversaAtendida_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
