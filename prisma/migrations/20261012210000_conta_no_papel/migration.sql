-- A conta da mesa pedida no papel.
--
-- Aditiva: enquanto ninguém pedir a conta pela impressora, as duas colunas
-- ficam nulas e nada entra na fila do Print Fácil.

ALTER TABLE "Comanda" ADD COLUMN "contaPedidaAt" TIMESTAMP(3);
ALTER TABLE "Comanda" ADD COLUMN "contaPrintedAt" TIMESTAMP(3);
