-- Senhas erradas na tela de entrar, para frear quem tenta adivinhar.
CREATE TABLE "TentativaDeLogin" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaDeLogin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TentativaDeLogin_login_createdAt_idx" ON "TentativaDeLogin"("login", "createdAt");
CREATE INDEX "TentativaDeLogin_createdAt_idx" ON "TentativaDeLogin"("createdAt");
