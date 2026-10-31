# UML Diagrams Architecture Specification
## E-Commerce Order Management Platform

> **Standard:** Unified Modeling Language (UML 2.5)  
> **Diagram Format:** Mermaid Syntactically Valid Code Blocks  
> **Contents:** Use Case Diagram, Class Diagram, Activity Diagram, Sequence Diagram  

---

## 1. Use Case Diagram

### 1.1 Actors
1. **Customer:** End-user purchasing archival fashion items.
2. **Administrator:** System manager overseeing catalog, inventory, customers, order lifecycles, and disaster recovery.
3. **Vendor:** Merchant managing catalog allocations and inventory for their assigned brand.
4. **Payment Gateway:** External third-party payment settlement provider (Razorpay / Stripe).

### 1.2 Visual Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Actors
        C((Customer))
        A((Administrator))
        V((Vendor))
        PG((Payment Gateway))
    end

    subgraph "Storefront & Account Boundary"
        UC_Reg[Register Account]
        UC_Auth[Sign In & Rotate Password]
        UC_Browse[Browse & Search Products]
        UC_Cart[Manage Cart & Variants]
        UC_Wishlist[Manage Wishlist]
        UC_Review[Submit Rating & Appraisal]
        UC_Profile[Update Shipping Profile]
        UC_Track[Track Order Timeline]
    end

    subgraph "Order & Inventory Boundary"
        UC_Checkout[Place Order]
        UC_Lock[Lock Stock Row Mutex]
        UC_Cancel[Cancel Order]
        UC_Invoice[Download / Print Invoice]
        UC_Transfer[Transfer Inter-Warehouse Stock]
        UC_StockAdj[Direct Stock Adjustment]
    end

    subgraph "Payment & Admin Boundary"
        UC_Pay[Authorise Gateway Payment]
        UC_Webhook[Ingest Cryptographic Webhook]
        UC_Ledger[Balance Financial Ledger]
        UC_CustDir[Manage Customer Accounts]
        UC_ProdCRUD[Product & Category CRUD]
        UC_Reports[View Analytics & Export CSV]
        UC_Backup[Trigger & Restore Backups]
        UC_VendorPortal[Manage Brand Allocations]
    end

    %% Customer Associations
    C --> UC_Reg
    C --> UC_Auth
    C --> UC_Browse
    C --> UC_Cart
    C --> UC_Wishlist
    C --> UC_Review
    C --> UC_Profile
    C --> UC_Track
    C --> UC_Checkout
    C --> UC_Cancel
    C --> UC_Invoice

    %% Admin Associations
    A --> UC_Auth
    A --> UC_CustDir
    A --> UC_ProdCRUD
    A --> UC_Transfer
    A --> UC_StockAdj
    A --> UC_Reports
    A --> UC_Backup

    %% Vendor Associations
    V --> UC_Auth
    V --> UC_VendorPortal

    %% Includes & Extends
    UC_Checkout -.->|<<include>>| UC_Lock
    UC_Checkout -.->|<<include>>| UC_Pay
    UC_Pay -.->|<<include>>| UC_Ledger
    UC_Pay -.->|<<interacts>>| PG
    PG -.->|<<dispatches>>| UC_Webhook
    UC_Webhook -.->|<<include>>| UC_Ledger
    UC_Cancel -.->|<<extend>>| UC_Track
