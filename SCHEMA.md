# Database Schema Design

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│   Category   │       │   Product    │
├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │
│ name (UNIQUE)│  └───>│ categoryId   │
│ createdAt    │       │ name         │
│ updatedAt    │       │ description  │
└──────────────┘       │ price        │
                       │ stock        │
                       │ deletedAt    │  ← soft delete
                       │ createdAt    │
                       │ updatedAt    │
                       └──────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CartItem   │  │  OrderItem   │  │              │
├──────────────┤  ├──────────────┤  │              │
│ id (PK)      │  │ id (PK)      │  │              │
│ cartId (FK)  │  │ orderId (FK) │  │              │
│ productId(FK)│  │ productId(FK)│  │              │
│ quantity     │  │ quantity     │  │              │
│ createdAt    │  │ price        │  │              │
│ updatedAt    │  │ createdAt    │  │              │
└──────┬───────┘  │ updatedAt    │  │              │
       │          └──────┬───────┘  │              │
       ▼                 ▼          │              │
┌──────────────┐  ┌──────────────┐  │              │
│     Cart     │  │    Order     │  │              │
├──────────────┤  ├──────────────┤  │              │
│ id (PK)      │  │ id (PK)      │  │              │
│ userId(UNIQ) │  │ userId       │  │              │
│ createdAt    │  │ status       │  │              │
│ updatedAt    │  │ totalAmount  │  │              │
└──────────────┘  │ createdAt    │  │              │
                  │ updatedAt    │  │              │
                  └──────────────┘  │              │
```

## Relationships

### Category → Product (One-to-Many)
A category has many products. Each product belongs to exactly one category. This models the grocery aisle structure (Dairy, Fruits, Bakery, etc.).

### Cart → CartItem (One-to-Many)
Each user has at most one cart (enforced by `userId UNIQUE` on the Cart table). A cart contains multiple cart items. Cart items are deleted via CASCADE when a cart is removed.

### CartItem → Product (Many-to-One)
Each cart item references a product. The `@@unique([cartId, productId])` constraint prevents duplicate product entries in the same cart — adding the same product updates the quantity instead.

### Order → OrderItem (One-to-Many)
An order contains multiple order items. Order items are deleted via CASCADE when an order is removed.

### OrderItem → Product (Many-to-One)
Each order item references a product and stores a **snapshot** of the price at the time of ordering. This ensures order history remains accurate even if product prices change later.

## Key Design Decisions

1. **Soft Deletes on Products**: The `deletedAt` column allows products to be "deleted" without losing historical order data. Queries for the public API filter `WHERE deletedAt IS NULL`.

2. **Price Snapshot in OrderItem**: The `price` field in `OrderItem` captures the product price at order time, decoupling order history from product price changes.

3. **Cart per User**: The `userId UNIQUE` constraint on Cart ensures one active cart per user. The cart persists in PostgreSQL (not in-memory or Redis) as required.

4. **UUID Primary Keys**: UUIDs prevent enumeration attacks and work well in distributed systems.

5. **Decimal for Money**: Using `Decimal(10,2)` for prices avoids floating-point precision issues.
