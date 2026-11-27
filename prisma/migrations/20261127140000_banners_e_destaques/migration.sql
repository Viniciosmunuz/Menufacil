-- A vitrine do cardápio: os banners da capa e a ordem dos destaques.

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "titulo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Banner_restaurantId_sortOrder_idx" ON "Banner"("restaurantId", "sortOrder");

ALTER TABLE "Banner"
    ADD CONSTRAINT "Banner_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- A ordem dos destaques, que é outra da ordem dentro da categoria.
--
-- Nasce com a ordem que o cardápio já mostrava: a dos produtos dentro de
-- cada categoria. Assim, no dia em que isto entra, a vitrine continua na
-- mesma ordem de ontem, e só muda quando alguém mexer.
ALTER TABLE "Product" ADD COLUMN "featuredOrder" INTEGER NOT NULL DEFAULT 0;
UPDATE "Product" SET "featuredOrder" = "sortOrder" WHERE "featured" = true;