```

---

## 2. Structural UML Class Diagram

The Class Diagram reflects the object-oriented domain layer implemented in `src/domain/`:

```mermaid
classDiagram
    %% Team 1 Entities
    class User {
        -string _id
        -string _email
        -UserRole _role
        -boolean _isActive
        -string _passwordHash
        -Date _lastLoginAt
        +getId() string
        +getEmail() string
        +getRole() UserRole
        +getIsActive() boolean
        +verifyPassword(candidate) boolean
        +setPassword(newPassword) void
        +recordLogin() void
        +deactivate() void
        +activate() void
    }

    class Customer {
        -string _id
        -User _user
        -string _firstName
        -string _lastName
        -string _phone
        -string _address
        -string _city
        -string _postalCode
        -string _country
        +getFullName() string
        +getShippingAddressString() string
        +updateAddress(address, city, zip, country) void
    }

    class Product {
        -string _id
        -string _sku
        -string _name
        -number _price
        -number _originalPrice
        -number _stockQty
        -Category _category
        -Brand _brand
        +getIsSale() boolean
        +hasAvailableStock(qty) boolean
        +reserveStock(qty) void
        +restock(qty) void
        +applyDiscount(percent) void
    }

    class Category {
        -string _id
        -string _name
        -Category _parentCategory
        -Category[] _subCategories
        +addSubCategory(category) void
        +getFullHierarchyPath() string
    }

    class Brand {
        -string _id
        -string _name
        -Product[] _products
        +addProduct(product) void
        +getProductCount() number
    }

    %% Team 2 Entities
    class CartItem {
        -Product _product
        -number _quantity
        -string _selectedSize
        -string _selectedColor
        +getLineTotal() number
        +increment(qty) void
        +setQuantity(qty) void
    }

    class Cart {
        -string _customerId
        -CartItem[] _items
        +getItemCount() number
        +getSubtotal() number
        +addItem(product, qty, size, color) void
        +removeItem(productId, size, color) void
        +clear() void
    }

    class Order {
        -string _id
        -string _customerId
        -CartItem[] _items
        -number _shippingCost
        -OrderStatusType _status
        -Object[] _history
        +getTotalAmount() number
        +isCancellable() boolean
        +confirm() void
        +advanceStatus(next) void
        +cancel() void
    }

    class Inventory {
        -string _productId
        -string _warehouseId
        -number _quantityAvailable
        +adjust(delta) void
        +transferTo(destination, amount) void
    }

    class Invoice {
        -string _invoiceNo
        -string _orderId
        -number _totalAmount
        -Date _issuedAt
        +formatSummary() string
    }

    %% Team 3 Entities
    class Payment {
        -string _id
        -string _orderId
        -number _amount
        -PaymentStatus _status
        -string _gatewayTxnId
        -Transaction[] _transactions
        +markCompleted(gatewayTxnId) Transaction
        +markFailed(reason) Transaction
        +refund() Transaction
    }

    class Transaction {
        -string _id
        -string _paymentId
        -TransactionType _type
        -number _amount
        -TransactionStatus _status
        -Date _createdAt
    }

    class Notification {
        -string _id
        -string _userId
        -string _message
        -boolean _read
        -Date _createdAt
        +markAsRead() void
    }

    class Report {
        -string _id
        -string _type
        -Object[] _rows
        -Date _generatedAt
        +exportCsv() string
    }

    %% Relationships
    User <|-- Customer : "profiles"
    Category "1" *-- "many" Category : "parent/child"
    Category "1" o-- "many" Product : "classifies"
    Brand "1" o-- "many" Product : "produces"
    Cart "1" *-- "many" CartItem : "contains"
    CartItem "many" --> "1" Product : "references"
    Order "1" *-- "many" CartItem : "includes"
    Order "1" -- "1" Invoice : "issues"
    Order "1" -- "many" Payment : "settles"
    Payment "1" *-- "many" Transaction : "records"
    Product "1" -- "many" Inventory : "stored_in"
