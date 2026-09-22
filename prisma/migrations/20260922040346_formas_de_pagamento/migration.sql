-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CREDIT', 'DEBIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cardType" "CardType",
ADD COLUMN     "changeForCents" INTEGER;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "acceptsCard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "acceptsCash" BOOLEAN NOT NULL DEFAULT true;
