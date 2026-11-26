-- Os numeros que a IA nao responde viram linhas com nome e chave de aviso.
--
-- A coluna antiga continua existindo, vazia: apagar coluna em producao nao
-- se desfaz, e a copia abaixo ja move tudo o que havia nela.

CREATE TABLE "IaContatoIgnorado" (
    "id" TEXT NOT NULL,
    "atendenteIaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nome" TEXT,
    "avisar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IaContatoIgnorado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IaContatoIgnorado_atendenteIaId_numero_key"
    ON "IaContatoIgnorado"("atendenteIaId", "numero");

ALTER TABLE "IaContatoIgnorado" ADD CONSTRAINT "IaContatoIgnorado_atendenteIaId_fkey"
    FOREIGN KEY ("atendenteIaId") REFERENCES "AtendenteIa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- O que ja estava cadastrado continua valendo, com o mesmo numero e sem
-- nome. O id sai de gen_random_uuid() porque cuid() e coisa do Prisma, e
-- aqui quem insere e o Postgres.
INSERT INTO "IaContatoIgnorado" ("id", "atendenteIaId", "numero")
SELECT gen_random_uuid()::text, a."id", n
FROM "AtendenteIa" a, unnest(a."ignorados") AS n
WHERE n <> ''
ON CONFLICT DO NOTHING;
