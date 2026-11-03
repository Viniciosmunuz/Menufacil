-- Entregadores: o cadastro de quem leva o pedido, e o vinculo dele com a entrega.
--
-- Nada muda para quem ja usa o sistema. A coluna do recurso nasce
-- desligada em todo restaurante, e pedido nenhum ganha entregador: os
-- campos novos em "Order" nascem nulos, e nulo quer dizer "como era
-- antes" -- quem marca Entregue continua sendo o balcao.
ALTER TABLE "Restaurant" ADD COLUMN "entregadorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Se ele esta pegando pedido agora. Quem muda e o proprio entregador, na
-- tela dele; nasce INDISPONIVEL para ninguem receber pedido antes de
-- abrir o aplicativo pela primeira vez.
CREATE TYPE "DisponibilidadeEntregador" AS ENUM ('DISPONIVEL', 'INDISPONIVEL', 'PAUSA');

-- O que deu errado na porta do cliente.
CREATE TYPE "MotivoDaOcorrencia" AS ENUM ('CLIENTE_NAO_ENCONTRADO', 'ENDERECO_INCORRETO', 'CLIENTE_NAO_ATENDE', 'PROBLEMA_COM_PEDIDO', 'OUTRO');

CREATE TABLE "Entregador" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "moto" TEXT,
    "placa" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "disponibilidade" "DisponibilidadeEntregador" NOT NULL DEFAULT 'INDISPONIVEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entregador_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Entregador_userId_key" ON "Entregador"("userId");

CREATE UNIQUE INDEX "Entregador_restaurantId_telefone_key" ON "Entregador"("restaurantId", "telefone");

CREATE INDEX "Entregador_restaurantId_ativo_idx" ON "Entregador"("restaurantId", "ativo");

CREATE TABLE "OcorrenciaEntrega" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "entregadorId" TEXT,
    "motivo" "MotivoDaOcorrencia" NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcorrenciaEntrega_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OcorrenciaEntrega_orderId_idx" ON "OcorrenciaEntrega"("orderId");

-- Quem esta levando, e desde quando. Nulo ate alguem assumir: e isso que
-- faz a fila de "aguardando entregador" no painel.
ALTER TABLE "Order" ADD COLUMN "entregadorId" TEXT;
ALTER TABLE "Order" ADD COLUMN "atribuidoEm" TIMESTAMP(3);

CREATE INDEX "Order_entregadorId_status_idx" ON "Order"("entregadorId", "status");

ALTER TABLE "Entregador" ADD CONSTRAINT "Entregador_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Entregador" ADD CONSTRAINT "Entregador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OcorrenciaEntrega" ADD CONSTRAINT "OcorrenciaEntrega_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- O cadastro do entregador e desativado, nunca apagado -- mas se um dia
-- sumir, a ocorrencia e a entrega ficam, so perdem o nome.
ALTER TABLE "OcorrenciaEntrega" ADD CONSTRAINT "OcorrenciaEntrega_entregadorId_fkey" FOREIGN KEY ("entregadorId") REFERENCES "Entregador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_entregadorId_fkey" FOREIGN KEY ("entregadorId") REFERENCES "Entregador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