```

---

## 3. Order Processing & Fulfillment Activity Diagram

```mermaid
flowchart TD
    Start([Customer Initiates Checkout]) --> ReviewBag[Review Bag Items & Shipping Method]
    ReviewBag --> AuthCheck{Is Customer Signed In?}
    AuthCheck -- No --> RedirectLogin[Redirect to Login / Signup]
    RedirectLogin --> MergeCart[Merge Guest Bag into Customer Account]
    MergeCart --> AddressInput[Provide Dispatch Address & Payment Details]
    AuthCheck -- Yes --> AddressInput

    AddressInput --> SubmitOrder[Click Authorise & Place Order]
    SubmitOrder --> BeginTxn[Begin PostgreSQL Transaction]
    BeginTxn --> AcquireLock[Lock Products: SELECT ... FOR UPDATE]
    
    AcquireLock --> StockCheck{Authoritative Stock >= Requested?}
    StockCheck -- No --> RollbackStock[Rollback Transaction & Alert Out-of-Stock]
    RollbackStock --> EndFail([Checkout Terminated])

    StockCheck -- Yes --> DeductStock[Decrement stock_qty in Database]
    DeductStock --> CreateOrder[Insert Order with PENDING status]
    CreateOrder --> CommitTxn[Commit Transaction]

    CommitTxn --> GatewayDispatch[Transmit to Payment Gateway Sandbox]
    GatewayDispatch --> SignatureCheck{HMAC-SHA256 Signature Valid?}
    
    SignatureCheck -- No / Declined --> MarkFailed[Record Payment FAILED & Keep Order PENDING]
    MarkFailed --> PaymentAlert[Display Decline Notice & Allow Retry]
    PaymentAlert --> EndFail

    SignatureCheck -- Yes --> ConfirmOrder[Promote Order to CONFIRMED status]
    ConfirmOrder --> RecordLedger[Create Transaction SUCCESS in Ledger]
    ConfirmOrder --> GenerateInvoice[Generate Sequential Invoice No]
    GenerateInvoice --> SendNotification[Append Notification & OrderStatus Telemetry]

    SendNotification --> FulfillmentLoop[Warehouse Order Fulfillment Stepper]
    FulfillmentLoop --> StepProc[PROCESSING: Picking & Packing]
    StepProc --> StepShip[SHIPPED: Carrier DHL Dispatch]
    StepShip --> StepDeliv[DELIVERED: Signed Receipt by Consignee]
    StepDeliv --> EndSuccess([Order Cycle Complete])
```

---

## 4. Concurrency & Webhook Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Browser
    participant API as /api/orders
    participant DB as PostgreSQL 16 (Neon)
    participant Gateway as Payment Gateway Sandbox
    participant Webhook as /api/payments/webhook
    actor Admin as Admin Dashboard

    Note over Customer,DB: Phase 1: High-Concurrency Atomic Order Placement
    Customer->>API: POST /api/orders (cart items, address)
    API->>DB: BEGIN Transaction (Serializable)
    API->>DB: SELECT * FROM products WHERE id IN (...) FOR UPDATE
    Note over DB: Row Mutex Lock Held (Deterministic ID Sort)
    DB-->>API: Locked Product Stock Rows
    API->>API: Validate stock_qty >= quantity
    API->>DB: UPDATE products SET stock_qty = stock_qty - qty
    API->>DB: INSERT INTO orders (status: PENDING)
    API->>DB: INSERT INTO order_items (...)
    API->>DB: COMMIT Transaction
    Note over DB: Mutex Released (Stock Conserved)
    DB-->>API: Order ID #ORD-991 Created
    API-->>Customer: Return Order Summary & Invoice No

    Note over Customer,Gateway: Phase 2: Payment Execution & Gateway Transmission
    Customer->>Gateway: Submit Card Details to Sandbox Modal
    Gateway->>Gateway: Charge & Compute HMAC-SHA256(order_id|payment_id, secret)
    Gateway-->>Customer: Return gatewayPaymentId & Signature

    Note over Gateway,Webhook: Phase 3: Cryptographic Webhook Ingestion (Async)
    Gateway->>Webhook: POST /api/payments/webhook (x-razorpay-signature header)
    Webhook->>Webhook: Verify crypto.timingSafeEqual(header, computedHMAC)
    alt Invalid / Forged Signature
        Webhook-->>Gateway: 400 Bad Request (Attack Prevented)
    else Authentic Signature Verified
        Webhook->>DB: UPDATE payments SET status = 'COMPLETED'
        Webhook->>DB: INSERT INTO transactions (type: PAYMENT, status: SUCCESS)
        Webhook->>DB: UPDATE orders SET status = 'CONFIRMED'
        Webhook->>DB: INSERT INTO order_statuses (status: CONFIRMED)
        Webhook->>DB: INSERT INTO audit_logs (action: UPDATE, entity: Payment)
        Webhook-->>Gateway: 200 OK (Processed Idempotently)
    end

    Note over Customer,Admin: Phase 4: Self-Service Telemetry Tracking & Admin Fulfillment
    Customer->>API: GET /orders/[id]
    API->>DB: Query order with order_statuses
    DB-->>Customer: Render Graphical Stepper (Milestone Timestamps)
    Admin->>API: PATCH /api/orders/[id]/status (SHIPPED)
    API->>DB: Append order_statuses (SHIPPED)
    DB-->>Admin: Order Telemetry Updated
```
