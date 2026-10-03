-- 100% Delivery: pedido fechado e pago dentro do MenuFacil.
--
-- Tudo aqui e acrescimo. Nenhuma coluna existente muda de tipo, nenhuma
-- some, e todo valor novo tem padrao igual ao comportamento de hoje:
-- restaurante nasce em WHATSAPP e pagamento nasce MANUAL.

-- CreateEnum
CREATE TYPE "OrderFlowMode" AS ENUM ('WHATSAPP', 'FULL_DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "ChatAuthor" AS ENUM ('CUSTOMER', 'RESTAURANT');

-- AlterEnum
ALTER TYPE "OrderOrigin" ADD VALUE 'FULL_DELIVERY';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "deliveryMode" "OrderFlowMode" NOT NULL DEFAULT 'WHATSAPP';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpReference" TEXT,
ADD COLUMN     "pixQrCode" TEXT,
ADD COLUMN     "pixQrBase64" TEXT,
ADD COLUMN     "pixExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lastEvent" JSONB;

-- CreateTable
CREATE TABLE "MercadoPagoAccount" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "mpUserId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "publicKey" TEXT,
    "tokenHint" TEXT,
    "scope" TEXT,
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "lastCheckAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadoPagoAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MpWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "restaurantId" TEXT,
    "mpPaymentId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MpWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "customerUnread" INTEGER NOT NULL DEFAULT 0,
    "restaurantUnread" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "author" "ChatAuthor" NOT NULL,
    "authorUserId" TEXT,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "Payment"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpReference_key" ON "Payment"("mpReference");

-- CreateIndex
CREATE INDEX "Payment_mpReference_idx" ON "Payment"("mpReference");

-- CreateIndex
CREATE UNIQUE INDEX "MercadoPagoAccount_restaurantId_key" ON "MercadoPagoAccount"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "MpWebhookEvent_eventKey_key" ON "MpWebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "MpWebhookEvent_createdAt_idx" ON "MpWebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MpWebhookEvent_mpPaymentId_idx" ON "MpWebhookEvent"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_orderId_key" ON "ChatConversation"("orderId");

-- CreateIndex
CREATE INDEX "ChatConversation_restaurantId_lastMessageAt_idx" ON "ChatConversation"("restaurantId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MercadoPagoAccount" ADD CONSTRAINT "MercadoPagoAccount_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
