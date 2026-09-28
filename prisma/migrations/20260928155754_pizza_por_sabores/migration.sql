-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "pizzaFlavors" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "pizzaFlavors" INTEGER;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "pizzaMaxFlavors" INTEGER NOT NULL DEFAULT 0;
