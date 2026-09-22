-- AlterTable
ALTER TABLE "ProductOptionGroup" ADD COLUMN     "halfFromOptionId" TEXT,
ADD COLUMN     "halfHalf" BOOLEAN NOT NULL DEFAULT false;
