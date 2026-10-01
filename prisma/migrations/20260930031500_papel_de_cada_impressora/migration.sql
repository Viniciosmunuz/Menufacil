-- CreateEnum
CREATE TYPE "PrintRole" AS ENUM ('COMANDA', 'SENHA');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "senhaPrintedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrintDevice" ADD COLUMN     "role" "PrintRole" NOT NULL DEFAULT 'COMANDA';
