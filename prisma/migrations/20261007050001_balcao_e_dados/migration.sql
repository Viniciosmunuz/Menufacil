-- as comandas nos estados antigos voltam para o caminho novo
UPDATE "Comanda" SET "status" = 'OCUPADA' WHERE "status" = 'FECHANDO';
UPDATE "Comanda" SET "status" = 'PAGO' WHERE "status" = 'PAGANDO';

-- Balcao e mesa sao o mesmo lugar de atendimento com nomes diferentes.
--
-- Quem senta no balcao abre comanda, pede, paga e sai igual a quem senta na
-- mesa. Criar uma segunda tabela para isso duplicaria comanda, pedido e
-- fechamento inteiros; um tipo na propria mesa resolve, e o mapa agrupa
-- cada um na sua faixa.
CREATE TYPE "LugarTipo" AS ENUM ('MESA', 'BALCAO');
ALTER TABLE "Mesa" ADD COLUMN "tipo" "LugarTipo" NOT NULL DEFAULT 'MESA';
