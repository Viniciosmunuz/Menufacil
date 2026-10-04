-- Acompanhamento dentro do prato.
--
-- Duas chaves, as duas nascendo desligadas: nada muda para quem nao marcar.
--
-- "addons" na categoria diz qual secao do cardapio serve de acompanhamento
-- (no Papaleguas, "Acompanhamentos": arroz, farofa, pure). Os produtos dela
-- continuam a venda sozinhos, como sempre.
--
-- "allowAddons" no produto diz quais pratos oferecem esses acompanhamentos
-- na ficha, para o cliente marcar quantos quiser de cada.

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "addons" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowAddons" BOOLEAN NOT NULL DEFAULT false;
