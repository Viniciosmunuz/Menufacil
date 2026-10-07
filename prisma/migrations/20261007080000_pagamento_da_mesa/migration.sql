-- Pagamento da mesa: varios por comanda, cada um com sua forma.
--
-- Ate aqui o pedido do salao nascia com paymentMethod CASH fixo, porque a
-- forma so se sabe na hora de receber. O fechamento da noite lia dali e
-- dizia que tudo entrou em dinheiro. Com esta tabela a leitura passa a ser
-- do que foi realmente recebido.

CREATE TYPE "FormaNaMesa" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO', 'ANOTADO');

CREATE TABLE "PagamentoComanda" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "forma" "FormaNaMesa" NOT NULL,
    "centavos" INTEGER NOT NULL,
    "recebidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoComanda_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PagamentoComanda_comandaId_createdAt_idx" ON "PagamentoComanda"("comandaId", "createdAt");

ALTER TABLE "PagamentoComanda" ADD CONSTRAINT "PagamentoComanda_comandaId_fkey"
    FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PagamentoComanda" ADD CONSTRAINT "PagamentoComanda_recebidoPorId_fkey"
    FOREIGN KEY ("recebidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
