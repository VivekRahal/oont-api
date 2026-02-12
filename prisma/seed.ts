import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const fruits = await prisma.category.create({ data: { name: 'Fruits' } });
  const vegetables = await prisma.category.create({ data: { name: 'Vegetables' } });
  const dairy = await prisma.category.create({ data: { name: 'Dairy' } });
  const bakery = await prisma.category.create({ data: { name: 'Bakery' } });
  const meat = await prisma.category.create({ data: { name: 'Meat & Poultry' } });
  const beverages = await prisma.category.create({ data: { name: 'Beverages' } });
  const snacks = await prisma.category.create({ data: { name: 'Snacks' } });
  const frozen = await prisma.category.create({ data: { name: 'Frozen Foods' } });

  console.log('Created 8 categories');

  // Create products
  const products = [
    { name: 'Banana', description: 'Fresh organic bananas, bunch of 6', price: 1.99, stock: 150, categoryId: fruits.id },
    { name: 'Apple (Red)', description: 'Crisp red apples, per kg', price: 3.49, stock: 100, categoryId: fruits.id },
    { name: 'Strawberries', description: 'Fresh strawberries, 250g pack', price: 4.99, stock: 60, categoryId: fruits.id },
    { name: 'Avocado', description: 'Ripe Hass avocados, each', price: 2.49, stock: 80, categoryId: fruits.id },

    { name: 'Tomatoes', description: 'Vine-ripened tomatoes, per kg', price: 2.99, stock: 120, categoryId: vegetables.id },
    { name: 'Broccoli', description: 'Fresh broccoli head', price: 2.49, stock: 75, categoryId: vegetables.id },
    { name: 'Carrots', description: 'Organic carrots, 1kg bag', price: 1.99, stock: 90, categoryId: vegetables.id },
    { name: 'Spinach', description: 'Baby spinach leaves, 200g', price: 3.49, stock: 50, categoryId: vegetables.id },

    { name: 'Whole Milk', description: 'Full cream milk, 1 liter', price: 1.79, stock: 200, categoryId: dairy.id },
    { name: 'Cheddar Cheese', description: 'Aged cheddar, 250g block', price: 5.99, stock: 45, categoryId: dairy.id },
    { name: 'Greek Yogurt', description: 'Plain Greek yogurt, 500g', price: 4.49, stock: 60, categoryId: dairy.id },
    { name: 'Butter', description: 'Unsalted butter, 250g', price: 3.99, stock: 80, categoryId: dairy.id },

    { name: 'Sourdough Bread', description: 'Artisan sourdough loaf', price: 5.49, stock: 30, categoryId: bakery.id },
    { name: 'Croissants', description: 'Butter croissants, pack of 4', price: 4.99, stock: 40, categoryId: bakery.id },
    { name: 'Bagels', description: 'Plain bagels, pack of 6', price: 3.99, stock: 35, categoryId: bakery.id },

    { name: 'Chicken Breast', description: 'Skinless chicken breast, 500g', price: 8.99, stock: 50, categoryId: meat.id },
    { name: 'Ground Beef', description: 'Lean ground beef, 500g', price: 7.99, stock: 40, categoryId: meat.id },
    { name: 'Salmon Fillet', description: 'Fresh Atlantic salmon, 200g', price: 9.99, stock: 25, categoryId: meat.id },

    { name: 'Orange Juice', description: 'Fresh squeezed OJ, 1 liter', price: 4.49, stock: 70, categoryId: beverages.id },
    { name: 'Sparkling Water', description: 'Sparkling mineral water, 1.5L', price: 1.49, stock: 100, categoryId: beverages.id },
    { name: 'Green Tea', description: 'Organic green tea, 20 bags', price: 3.99, stock: 55, categoryId: beverages.id },

    { name: 'Mixed Nuts', description: 'Roasted mixed nuts, 300g', price: 6.99, stock: 45, categoryId: snacks.id },
    { name: 'Dark Chocolate', description: '70% dark chocolate bar, 100g', price: 3.49, stock: 60, categoryId: snacks.id },
    { name: 'Rice Crackers', description: 'Lightly salted rice crackers, 150g', price: 2.99, stock: 50, categoryId: snacks.id },

    { name: 'Frozen Pizza', description: 'Margherita pizza, 350g', price: 5.99, stock: 35, categoryId: frozen.id },
    { name: 'Ice Cream', description: 'Vanilla ice cream, 1 liter', price: 6.49, stock: 30, categoryId: frozen.id },
    { name: 'Frozen Peas', description: 'Garden peas, 500g bag', price: 2.49, stock: 55, categoryId: frozen.id },
  ];

  await prisma.product.createMany({ data: products });
  console.log(`Created ${products.length} products`);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
