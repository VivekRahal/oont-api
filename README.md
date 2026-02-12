# OoNt Grocery Inventory & Order API

A NestJS-based microservice for grocery product inventory, cart management, and order processing with robust concurrency control.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Containerization**: Docker & Docker Compose
- **API Docs**: Swagger/OpenAPI

## Quick Start

### Using Docker (Recommended)

```bash
docker-compose up --build
```

This starts both the PostgreSQL database and the NestJS application. The app automatically runs database migrations on startup.

**Seed the database** with sample data (8 categories, 27 products):

```bash
docker-compose exec app npx prisma db seed
```

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL (ensure it's running on localhost:5432)
# Update .env with your DATABASE_URL if needed

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start the application
npm run start:dev
```

## API Documentation

Once the server is running, visit the Swagger UI at:

**http://localhost:3000/api**

## API Endpoints

### Products
- `GET /products` — List all products (paginated: `?page=1&limit=20`)
- `GET /products/:id` — Get product details with stock level

### Categories
- `GET /categories` — List all categories
- `GET /categories/:id/products` — List products in a category (paginated)

### Cart
- `GET /cart/:userId` — Get user's cart contents
- `POST /cart/:userId/items` — Add item to cart
- `PUT /cart/:userId/items/:productId` — Update item quantity
- `DELETE /cart/:userId/items/:productId` — Remove item from cart
- `DELETE /cart/:userId` — Clear entire cart

### Orders
- `POST /orders` — Create order from cart (atomic, concurrency-safe)
- `GET /orders/:id` — Get order details
- `POST /orders/:id/cancel` — Cancel order and restore stock

## Concurrency Strategy

The most critical challenge in this application is preventing overselling — multiple users attempting to purchase the last item in stock simultaneously.

**Solution: Pessimistic Locking with `SELECT ... FOR UPDATE`**

When a `POST /orders` request is received, the service opens a Prisma interactive transaction. Within this transaction, each product row referenced in the cart is locked using a raw SQL `SELECT ... FOR UPDATE` query. This row-level lock forces any other concurrent transaction to **wait** until the current one completes before it can read or modify the same product row. Once the lock is acquired, the service checks stock availability, decrements stock, creates the order, and clears the cart — all atomically. If any item has insufficient stock, the entire transaction rolls back with no side effects.

This approach was chosen over optimistic concurrency control (version columns) because it is simpler to reason about, avoids retry loops, and performs well under the expected load of a grocery delivery service where write contention on individual product rows is moderate rather than extreme. It also avoids the false rejection problem that Serializable isolation can cause — with `FOR UPDATE`, transactions queue up rather than aborting, so orders only fail when stock is genuinely insufficient.

## Design Decisions

- **Prisma ORM**: Chosen for its type-safe client, excellent migration tooling, and clean API. Raw SQL is used only where necessary (row-level locking).
- **Soft Deletes**: Products have a `deletedAt` column. Deleted products are filtered from the public API but remain visible in historical orders.
- **Price Snapshots**: Order items store the product price at the time of purchase, ensuring order history accuracy regardless of price changes.
- **Global Validation Pipe**: All DTOs are validated using `class-validator` with `whitelist` and `forbidNonWhitelisted` options to reject unexpected fields.
- **Modular Architecture**: The application is split into `ProductModule`, `CategoryModule`, `CartModule`, and `OrderModule`, each with their own controller, service, and DTOs.

## Project Structure

```
src/
├── main.ts                  # App bootstrap, Swagger setup, validation pipe
├── app.module.ts            # Root module
├── prisma/
│   ├── prisma.module.ts     # Global Prisma module
│   └── prisma.service.ts    # Prisma client service
├── product/
│   ├── product.module.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── dto/
│       └── pagination.dto.ts
├── category/
│   ├── category.module.ts
│   ├── category.controller.ts
│   └── category.service.ts
├── cart/
│   ├── cart.module.ts
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   └── dto/
│       ├── add-cart-item.dto.ts
│       └── update-cart-item.dto.ts
└── order/
    ├── order.module.ts
    ├── order.controller.ts
    ├── order.service.ts
    └── dto/
        └── create-order.dto.ts
```
