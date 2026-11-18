-- "O que ela precisa saber": o que o cardápio e a lista de bairros não
-- contam -- o apelido que a cidade dá a um lugar ("entrega aqui no
-- Moura"), o cliente antigo que todo mundo conhece, o combinado da casa.
-- Texto livre, escrito pelo dono, que entra no contexto da IA junto do
-- bloco do restaurante. Não vale como permissão de entrega: a lista de
-- bairros continua mandando.
ALTER TABLE "AtendenteIa" ADD COLUMN "notas" TEXT;
