-- Migration: Add missing tables (Session, ClientPortalAccount, ClientUpdate, StaffInvite)
-- and missing columns (resetPasswordToken, resetPasswordExpires) on User

-- Add missing columns to User table (safe to run if already exists via prisma db push)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3) NULL;

-- AddForeignKey index on Client for portal
CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_email_key" ON "Client"("tenantId", "email");

-- CreateTable ClientPortalAccount
CREATE TABLE IF NOT EXISTS "ClientPortalAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientPortalAccount_clientId_key" ON "ClientPortalAccount"("clientId");

ALTER TABLE "ClientPortalAccount"
    DROP CONSTRAINT IF EXISTS "ClientPortalAccount_clientId_fkey";

ALTER TABLE "ClientPortalAccount"
    ADD CONSTRAINT "ClientPortalAccount_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ClientUpdate
CREATE TABLE IF NOT EXISTS "ClientUpdate" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'client',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientUpdate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientUpdate"
    DROP CONSTRAINT IF EXISTS "ClientUpdate_workOrderId_fkey";

ALTER TABLE "ClientUpdate"
    ADD CONSTRAINT "ClientUpdate_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Session
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NULL,
    "clientId" TEXT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "userAgent" TEXT NULL,
    "ipAddress" TEXT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

ALTER TABLE "Session"
    DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

ALTER TABLE "Session"
    ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session"
    DROP CONSTRAINT IF EXISTS "Session_clientId_fkey";

ALTER TABLE "Session"
    ADD CONSTRAINT "Session_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable StaffInvite
CREATE TABLE IF NOT EXISTS "StaffInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3) NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "StaffInvite_tenantId_idx" ON "StaffInvite"("tenantId");

ALTER TABLE "StaffInvite"
    DROP CONSTRAINT IF EXISTS "StaffInvite_tenantId_fkey";

ALTER TABLE "StaffInvite"
    ADD CONSTRAINT "StaffInvite_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffInvite"
    DROP CONSTRAINT IF EXISTS "StaffInvite_invitedByUserId_fkey";

ALTER TABLE "StaffInvite"
    ADD CONSTRAINT "StaffInvite_invitedByUserId_fkey"
    FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
