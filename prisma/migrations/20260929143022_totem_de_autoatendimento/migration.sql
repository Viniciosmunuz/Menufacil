-- CreateEnum
CREATE TYPE "TotemPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "totemEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TotemConfig" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "mpAccessToken" TEXT,
    "mpTokenHint" TEXT,
    "mpDeviceId" TEXT,
    "mpWebhookKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TotemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TotemDevice" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "pairingCode" TEXT,
    "printerName" TEXT,
    "appVersion" TEXT,
    "pairedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TotemDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TotemPayment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "deviceId" TEXT,
    "intentId" TEXT NOT NULL,
    "mpPaymentId" TEXT,
    "status" "TotemPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "cart" JSONB,
    "lastEvent" JSONB,
    "paidAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TotemPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TotemConfig_restaurantId_key" ON "TotemConfig"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "TotemDevice_tokenHash_key" ON "TotemDevice"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "TotemDevice_pairingCode_key" ON "TotemDevice"("pairingCode");

-- CreateIndex
CREATE INDEX "TotemDevice_restaurantId_idx" ON "TotemDevice"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "TotemPayment_intentId_key" ON "TotemPayment"("intentId");

-- CreateIndex
CREATE INDEX "TotemPayment_restaurantId_createdAt_idx" ON "TotemPayment"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "TotemPayment_status_idx" ON "TotemPayment"("status");

-- AddForeignKey
ALTER TABLE "TotemConfig" ADD CONSTRAINT "TotemConfig_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotemDevice" ADD CONSTRAINT "TotemDevice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotemPayment" ADD CONSTRAINT "TotemPayment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotemPayment" ADD CONSTRAINT "TotemPayment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TotemDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
