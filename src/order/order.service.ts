import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string) {
    // Find the user's cart with items
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Use an interactive transaction with serializable isolation
    // to prevent race conditions (overselling)
    try {
    return await this.prisma.$transaction(
      async (tx) => {
        const insufficientItems: {
          productId: string;
          productName: string;
          requested: number;
          available: number;
        }[] = [];

        // Lock each product row with SELECT ... FOR UPDATE to prevent
        // concurrent modifications. This ensures that if two users
        // try to buy the last item simultaneously, only one succeeds.
        for (const item of cart.items) {
          const [product] = await tx.$queryRaw<
            { id: string; name: string; stock: number; price: Prisma.Decimal }[]
          >`
            SELECT id, name, stock, price
            FROM products
            WHERE id = ${item.productId} AND "deletedAt" IS NULL
            FOR UPDATE
          `;

          if (!product) {
            insufficientItems.push({
              productId: item.productId,
              productName: item.product.name,
              requested: item.quantity,
              available: 0,
            });
            continue;
          }

          if (product.stock < item.quantity) {
            insufficientItems.push({
              productId: item.productId,
              productName: product.name,
              requested: item.quantity,
              available: product.stock,
            });
          }
        }

        // If any items have insufficient stock, fail the entire order
        if (insufficientItems.length > 0) {
          throw new BadRequestException({
            message: 'Insufficient stock for one or more items',
            insufficientItems,
          });
        }

        // All stock is available - deduct stock and create order
        let totalAmount = new Prisma.Decimal(0);

        for (const item of cart.items) {
          await tx.$executeRaw`
            UPDATE products
            SET stock = stock - ${item.quantity}, "updatedAt" = NOW()
            WHERE id = ${item.productId}
          `;
          totalAmount = totalAmount.add(
            new Prisma.Decimal(item.product.price.toString()).mul(item.quantity),
          );
        }

        // Create the order
        const order = await tx.order.create({
          data: {
            userId,
            status: 'PENDING',
            totalAmount,
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price,
              })),
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });

        // Clear the user's cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
    } catch (error) {
      // Handle PostgreSQL serialization failures (concurrent transaction conflicts)
      // Error code P2034 = transaction conflict, 40001 = serialization_failure
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2010')
      ) {
        throw new BadRequestException(
          'Order could not be processed due to concurrent demand. Please try again.',
        );
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async cancelOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled');
    }

    // Cancel the order and restore stock atomically
    return this.prisma.$transaction(async (tx) => {
      // Restore stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Update order status
      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    });
  }
}
