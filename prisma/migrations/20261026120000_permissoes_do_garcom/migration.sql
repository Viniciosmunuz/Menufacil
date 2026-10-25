-- O que cada garçom pode fazer na mesa, chave por chave.
--
-- Vazio quer dizer "siga o nível", que é como o salão sempre funcionou:
-- nenhum vínculo existente muda de comportamento. Quem mexer nas chaves
-- passa a ter o conjunto gravado aqui, e é ele que o servidor confere.
--
-- Json e não uma coluna por chave: o conjunto ainda vai crescer, e uma
-- migration por chave seria custo sem retorno. A leitura passa toda por
-- src/lib/permissoes-salao.ts, que descarta o que não reconhece.
ALTER TABLE "RestaurantOwner" ADD COLUMN "permissoes" JSONB;
