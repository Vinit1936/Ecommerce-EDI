-- DropIndex
DROP INDEX "carts_customer_id_product_id_key";

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "selected_color" VARCHAR(50) NOT NULL DEFAULT '',
ADD COLUMN     "selected_size" VARCHAR(50) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "selected_color" VARCHAR(50) NOT NULL DEFAULT '',
ADD COLUMN     "selected_size" VARCHAR(50) NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_product_id_selected_size_selected_color_key" ON "carts"("customer_id", "product_id", "selected_size", "selected_color");
