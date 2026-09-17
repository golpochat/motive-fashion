-- AlterTable
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_barcode_key" UNIQUE ("barcode");

-- AlterTable
ALTER TABLE "InventoryLevel" ADD COLUMN "binCode" TEXT;

-- CreateIndex
CREATE INDEX "InventoryLevel_binCode_idx" ON "InventoryLevel"("binCode");

-- Existing SKUs print and scan as themselves until a GTIN is stored.
UPDATE "ProductVariant" SET "barcode" = sku WHERE "barcode" IS NULL;
