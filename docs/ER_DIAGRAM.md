# Entity-Relationship (ER) Diagram
## E-Commerce Order Management Platform

> **Relational Database:** PostgreSQL 16 (Neon Serverless)  
> **ORM Engine:** Prisma ORM  
> **Total Entities:** 16 Relational Tables  
> **Primary Key Standard:** UUIDv4 (`@db.Uuid`)  
> **Table Mapping:** snake_case physical table names (`@@map("...")`)  

---

## 1. Visual Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    ROLE ||--o{ USER : "authorizes"
    USER ||--o| CUSTOMER : "profiles"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "triggers"
    USER ||--o{ REPORT : "generates"

    CATEGORY ||--o{ CATEGORY : "subcategorizes"
    CATEGORY ||--o{ PRODUCT : "classifies"
    BRAND ||--o{ PRODUCT : "manufactures"

    PRODUCT ||--o{ INVENTORY : "stocked_in"
    WAREHOUSE ||--o{ INVENTORY : "allocates"

    CUSTOMER ||--o{ CART : "selects"
    PRODUCT ||--o{ CART : "held_in"

    CUSTOMER ||--o{ WISHLIST : "saves"
    PRODUCT ||--o{ WISHLIST : "favorited"

    CUSTOMER ||--o{ PRODUCT_REVIEW : "appraises"
    PRODUCT ||--o{ PRODUCT_REVIEW : "reviewed"

    CUSTOMER ||--o{ ORDER : "places"
    ORDER ||--o{ ORDER_ITEM : "contains"
    PRODUCT ||--o{ ORDER_ITEM : "ordered_as"

    ORDER ||--o| INVOICE : "bills"
    ORDER ||--o{ ORDER_STATUS : "tracks"
    ORDER ||--o{ PAYMENT : "settles"

    PAYMENT ||--o{ TRANSACTION : "records"

    ROLE {
        uuid id PK
        varchar_50 name UK
        timestamp created_at
        timestamp updated_at
    }

    USER {
        uuid id PK
        varchar_255 email UK
        varchar_255 password_hash
        boolean is_active
        timestamp last_login_at
        uuid role_id FK
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMER {
        uuid id PK
        uuid user_id FK,UK
        varchar_100 first_name
        varchar_100 last_name
        varchar_30 phone
        varchar_255 address
        varchar_100 city
        varchar_20 postal_code
        varchar_100 country
        timestamp created_at
        timestamp updated_at
    }

    CATEGORY {
        uuid id PK
        varchar_100 name
        uuid parent_category_id FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    BRAND {
        uuid id PK
        varchar_100 name
        timestamp created_at
    }

    PRODUCT {
        uuid id PK
        varchar_50 sku UK
        varchar_100 specimen_no
        varchar_255 name
        text description
        decimal_12_2 price
        decimal_12_2 original_price
        int stock_qty "authoritative locked counter"
        boolean is_featured
        boolean is_new
        boolean is_sale
        uuid category_id FK
        uuid brand_id FK
        timestamp created_at
        timestamp updated_at
    }

    WAREHOUSE {
        uuid id PK
        varchar_100 name
        varchar_255 location
        timestamp created_at
        timestamp updated_at
    }

    INVENTORY {
        uuid id PK
        uuid product_id FK
        uuid warehouse_id FK
        int quantity_available
        timestamp created_at
        timestamp updated_at
    }

    CART {
        uuid id PK
        uuid customer_id FK
        uuid product_id FK
        int quantity
        varchar_50 selected_size
        varchar_50 selected_color
        timestamp created_at
        timestamp updated_at
    }

    WISHLIST {
        uuid id PK
        uuid customer_id FK
        uuid product_id FK
        timestamp created_at
    }

    PRODUCT_REVIEW {
        uuid id PK
        uuid product_id FK
        uuid customer_id FK
        int rating "1 to 5"
        text comment
        timestamp created_at
        timestamp updated_at
    }

    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal_12_2 total_amount
        enum status "PENDING,CONFIRMED,PROCESSING,SHIPPED,DELIVERED,CANCELLED,RETURNED"
        varchar_200 shipping_name
        varchar_255 shipping_address
        varchar_100 shipping_city
        varchar_20 shipping_postal_code
        varchar_100 shipping_country
        varchar_30 shipping_phone
        decimal_12_2 shipping_cost
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal_12_2 unit_price
        varchar_50 selected_size
        varchar_50 selected_color
        timestamp created_at
        timestamp updated_at
    }

    ORDER_STATUS {
        uuid id PK
        uuid order_id FK
        enum status
        timestamp changed_at
    }

    INVOICE {
        uuid id PK
        uuid order_id FK,UK
        varchar_50 invoice_no UK
        decimal_12_2 total_amount
        timestamp issued_at
    }

    PAYMENT {
        uuid id PK
        uuid order_id FK
        decimal_12_2 amount
        enum status "PENDING,COMPLETED,FAILED,REFUNDED"
        varchar_255 gateway_txn_id
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTION {
        uuid id PK
        uuid payment_id FK
        enum type "PAYMENT,REFUND,CHARGEBACK,ADJUSTMENT"
        decimal_12_2 amount
        enum status "PENDING,SUCCESS,FAILED"
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        text message
        boolean read
        timestamp created_at
        timestamp updated_at
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        enum action "CREATE,UPDATE,DELETE,LOGIN,LOGOUT"
        varchar_100 entity
        uuid entity_id
        timestamp created_at
    }

    BACKUP_HISTORY {
        uuid id PK
        text file_url
        enum status "PENDING,IN_PROGRESS,COMPLETED,FAILED"
        timestamp created_at
        timestamp updated_at
    }

    REPORT {
        uuid id PK
        enum type "SALES,INVENTORY,FINANCIAL,USER_ACTIVITY,CUSTOM"
        uuid generated_by FK
        timestamp generated_at
    }
```

---

## 2. Relational Schema Integrity & Constraint Specifications

### 2.1 Foreign Key Referential Constraints
1. `users.role_id` $\longrightarrow$ `roles.id` (`ON DELETE RESTRICT`)
2. `customers.user_id` $\longrightarrow$ `users.id` (`ON DELETE CASCADE`)
3. `categories.parent_category_id` $\longrightarrow$ `categories.id` (`ON DELETE RESTRICT`)
4. `products.category_id` $\longrightarrow$ `categories.id` (`ON DELETE RESTRICT`)
5. `products.brand_id` $\longrightarrow$ `brands.id` (`ON DELETE RESTRICT`)
6. `inventories.product_id` $\longrightarrow$ `products.id` (`ON DELETE CASCADE`)
7. `inventories.warehouse_id` $\longrightarrow$ `warehouses.id` (`ON DELETE CASCADE`)
8. `orders.customer_id` $\longrightarrow$ `customers.id` (`ON DELETE RESTRICT`)
9. `order_items.order_id` $\longrightarrow$ `orders.id` (`ON DELETE CASCADE`)
10. `order_items.product_id` $\longrightarrow$ `products.id` (`ON DELETE RESTRICT`)
11. `order_statuses.order_id` $\longrightarrow$ `orders.id` (`ON DELETE CASCADE`)
12. `invoices.order_id` $\longrightarrow$ `orders.id` (`ON DELETE CASCADE`)
13. `payments.order_id` $\longrightarrow$ `orders.id` (`ON DELETE CASCADE`)
14. `transactions.payment_id` $\longrightarrow$ `payments.id` (`ON DELETE CASCADE`)
15. `notifications.user_id` $\longrightarrow$ `users.id` (`ON DELETE CASCADE`)
16. `audit_logs.user_id` $\longrightarrow$ `users.id` (`ON DELETE CASCADE`)

### 2.2 Compound Unique Constraints (Deduplication & Integrity)
- `inventories`: `@@unique([productId, warehouseId])` — Guarantees exactly one inventory record per product per warehouse.
- `carts`: `@@unique([customerId, productId, selectedSize, selectedColor])` — Prevents duplicate cart rows for identical product variants.
- `wishlists`: `@@unique([customerId, productId])` — Prevents multiple wishlist entries for the same product.
- `product_reviews`: `@@unique([productId, customerId])` — Enforces academic constraint of one review per customer per product.

---

## 3. Database Normalization Analysis
- **1NF (First Normal Form):** Every table possesses a primary key (`UUID`), and all attributes are atomic values (with JSON columns reserved strictly for UI metadata).
- **2NF (Second Normal Form):** All non-key attributes are fully functionally dependent on the entire primary key. No partial dependencies exist.
- **3NF (Third Normal Form):** Non-key attributes depend solely on the primary key with zero transitive dependencies (e.g., customer shipping address resides strictly on `Customer`, referenced via foreign key from `Order`).
