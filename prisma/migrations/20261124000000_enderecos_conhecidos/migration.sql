-- Lugares que a cidade conhece pelo nome, com o endereço pronto.
--
-- "Entrega aqui no Moura" e "entregar no Rocha" são endereços completos
-- para quem mora ali, e não são bairro nem rua. Em 24/11/2026 a Lia
-- respondeu "Rocha não está na nossa lista de bairros atendidos" a um
-- cliente que a moto atende toda semana.
--
-- As notas em texto livre já ajudavam a ENTENDER o lugar, mas não
-- bastavam para FECHAR o pedido: faltavam rua, número, bairro e
-- referência. Aqui o endereço vem pronto, e dizer o nome basta.
CREATE TABLE "EnderecoConhecido" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelidos" TEXT[],
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL DEFAULT 's/n',
    "bairro" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "complemento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnderecoConhecido_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnderecoConhecido_restaurantId_idx" ON "EnderecoConhecido"("restaurantId");

-- um nome por restaurante: dois "Moura" na lista fariam a IA escolher no palpite
CREATE UNIQUE INDEX "EnderecoConhecido_restaurantId_nome_key" ON "EnderecoConhecido"("restaurantId", "nome");

ALTER TABLE "EnderecoConhecido" ADD CONSTRAINT "EnderecoConhecido_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
