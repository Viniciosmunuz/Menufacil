-- "So retirada" temporario.
--
-- Guarda ATE QUANDO a entrega esta pausada, e nao um liga/desliga: o modo
-- nasce com hora para acabar (o fechamento daquela noite) e se apaga
-- sozinho. Um booleano ficaria ligado ate alguem lembrar, e ninguem olha
-- esse botao na manha seguinte.
--
-- Nulo, que e o padrao, quer dizer entrega normal: nada muda para quem ja
-- estava no ar.

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "pickupOnlyUntil" TIMESTAMP(3);
