-- CreateEnum
CREATE TYPE "MessageLogStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CUSTOMER', 'BUSINESS', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'REMINDER');

-- CreateEnum
CREATE TYPE "BusinessRecipientRole" AS ENUM ('OWNER', 'WAREHOUSE_MANAGER', 'SUPPORT');

-- AlterEnum: Add new values to NotificationTrigger
ALTER TYPE "NotificationTrigger" ADD VALUE 'BOOKING_CREATED';
ALTER TYPE "NotificationTrigger" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "NotificationTrigger" ADD VALUE 'BOOKING_UPDATED';
ALTER TYPE "NotificationTrigger" ADD VALUE 'BOOKING_EXTENSION';
ALTER TYPE "NotificationTrigger" ADD VALUE 'PICKUP_REMINDER_24H';
ALTER TYPE "NotificationTrigger" ADD VALUE 'PICKUP_REMINDER_3H';
ALTER TYPE "NotificationTrigger" ADD VALUE 'RETURN_REMINDER_24H';
ALTER TYPE "NotificationTrigger" ADD VALUE 'RETURN_REMINDER_6H';
ALTER TYPE "NotificationTrigger" ADD VALUE 'LATE_RETURN_WARNING';
ALTER TYPE "NotificationTrigger" ADD VALUE 'PAYMENT_PENDING';
ALTER TYPE "NotificationTrigger" ADD VALUE 'DEPOSIT_RELEASED';
ALTER TYPE "NotificationTrigger" ADD VALUE 'REFUND_PROCESSED';
ALTER TYPE "NotificationTrigger" ADD VALUE 'WELCOME_CUSTOMER';
ALTER TYPE "NotificationTrigger" ADD VALUE 'OTP_LOGIN';
ALTER TYPE "NotificationTrigger" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "NotificationTrigger" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "NotificationTrigger" ADD VALUE 'NEW_DEVICE_LOGIN';
ALTER TYPE "NotificationTrigger" ADD VALUE 'ACCOUNT_CHANGES';
ALTER TYPE "NotificationTrigger" ADD VALUE 'ORDER_RECEIVED_BUSINESS';
ALTER TYPE "NotificationTrigger" ADD VALUE 'ORDER_RECEIVED_WAREHOUSE';
ALTER TYPE "NotificationTrigger" ADD VALUE 'LOW_INVENTORY_ALERT';
ALTER TYPE "NotificationTrigger" ADD VALUE 'MAINTENANCE_DUE';
ALTER TYPE "NotificationTrigger" ADD VALUE 'DAILY_SUMMARY';
ALTER TYPE "NotificationTrigger" ADD VALUE 'ABANDONED_CART';

-- CreateTable
CREATE TABLE "MessagingChannelConfig" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "businessPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateId" TEXT,
    "recipientUserId" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageLogStatus" NOT NULL DEFAULT 'QUEUED',
    "externalId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "NotificationTrigger" NOT NULL,
    "channels" JSONB NOT NULL,
    "templateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "sendWindow" JSONB,
    "recipientType" "RecipientType" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'TRANSACTIONAL',
    "isOptedIn" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRecipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "BusinessRecipientRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "whatsappNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "receiveTriggers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessagingChannelConfig_channel_key" ON "MessagingChannelConfig"("channel");

-- CreateIndex
CREATE INDEX "MessagingChannelConfig_channel_idx" ON "MessagingChannelConfig"("channel");

-- CreateIndex
CREATE INDEX "MessageLog_channel_idx" ON "MessageLog"("channel");

-- CreateIndex
CREATE INDEX "MessageLog_status_idx" ON "MessageLog"("status");

-- CreateIndex
CREATE INDEX "MessageLog_recipientUserId_idx" ON "MessageLog"("recipientUserId");

-- CreateIndex
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AutomationRule_trigger_idx" ON "AutomationRule"("trigger");

-- CreateIndex
CREATE INDEX "AutomationRule_isActive_idx" ON "AutomationRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_channel_category_key" ON "NotificationPreference"("userId", "channel", "category");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_channel_idx" ON "NotificationPreference"("channel");

-- CreateIndex
CREATE INDEX "BusinessRecipient_role_idx" ON "BusinessRecipient"("role");

-- CreateIndex
CREATE INDEX "BusinessRecipient_isActive_idx" ON "BusinessRecipient"("isActive");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
