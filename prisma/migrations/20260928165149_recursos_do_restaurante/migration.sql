-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fullDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printEnabled" BOOLEAN NOT NULL DEFAULT true;
