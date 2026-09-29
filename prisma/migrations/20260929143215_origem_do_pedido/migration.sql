-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('WHATSAPP', 'TOTEM');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "origin" "OrderOrigin" NOT NULL DEFAULT 'WHATSAPP';
