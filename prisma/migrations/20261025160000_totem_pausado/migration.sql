-- O dono pausa o totem pelo painel. Só acrescenta; nasce despausado.
ALTER TABLE "Restaurant" ADD COLUMN "totemPaused" BOOLEAN NOT NULL DEFAULT false;
