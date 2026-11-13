-- Outros nomes do mesmo lugar, que valem a mesma taxa.
ALTER TABLE "DeliveryArea" ADD COLUMN "apelidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
