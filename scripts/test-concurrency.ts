/**
 * Concurrency Test Script
 *
 * Simulates multiple users trying to buy the last items in stock
 * simultaneously. Proves that overselling is impossible.
 *
 * Usage:
 *   npx ts-node scripts/test-concurrency.ts [BASE_URL]
 *
 * Examples:
 *   npx ts-node scripts/test-concurrency.ts                          # localhost:3001
 *   npx ts-node scripts/test-concurrency.ts http://localhost:3001     # local Docker
 *   npx ts-node scripts/test-concurrency.ts https://oont-app-production.up.railway.app  # production
 */

const BASE_URL = process.argv[2] || 'http://localhost:3001';

const NUM_USERS = 10;       // 10 users will race to buy
const STOCK_LIMIT = 3;      // but only 3 items in stock
const PRODUCT_NAME = 'Concurrency Test Item';

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.json();
  return { status: res.status, body };
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 12)}] ${msg}`);
}

function divider(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}\n`);
}

async function setup() {
  divider('SETUP: Creating test product with limited stock');

  // We need to create a product directly via the database
  // Since there's no admin API, we'll use an existing product and set its stock low
  // First, get all products
  const { body: productsRes } = await api('/products?limit=1');

  if (!productsRes.data || productsRes.data.length === 0) {
    console.error('No products found. Please seed the database first.');
    process.exit(1);
  }

  const testProduct = productsRes.data[0];
  log(`Using product: "${testProduct.name}" (ID: ${testProduct.id})`);
  log(`Current stock: ${testProduct.stock}`);

  // We'll use this product as-is. For the test, each user will request
  // quantity = Math.ceil(stock / STOCK_LIMIT) so that only STOCK_LIMIT users can succeed
  const qtyPerUser = Math.floor(testProduct.stock / STOCK_LIMIT);

  if (qtyPerUser < 1) {
    console.error(`Product stock (${testProduct.stock}) too low. Need at least ${STOCK_LIMIT}.`);
    process.exit(1);
  }

  log(`Stock: ${testProduct.stock}, Each user requests: ${qtyPerUser}`);
  log(`Max successful orders: ${Math.floor(testProduct.stock / qtyPerUser)} (${NUM_USERS} users competing)`);

  return { product: testProduct, qtyPerUser };
}

async function prepareUsers(productId: string, quantity: number) {
  divider(`PREPARE: Setting up ${NUM_USERS} user carts`);

  const userIds: string[] = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const userId = `concurrency_test_user_${i}_${Date.now()}`;
    userIds.push(userId);

    // Clear any existing cart
    await api(`/cart/${userId}`, { method: 'DELETE' }).catch(() => {});

    // Add the product to cart
    const { status, body } = await api(`/cart/${userId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });

    if (status === 201 || status === 200) {
      log(`User ${i}: Cart ready (${quantity}x item)`);
    } else {
      log(`User ${i}: Failed to set up cart - ${JSON.stringify(body)}`);
    }
  }

  return userIds;
}

async function racingCheckout(userIds: string[]) {
  divider(`RACE: ${NUM_USERS} users placing orders SIMULTANEOUSLY`);

  log('Firing all orders at the same time...\n');

  const startTime = Date.now();

  // Fire ALL orders simultaneously
  const results = await Promise.allSettled(
    userIds.map(async (userId, i) => {
      const { status, body } = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      const elapsed = Date.now() - startTime;
      return { userId, index: i, status, body, elapsed };
    })
  );

  return results;
}

function analyzeResults(
  results: PromiseSettledResult<{ userId: string; index: number; status: number; body: any; elapsed: number }>[],
  originalStock: number,
  qtyPerUser: number,
) {
  divider('RESULTS');

  let successCount = 0;
  let failCount = 0;
  let totalOrdered = 0;
  const orderIds: string[] = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      log(`User ?: NETWORK ERROR - ${result.reason}`);
      failCount++;
      continue;
    }

    const { index, status, body, elapsed } = result.value;

    if (status === 201) {
      successCount++;
      const qty = body.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
      totalOrdered += qty;
      orderIds.push(body.id);
      log(`✅ User ${index}: ORDER SUCCESS (${elapsed}ms) — Order ${body.id.slice(0, 8)}... — ${qty} items — $${Number(body.totalAmount).toFixed(2)}`);
    } else {
      failCount++;
      const msg = typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
      log(`❌ User ${index}: ORDER REJECTED (${elapsed}ms) — ${msg}`);
    }
  }

  divider('ANALYSIS');

  const maxPossible = Math.floor(originalStock / qtyPerUser);

  console.log(`  Original Stock:      ${originalStock}`);
  console.log(`  Quantity per User:   ${qtyPerUser}`);
  console.log(`  Users Competing:     ${NUM_USERS}`);
  console.log(`  Max Possible Orders: ${maxPossible}`);
  console.log();
  console.log(`  ✅ Successful Orders: ${successCount}`);
  console.log(`  ❌ Rejected Orders:   ${failCount}`);
  console.log(`  📦 Total Items Sold:  ${totalOrdered}`);
  console.log();

  if (totalOrdered <= originalStock) {
    console.log(`  🎉 CONCURRENCY TEST PASSED!`);
    console.log(`     Sold ${totalOrdered} items with ${originalStock} in stock.`);
    console.log(`     No overselling occurred. Pessimistic locking works!`);
  } else {
    console.log(`  🚨 CONCURRENCY TEST FAILED!`);
    console.log(`     Sold ${totalOrdered} items but only ${originalStock} were in stock!`);
    console.log(`     OVERSELLING DETECTED — locking is broken!`);
  }

  return orderIds;
}

async function verifyFinalStock(productId: string, originalStock: number, totalOrdered: number) {
  divider('VERIFY: Checking final stock in database');

  const { body: product } = await api(`/products/${productId}`);
  const expectedStock = originalStock - totalOrdered;

  console.log(`  Expected remaining stock: ${expectedStock}`);
  console.log(`  Actual remaining stock:   ${product.stock}`);
  console.log();

  if (product.stock === expectedStock) {
    console.log(`  ✅ Stock is correct!`);
  } else {
    console.log(`  🚨 Stock mismatch! Database inconsistency detected!`);
  }
}

async function cleanup(orderIds: string[]) {
  divider('CLEANUP: Cancelling test orders to restore stock');

  for (const orderId of orderIds) {
    const { status } = await api(`/orders/${orderId}/cancel`, { method: 'POST' });
    if (status === 200 || status === 201) {
      log(`Cancelled order ${orderId.slice(0, 8)}...`);
    }
  }

  log(`Restored stock from ${orderIds.length} orders.`);
}

async function main() {
  console.log('\n🧪 OoNt Concurrency Test');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Users: ${NUM_USERS} racing simultaneously`);

  try {
    // 1. Setup
    const { product, qtyPerUser } = await setup();

    // 2. Prepare all user carts
    const userIds = await prepareUsers(product.id, qtyPerUser);

    // 3. Race! All users checkout at the same time
    const results = await racingCheckout(userIds);

    // 4. Analyze results
    const orderIds = analyzeResults(results, product.stock, qtyPerUser);

    // 5. Verify final stock
    const totalOrdered = orderIds.length * qtyPerUser;
    await verifyFinalStock(product.id, product.stock, totalOrdered);

    // 6. Cleanup — cancel orders to restore stock
    await cleanup(orderIds);

    divider('DONE');
    console.log('  Concurrency test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

main();
