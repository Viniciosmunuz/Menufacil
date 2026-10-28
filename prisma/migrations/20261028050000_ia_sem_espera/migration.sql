-- Numeros de teste: o freio dos 30 minutos nao vale para eles. Nasce vazia.
ALTER TABLE "AtendenteIa" ADD COLUMN "semEspera" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
