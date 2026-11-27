-- O enquadramento do banner, escolhido pelo dono depois de subir a arte.
--
-- Os padrões são o que o código já fazia antes: imagem inteira,
-- centralizada. Então os banners que já existem não mudam de aparência
-- no dia em que isto entra.
ALTER TABLE "Banner" ADD COLUMN "escala" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Banner" ADD COLUMN "focoX" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Banner" ADD COLUMN "focoY" INTEGER NOT NULL DEFAULT 50;
