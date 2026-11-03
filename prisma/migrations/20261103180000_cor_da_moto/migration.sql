-- A cor da moto.
--
-- E o que o cliente reconhece da janela: "a laranja" chega antes de
-- qualquer placa. Opcional, como o modelo e a placa -- o entregador que
-- nao tiver nada disso cadastrado continua funcionando igual.
ALTER TABLE "Entregador" ADD COLUMN "corDaMoto" TEXT;
