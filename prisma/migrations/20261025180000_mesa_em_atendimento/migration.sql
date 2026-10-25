-- "Em atendimento": o garçom com a mesa aberta no celular. Só acrescenta.
ALTER TABLE "Mesa" ADD COLUMN "atendimentoAt" TIMESTAMP(3);
ALTER TABLE "Mesa" ADD COLUMN "atendimentoPor" TEXT;
