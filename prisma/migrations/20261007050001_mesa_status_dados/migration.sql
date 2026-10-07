-- as comandas que estavam nos estados antigos voltam para o caminho novo
UPDATE "Comanda" SET "status" = 'OCUPADA' WHERE "status" = 'FECHANDO';
UPDATE "Comanda" SET "status" = 'PAGO' WHERE "status" = 'PAGANDO';
