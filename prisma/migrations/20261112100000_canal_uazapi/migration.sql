-- O terceiro caminho ate o WhatsApp: a uazapi.
--
-- Ao lado da Kapso (oficial, pela Meta) e da Z-API. Cada restaurante usa
-- um canal, e e sempre o mesmo dos dois lados -- quem recebe responde.
--
-- Diferente dos outros dois, a credencial fica aqui e nao no ambiente:
-- cada restaurante tem a sua instancia, com token proprio. E o que
-- permite varios restaurantes no mesmo servidor da uazapi sem um
-- responder pelo WhatsApp do outro.

ALTER TABLE "AtendenteIa" ADD COLUMN "uazapiBaseUrl" TEXT;
ALTER TABLE "AtendenteIa" ADD COLUMN "uazapiToken" TEXT;
ALTER TABLE "AtendenteIa" ADD COLUMN "uazapiInstancia" TEXT;

-- Unico porque e por ele que o webhook descobre de qual restaurante e a
-- mensagem: dois restaurantes com o mesmo token responderiam um pelo
-- outro. O indice tambem autentica, de quebra -- token que nao existe
-- nao acha ninguem.
CREATE UNIQUE INDEX "AtendenteIa_uazapiToken_key" ON "AtendenteIa"("uazapiToken");
