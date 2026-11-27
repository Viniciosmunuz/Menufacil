-- Os banners saem da capa e ganham uma seção própria, "Destaques", que o
-- dono liga e desliga. Quem já tinha banner continua com a seção ligada,
-- para nada sumir no dia em que isto entra.
ALTER TABLE "Restaurant" ADD COLUMN "destaquesLigados" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Restaurant" SET "destaquesLigados" = true
WHERE "id" IN (SELECT DISTINCT "restaurantId" FROM "Banner");

-- O tamanho do arquivo: a imagem não é mais cortada em 16:9 ao subir.
-- Os banners de antes ficam vazios, e vazio quer dizer 1600 x 900.
ALTER TABLE "Banner" ADD COLUMN "largura" INTEGER;
ALTER TABLE "Banner" ADD COLUMN "altura" INTEGER;

-- O enquadramento de antes foi escolhido para a faixa da capa, quatro
-- vezes mais larga que alta. Na seção nova a faixa é outra, e aquele
-- ajuste ali só cortaria errado: todo banner volta a preencher a faixa,
-- centralizado.
--
-- 100, e não 0 (a imagem inteira, que é como um banner novo nasce): a
-- migração roda antes de o código novo entrar no ar, e o código de antes
-- lê a escala como `scale()` -- com 0 o banner sumiria da capa nesse
-- intervalo. 100 é "sem zoom" para os dois.
UPDATE "Banner" SET "escala" = 100, "focoX" = 50, "focoY" = 50;
