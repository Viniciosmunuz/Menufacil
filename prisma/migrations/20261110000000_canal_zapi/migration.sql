-- O canal da Z-API, por restaurante.
--
-- A Kapso continua no codigo, mas nao serve mais: a conta de negocio esta
-- proibida pela Meta de mandar mensagem para numeros brasileiros (130497).
-- A Z-API conecta o numero por QR code, sem passar pela Meta.
--
-- E `unique` pela mesma razao do `phoneNumberId`: e por ele que o webhook
-- descobre de qual restaurante e a mensagem que chegou.
ALTER TABLE "AtendenteIa" ADD COLUMN "zapiChannelId" TEXT;
CREATE UNIQUE INDEX "AtendenteIa_zapiChannelId_key" ON "AtendenteIa"("zapiChannelId");
