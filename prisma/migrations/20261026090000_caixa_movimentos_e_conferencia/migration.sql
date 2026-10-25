-- Entradas e saídas do caixa, e a conferência do fechamento.
--
-- Sangria e suprimento não são venda nem pagamento de mesa: sem uma tabela
-- própria, o dinheiro da gaveta nunca fecha com o que o sistema diz. E o
-- fechamento passa a guardar o que foi contado e a diferença, porque
-- recalcular isso depois daria outro número.
--
-- Só acrescenta: nada existente muda de forma.
CREATE TYPE "MovimentoCaixaTipo" AS ENUM ('ENTRADA', 'SAIDA');

CREATE TABLE "MovimentoCaixa" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "caixaId" TEXT NOT NULL,
    "tipo" "MovimentoCaixaTipo" NOT NULL,
    "centavos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoCaixa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MovimentoCaixa_caixaId_createdAt_idx" ON "MovimentoCaixa"("caixaId", "createdAt");
CREATE INDEX "MovimentoCaixa_restaurantId_idx" ON "MovimentoCaixa"("restaurantId");

ALTER TABLE "MovimentoCaixa" ADD CONSTRAINT "MovimentoCaixa_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentoCaixa" ADD CONSTRAINT "MovimentoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "CaixaSalao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentoCaixa" ADD CONSTRAINT "MovimentoCaixa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- a conferência do fechamento: o que foi contado na gaveta e a diferença
ALTER TABLE "CaixaSalao" ADD COLUMN "fechamentoDinheiroCents" INTEGER;
ALTER TABLE "CaixaSalao" ADD COLUMN "fechamentoDiferencaCents" INTEGER;
ALTER TABLE "CaixaSalao" ADD COLUMN "fechamentoContagem" JSONB;
