-- Numeros que a IA nunca responde. Nasce vazia: ninguem muda de comportamento.
ALTER TABLE "AtendenteIa" ADD COLUMN "ignorados" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
