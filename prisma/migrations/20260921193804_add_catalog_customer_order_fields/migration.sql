-- AlterTable
ALTER TABLE "products" ADD COLUMN     "colors" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "details" TEXT[],
ADD COLUMN     "hero_span" VARCHAR(20),
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_new" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_sale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_price" DECIMAL(12,2),
ADD COLUMN     "sizes" TEXT[],
ADD COLUMN     "sku" VARCHAR(50) NOT NULL,
ADD COLUMN     "specimen_no" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "postal_code" VARCHAR(20);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shipping_address" VARCHAR(255),
ADD COLUMN     "shipping_city" VARCHAR(100),
ADD COLUMN     "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_country" VARCHAR(100),
ADD COLUMN     "shipping_method" VARCHAR(50) NOT NULL DEFAULT 'standard',
ADD COLUMN     "shipping_name" VARCHAR(200),
ADD COLUMN     "shipping_phone" VARCHAR(30),
ADD COLUMN     "shipping_postal_code" VARCHAR(20);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "invoice_no" VARCHAR(50) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_no_key" ON "invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_is_featured_idx" ON "products"("is_featured");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
