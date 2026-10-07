CREATE TABLE "VehicleOwnershipTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromClientId" TEXT NOT NULL,
    "toClientId" TEXT NOT NULL,
    "fromClientName" TEXT NOT NULL,
    "toClientName" TEXT NOT NULL,
    "performedByUserId" TEXT,
    "performedByName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleOwnershipTransfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleOwnershipTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VehicleOwnershipTransfer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VehicleOwnershipTransfer_fromClientId_fkey" FOREIGN KEY ("fromClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VehicleOwnershipTransfer_toClientId_fkey" FOREIGN KEY ("toClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VehicleOwnershipTransfer_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "VehicleOwnershipTransfer_tenantId_vehicleId_createdAt_idx"
    ON "VehicleOwnershipTransfer"("tenantId", "vehicleId", "createdAt");
