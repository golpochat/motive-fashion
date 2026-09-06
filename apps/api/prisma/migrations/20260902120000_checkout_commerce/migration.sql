-- Publishable fulfilment, county rates, payment methods, and order checkout fields.
CREATE TABLE "FulfilmentMethodConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "freeOverCents" INTEGER,
    CONSTRAINT "FulfilmentMethodConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FulfilmentMethodConfig_code_key" ON "FulfilmentMethodConfig"("code");

CREATE TABLE "DeliveryCounty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "rateCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DeliveryCounty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryCounty_code_key" ON "DeliveryCounty"("code");

CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "publicChannel" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMethodConfig_code_key" ON "PaymentMethodConfig"("code");

ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'CARD';
ALTER TABLE "Order" ADD COLUMN "shippingCounty" TEXT;
ALTER TABLE "Order" ADD COLUMN "returnPolicyAck" BOOLEAN NOT NULL DEFAULT false;
