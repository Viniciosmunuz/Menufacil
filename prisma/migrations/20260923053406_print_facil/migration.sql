-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "printedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrintDevice" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "pairingCode" TEXT,
    "printerName" TEXT,
    "pairedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintDevice_tokenHash_key" ON "PrintDevice"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PrintDevice_pairingCode_key" ON "PrintDevice"("pairingCode");

-- CreateIndex
CREATE INDEX "PrintDevice_restaurantId_idx" ON "PrintDevice"("restaurantId");

-- AddForeignKey
ALTER TABLE "PrintDevice" ADD CONSTRAINT "PrintDevice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
