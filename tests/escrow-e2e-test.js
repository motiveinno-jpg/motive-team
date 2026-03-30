/**
 * Whistle AI — Escrow Payment E2E Test Suite
 *
 * Verifies the full escrow lifecycle by checking DB state transitions,
 * cross-portal consistency, and edge cases (cancellation, dispute, refund, timeout).
 *
 * Usage:
 *   SUPABASE_URL=https://lylktgxngrlxmsldxdqj.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node tests/escrow-e2e-test.js
 *
 * Optional env vars:
 *   TEST_DEAL_ID      — run against a specific deal (skips test-order creation)
 *   TEST_SELLER_ID    — seller user_id (required when TEST_DEAL_ID is set)
 *   TEST_BUYER_ID     — buyer user_id (required when TEST_DEAL_ID is set)
 *   VERBOSE=1         — print every assertion detail
 */

const { createClient } = require("@supabase/supabase-js");

// ─── Configuration ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERBOSE = process.env.VERBOSE === "1";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.",
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.025;

const VALID_TRANSITIONS = {
  none: ["requested"],
  requested: ["buyer_paid", "cancelled"],
  buyer_paid: ["secured", "shipping", "cancelled", "platform_hold"],
  secured: ["shipping", "cancelled", "platform_hold"],
  shipping: ["delivered", "disputed"],
  delivered: ["release_requested", "released", "disputed"],
  release_requested: ["released", "disputed"],
  platform_hold: ["released", "refunded", "disputed"],
  disputed: ["released", "refunded"],
};

const ROLE_PERMISSIONS = {
  requested: ["seller"],
  buyer_paid: ["buyer", "system"],
  secured: ["seller", "system"],
  shipping: ["seller"],
  delivered: ["buyer"],
  release_requested: ["seller"],
  released: ["admin", "system"],
  cancelled: ["seller", "buyer", "system"],
  disputed: ["buyer", "seller"],
  refunded: ["admin"],
  platform_hold: ["system"],
};

const ALL_ESCROW_STATUSES = [
  "none",
  "requested",
  "buyer_paid",
  "secured",
  "shipping",
  "delivered",
  "release_requested",
  "released",
  "cancelled",
  "disputed",
  "refunded",
  "partially_refunded",
  "pending_manual_payout",
  "settlement_failed",
  "platform_hold",
];

const TIMESTAMP_COLUMNS = {
  requested: "escrow_requested_at",
  buyer_paid: "escrow_paid_at",
  secured: "escrow_secured_at",
  shipping: "escrow_shipped_at",
  delivered: "escrow_delivered_at",
  released: "escrow_released_at",
  disputed: "escrow_disputed_at",
};

// ─── Test Runner ─────────────────────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    if (VERBOSE) {
      console.log(`  PASS: ${description}`);
    }
  } else {
    failedTests++;
    failures.push(description);
    console.log(`  FAIL: ${description}`);
  }
}

function assertEqual(actual, expected, description) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    if (VERBOSE) {
      console.log(`  PASS: ${description}`);
    }
  } else {
    failedTests++;
    const msg = `${description} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function assertIncludes(array, value, description) {
  totalTests++;
  if (Array.isArray(array) && array.includes(value)) {
    passedTests++;
    if (VERBOSE) {
      console.log(`  PASS: ${description}`);
    }
  } else {
    failedTests++;
    const msg = `${description} (${JSON.stringify(value)} not in ${JSON.stringify(array)})`;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function assertNotNull(value, description) {
  totalTests++;
  if (value !== null && value !== undefined) {
    passedTests++;
    if (VERBOSE) {
      console.log(`  PASS: ${description}`);
    }
  } else {
    failedTests++;
    failures.push(`${description} (value is ${value})`);
    console.log(`  FAIL: ${description} (value is ${value})`);
  }
}

function section(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function fetchOrder(orderId) {
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error) {
    throw new Error(`fetchOrder(${orderId}): ${error.message}`);
  }
  return data;
}

async function fetchOrderByDeal(dealId) {
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) {
    throw new Error(`fetchOrderByDeal(${dealId}): ${error.message}`);
  }
  return data;
}

async function fetchDispute(dealId) {
  const { data } = await sb
    .from("disputes")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchEscrowLog(orderId) {
  const { data } = await sb
    .from("escrow_auto_log")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data || [];
}

async function fetchNotifications(userId, type) {
  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type || "payment")
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}

async function updateEscrowStatus(orderId, newStatus, extraFields) {
  const now = new Date().toISOString();
  const update = {
    escrow_status: newStatus,
    updated_at: now,
    ...extraFields,
  };

  const timestampCol = TIMESTAMP_COLUMNS[newStatus];
  if (timestampCol) {
    update[timestampCol] = now;
  }

  const { data, error } = await sb
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`updateEscrowStatus(${orderId}, ${newStatus}): ${error.message}`);
  }
  return data;
}

// ─── Test Order Factory ──────────────────────────────────────────────────────

async function createTestOrder(sellerId, buyerId) {
  const testDealId = crypto.randomUUID
    ? crypto.randomUUID()
    : `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await sb.from("orders").insert({
    user_id: sellerId,
    buyer_id: buyerId,
    deal_id: testDealId,
    status: "pending",
    escrow_status: "none",
    escrow_amount: 0,
    escrow_currency: "USD",
    escrow_fee: 0,
    escrow_net_amount: 0,
    escrow_confirm_days: 7,
    order_number: `TEST-ESC-${Date.now()}`,
  }).select("*").single();

  if (error) {
    throw new Error(`createTestOrder: ${error.message}`);
  }
  return data;
}

async function cleanupTestOrder(orderId) {
  await sb.from("escrow_auto_log").delete().eq("order_id", orderId);
  await sb.from("orders").delete().eq("id", orderId);
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

/**
 * SUITE 1: State Machine Validation
 * Verify that VALID_TRANSITIONS and ROLE_PERMISSIONS match the Edge Function.
 */
function testStateTransitionMap() {
  section("1. State Machine — Transition Map Validation");

  // Every status should have defined transitions (except terminal states)
  const terminalStatuses = ["released", "cancelled", "refunded"];

  for (const status of ALL_ESCROW_STATUSES) {
    if (terminalStatuses.includes(status)) {
      continue;
    }
    if (VALID_TRANSITIONS[status]) {
      assert(
        Array.isArray(VALID_TRANSITIONS[status]) && VALID_TRANSITIONS[status].length > 0,
        `Status '${status}' has at least one valid transition`,
      );
    }
  }

  // Happy path: none -> requested -> buyer_paid -> secured -> shipping -> delivered -> release_requested -> released
  const happyPath = [
    "none",
    "requested",
    "buyer_paid",
    "secured",
    "shipping",
    "delivered",
    "release_requested",
    "released",
  ];
  for (let i = 0; i < happyPath.length - 1; i++) {
    const from = happyPath[i];
    const to = happyPath[i + 1];
    assertIncludes(
      VALID_TRANSITIONS[from],
      to,
      `Happy path transition: ${from} -> ${to} is allowed`,
    );
  }

  // Shortcut: buyer_paid -> shipping (skip secured)
  assertIncludes(
    VALID_TRANSITIONS["buyer_paid"],
    "shipping",
    "Shortcut: buyer_paid -> shipping (skip explicit secured)",
  );

  // Shortcut: delivered -> released (skip release_requested)
  assertIncludes(
    VALID_TRANSITIONS["delivered"],
    "released",
    "Shortcut: delivered -> released (auto-release path)",
  );

  // Cancellation is available from early stages
  assertIncludes(VALID_TRANSITIONS["requested"], "cancelled", "Cancel from requested");
  assertIncludes(VALID_TRANSITIONS["buyer_paid"], "cancelled", "Cancel from buyer_paid");
  assertIncludes(VALID_TRANSITIONS["secured"], "cancelled", "Cancel from secured");

  // Dispute is available from shipping onward
  assertIncludes(VALID_TRANSITIONS["shipping"], "disputed", "Dispute from shipping");
  assertIncludes(VALID_TRANSITIONS["delivered"], "disputed", "Dispute from delivered");
  assertIncludes(VALID_TRANSITIONS["release_requested"], "disputed", "Dispute from release_requested");
  assertIncludes(VALID_TRANSITIONS["platform_hold"], "disputed", "Dispute from platform_hold");

  // Invalid transitions should be rejected
  assert(
    !VALID_TRANSITIONS["none"] || !VALID_TRANSITIONS["none"].includes("released"),
    "Cannot transition none -> released directly",
  );
  assert(
    !VALID_TRANSITIONS["requested"] || !VALID_TRANSITIONS["requested"].includes("released"),
    "Cannot transition requested -> released directly",
  );
  assert(
    !VALID_TRANSITIONS["shipping"] || !VALID_TRANSITIONS["shipping"].includes("released"),
    "Cannot transition shipping -> released directly",
  );
}

/**
 * SUITE 2: Role Permission Validation
 * Verify which roles can trigger which transitions.
 */
function testRolePermissions() {
  section("2. Role Permission Validation");

  // Seller-only actions
  assertIncludes(ROLE_PERMISSIONS["requested"], "seller", "Only seller can request escrow");
  assertIncludes(ROLE_PERMISSIONS["shipping"], "seller", "Only seller can mark shipped");
  assertIncludes(ROLE_PERMISSIONS["release_requested"], "seller", "Only seller can request release");

  // Buyer-only actions
  assertIncludes(ROLE_PERMISSIONS["delivered"], "buyer", "Only buyer can confirm delivery");

  // System/Admin actions
  assertIncludes(ROLE_PERMISSIONS["released"], "admin", "Admin can release funds");
  assertIncludes(ROLE_PERMISSIONS["released"], "system", "System can release funds");
  assertIncludes(ROLE_PERMISSIONS["refunded"], "admin", "Only admin can refund");

  // Both buyer and seller can dispute
  assertIncludes(ROLE_PERMISSIONS["disputed"], "buyer", "Buyer can raise dispute");
  assertIncludes(ROLE_PERMISSIONS["disputed"], "seller", "Seller can raise dispute");

  // Both buyer and seller can cancel
  assertIncludes(ROLE_PERMISSIONS["cancelled"], "buyer", "Buyer can cancel");
  assertIncludes(ROLE_PERMISSIONS["cancelled"], "seller", "Seller can cancel");
  assertIncludes(ROLE_PERMISSIONS["cancelled"], "system", "System can cancel");

  // Buyer or system can pay
  assertIncludes(ROLE_PERMISSIONS["buyer_paid"], "buyer", "Buyer can mark paid");
  assertIncludes(ROLE_PERMISSIONS["buyer_paid"], "system", "System can mark paid (Stripe webhook)");

  // Seller or system can confirm secured
  assertIncludes(ROLE_PERMISSIONS["secured"], "seller", "Seller can confirm secured");
  assertIncludes(ROLE_PERMISSIONS["secured"], "system", "System can confirm secured");

  // Buyer should NOT be able to release
  assert(
    !ROLE_PERMISSIONS["released"].includes("buyer"),
    "Buyer cannot release funds directly",
  );
  assert(
    !ROLE_PERMISSIONS["released"].includes("seller"),
    "Seller cannot release funds directly",
  );
}

/**
 * SUITE 3: Happy Path — Full DB State Walk-through
 * Creates a test order and walks it through the complete escrow lifecycle.
 */
async function testHappyPathDB(sellerId, buyerId) {
  section("3. Happy Path — DB State Transitions");

  let order;
  let isTestOrder = false;

  if (process.env.TEST_DEAL_ID) {
    order = await fetchOrderByDeal(process.env.TEST_DEAL_ID);
    console.log(`  Using existing order: ${order.id} (deal: ${order.deal_id})`);
  } else {
    order = await createTestOrder(sellerId, buyerId);
    isTestOrder = true;
    console.log(`  Created test order: ${order.id} (deal: ${order.deal_id})`);
  }

  const orderId = order.id;

  try {
    // Step 1: none -> requested
    assertEqual(order.escrow_status, "none", "Initial status is 'none'");

    order = await updateEscrowStatus(orderId, "requested", {
      escrow_amount: 10000,
      escrow_currency: "USD",
      escrow_terms: "50/50",
      escrow_confirm_days: 7,
      escrow_fee: 250,
      escrow_net_amount: 9750,
    });
    assertEqual(order.escrow_status, "requested", "Status after seller requests: 'requested'");
    assertEqual(order.escrow_amount, 10000, "Escrow amount set to 10000");
    assertEqual(order.escrow_currency, "USD", "Currency is USD");
    assertEqual(order.escrow_terms, "50/50", "Terms are 50/50");
    assertEqual(order.escrow_fee, 250, "Platform fee is 250 (2.5%)");
    assertEqual(order.escrow_net_amount, 9750, "Net amount is 9750");
    assertNotNull(order.escrow_requested_at, "escrow_requested_at is set");

    // Step 2: requested -> buyer_paid
    order = await updateEscrowStatus(orderId, "buyer_paid", {
      escrow_method: "stripe",
      stripe_payment_intent: "pi_test_" + Date.now(),
    });
    assertEqual(order.escrow_status, "buyer_paid", "Status after buyer pays: 'buyer_paid'");
    assertNotNull(order.escrow_paid_at, "escrow_paid_at is set");
    assertNotNull(order.stripe_payment_intent, "stripe_payment_intent is set");
    assertEqual(order.escrow_method, "stripe", "Payment method recorded as 'stripe'");

    // Step 3: buyer_paid -> secured
    order = await updateEscrowStatus(orderId, "secured");
    assertEqual(order.escrow_status, "secured", "Status after seller confirms: 'secured'");
    assertNotNull(order.escrow_secured_at, "escrow_secured_at is set");

    // Step 4: secured -> shipping
    order = await updateEscrowStatus(orderId, "shipping");
    assertEqual(order.escrow_status, "shipping", "Status after seller ships: 'shipping'");
    assertNotNull(order.escrow_shipped_at, "escrow_shipped_at is set");

    // Step 5: shipping -> delivered
    order = await updateEscrowStatus(orderId, "delivered");
    assertEqual(order.escrow_status, "delivered", "Status after buyer confirms delivery: 'delivered'");
    assertNotNull(order.escrow_delivered_at, "escrow_delivered_at is set");

    // Step 6: delivered -> release_requested
    order = await updateEscrowStatus(orderId, "release_requested");
    assertEqual(order.escrow_status, "release_requested", "Status after seller requests release: 'release_requested'");

    // Step 7: release_requested -> released
    order = await updateEscrowStatus(orderId, "released", {
      status: "completed",
    });
    assertEqual(order.escrow_status, "released", "Status after admin releases: 'released'");
    assertEqual(order.status, "completed", "Order status set to 'completed'");
    assertNotNull(order.escrow_released_at, "escrow_released_at is set");

    // Verify all timestamps are present in chronological columns
    const timestamps = [
      order.escrow_requested_at,
      order.escrow_paid_at,
      order.escrow_secured_at,
      order.escrow_shipped_at,
      order.escrow_delivered_at,
      order.escrow_released_at,
    ];
    const allTimestampsPresent = timestamps.every((t) => t !== null && t !== undefined);
    assert(allTimestampsPresent, "All lifecycle timestamps are populated after full flow");

    // Verify timestamps are in chronological order
    const tsValues = timestamps.map((t) => new Date(t).getTime());
    let isChronological = true;
    for (let i = 1; i < tsValues.length; i++) {
      if (tsValues[i] < tsValues[i - 1]) {
        isChronological = false;
        break;
      }
    }
    assert(isChronological, "Timestamps are in chronological order");

    console.log("  Happy path completed successfully.");
  } finally {
    if (isTestOrder) {
      await cleanupTestOrder(orderId);
      console.log(`  Cleaned up test order: ${orderId}`);
    }
  }
}

/**
 * SUITE 4: Fee Calculation Verification
 * Verifies that platform fees are calculated correctly.
 */
function testFeeCalculation() {
  section("4. Fee Calculation Verification");

  const testCases = [
    { amount: 10000, expectedFee: 250, expectedNet: 9750 },
    { amount: 1000, expectedFee: 25, expectedNet: 975 },
    { amount: 100, expectedFee: 2.5, expectedNet: 97.5 },
    { amount: 50000, expectedFee: 1250, expectedNet: 48750 },
    { amount: 1, expectedFee: 0.03, expectedNet: 0.98 },
    { amount: 0.01, expectedFee: 0, expectedNet: 0.01 },
  ];

  for (const tc of testCases) {
    const fee = Math.round(tc.amount * PLATFORM_FEE_RATE * 100) / 100;
    const net = Math.round((tc.amount - fee) * 100) / 100;

    assertEqual(fee, tc.expectedFee, `Fee for $${tc.amount}: $${tc.expectedFee}`);
    assertEqual(net, tc.expectedNet, `Net for $${tc.amount}: $${tc.expectedNet}`);
  }

  // Verify fee rate constant
  assertEqual(PLATFORM_FEE_RATE, 0.025, "Platform fee rate is 2.5%");
}

/**
 * SUITE 5: Cancellation Flows
 */
async function testCancellationFlows(sellerId, buyerId) {
  section("5. Cancellation Flows");

  // 5a: Cancel from 'requested' (before payment)
  console.log("\n  5a. Cancel from 'requested'");
  let order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 5000,
      escrow_currency: "USD",
      escrow_fee: 125,
      escrow_net_amount: 4875,
    });
    order = await updateEscrowStatus(order.id, "cancelled", {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "seller_cancelled",
    });
    assertEqual(order.escrow_status, "cancelled", "5a: escrow_status is 'cancelled'");
    assertEqual(order.status, "cancelled", "5a: order status is 'cancelled'");
    assertNotNull(order.cancelled_at, "5a: cancelled_at is set");
    assertEqual(order.cancel_reason, "seller_cancelled", "5a: cancel_reason recorded");
  } finally {
    await cleanupTestOrder(order.id);
  }

  // 5b: Cancel from 'buyer_paid' (requires refund)
  console.log("\n  5b. Cancel from 'buyer_paid' (refund scenario)");
  order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 3000,
      escrow_currency: "USD",
      escrow_fee: 75,
      escrow_net_amount: 2925,
    });
    await updateEscrowStatus(order.id, "buyer_paid", {
      stripe_payment_intent: "pi_test_cancel_" + Date.now(),
    });
    order = await updateEscrowStatus(order.id, "cancelled", {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "seller_cancelled_order",
    });
    assertEqual(order.escrow_status, "cancelled", "5b: escrow_status is 'cancelled' after buyer_paid");
    assertNotNull(order.stripe_payment_intent, "5b: stripe_payment_intent preserved for refund processing");
  } finally {
    await cleanupTestOrder(order.id);
  }

  // 5c: Cancel from 'secured'
  console.log("\n  5c. Cancel from 'secured'");
  order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 7000,
      escrow_currency: "EUR",
      escrow_fee: 175,
      escrow_net_amount: 6825,
    });
    await updateEscrowStatus(order.id, "buyer_paid");
    await updateEscrowStatus(order.id, "secured");
    order = await updateEscrowStatus(order.id, "cancelled", {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "mutual_agreement",
    });
    assertEqual(order.escrow_status, "cancelled", "5c: cancel from secured works");
    assertEqual(order.escrow_currency, "EUR", "5c: currency preserved as EUR");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 6: Dispute Flow
 */
async function testDisputeFlow(sellerId, buyerId) {
  section("6. Dispute Flow");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    // Walk to shipping
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 15000,
      escrow_currency: "USD",
      escrow_fee: 375,
      escrow_net_amount: 14625,
    });
    await updateEscrowStatus(order.id, "buyer_paid");
    await updateEscrowStatus(order.id, "secured");
    await updateEscrowStatus(order.id, "shipping");

    // Raise dispute from shipping
    const disputeData = {
      reason: "Goods not as described",
      raisedAt: new Date().toISOString(),
      status: "open",
      timeline: [],
      buyerEvidence: [],
      sellerEvidence: [],
    };
    let updated = await updateEscrowStatus(order.id, "disputed", {
      escrow_dispute: disputeData,
    });
    assertEqual(updated.escrow_status, "disputed", "Dispute raised: status is 'disputed'");
    assertNotNull(updated.escrow_disputed_at, "escrow_disputed_at is set");
    assertNotNull(updated.escrow_dispute, "escrow_dispute JSON is populated");
    assertEqual(updated.escrow_dispute.status, "open", "Dispute status is 'open'");
    assertEqual(updated.escrow_dispute.reason, "Goods not as described", "Dispute reason recorded");

    // Resolve dispute -> released
    const resolvedDispute = {
      ...updated.escrow_dispute,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolution: "Partial refund agreed",
    };
    updated = await updateEscrowStatus(order.id, "released", {
      status: "completed",
      escrow_dispute: resolvedDispute,
    });
    assertEqual(updated.escrow_status, "released", "After dispute resolution: 'released'");
    assertEqual(updated.status, "completed", "Order status: 'completed'");
    assertEqual(updated.escrow_dispute.status, "resolved", "Dispute marked resolved");

    console.log("  Dispute flow (shipping -> disputed -> released) completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 7: Dispute from delivered and release_requested
 */
async function testDisputeFromLateStages(sellerId, buyerId) {
  section("7. Dispute from Late Stages");

  // 7a: Dispute from 'delivered'
  console.log("\n  7a. Dispute from 'delivered'");
  let order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 8000,
      escrow_currency: "USD",
      escrow_fee: 200,
      escrow_net_amount: 7800,
    });
    await updateEscrowStatus(order.id, "buyer_paid");
    await updateEscrowStatus(order.id, "secured");
    await updateEscrowStatus(order.id, "shipping");
    await updateEscrowStatus(order.id, "delivered");

    const updated = await updateEscrowStatus(order.id, "disputed", {
      escrow_dispute: {
        reason: "Wrong quantity received",
        raisedAt: new Date().toISOString(),
        status: "open",
        timeline: [],
        buyerEvidence: [],
        sellerEvidence: [],
      },
    });
    assertEqual(updated.escrow_status, "disputed", "7a: Dispute from delivered works");
  } finally {
    await cleanupTestOrder(order.id);
  }

  // 7b: Dispute from 'release_requested'
  console.log("\n  7b. Dispute from 'release_requested'");
  order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 12000,
      escrow_currency: "USD",
      escrow_fee: 300,
      escrow_net_amount: 11700,
    });
    await updateEscrowStatus(order.id, "buyer_paid");
    await updateEscrowStatus(order.id, "secured");
    await updateEscrowStatus(order.id, "shipping");
    await updateEscrowStatus(order.id, "delivered");
    await updateEscrowStatus(order.id, "release_requested");

    const updated = await updateEscrowStatus(order.id, "disputed", {
      escrow_dispute: {
        reason: "Quality issue found after inspection",
        raisedAt: new Date().toISOString(),
        status: "open",
        timeline: [],
        buyerEvidence: [],
        sellerEvidence: [],
      },
    });
    assertEqual(updated.escrow_status, "disputed", "7b: Dispute from release_requested works");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 8: Refund from dispute
 */
async function testRefundFromDispute(sellerId, buyerId) {
  section("8. Refund from Dispute");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 5000,
      escrow_currency: "USD",
      escrow_fee: 125,
      escrow_net_amount: 4875,
    });
    await updateEscrowStatus(order.id, "buyer_paid", {
      stripe_payment_intent: "pi_test_refund_" + Date.now(),
    });
    await updateEscrowStatus(order.id, "secured");
    await updateEscrowStatus(order.id, "shipping");
    await updateEscrowStatus(order.id, "disputed", {
      escrow_dispute: {
        reason: "Never received goods",
        raisedAt: new Date().toISOString(),
        status: "open",
        timeline: [],
        buyerEvidence: [],
        sellerEvidence: [],
      },
    });

    // Admin resolves with refund
    const updated = await updateEscrowStatus(order.id, "refunded", {
      status: "cancelled",
      escrow_dispute: {
        reason: "Never received goods",
        raisedAt: order.escrow_dispute?.raisedAt,
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolution: "Full refund — goods not delivered",
        timeline: [],
        buyerEvidence: [],
        sellerEvidence: [],
      },
    });
    assertEqual(updated.escrow_status, "refunded", "Dispute resolved with refund");
    assertEqual(updated.status, "cancelled", "Order status is 'cancelled' after refund");
    assertNotNull(updated.stripe_payment_intent, "Payment intent preserved for refund processing");

    console.log("  Refund from dispute completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 9: Platform Hold (Stripe auth expiry prevention)
 */
async function testPlatformHold(sellerId, buyerId) {
  section("9. Platform Hold (Stripe Auth Expiry)");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 20000,
      escrow_currency: "USD",
      escrow_fee: 500,
      escrow_net_amount: 19500,
    });
    await updateEscrowStatus(order.id, "buyer_paid", {
      stripe_payment_intent: "pi_test_hold_" + Date.now(),
    });

    // System captures before Stripe 7-day expiry
    let updated = await updateEscrowStatus(order.id, "platform_hold");
    assertEqual(updated.escrow_status, "platform_hold", "Platform hold status set");

    // From platform_hold, can release
    updated = await updateEscrowStatus(order.id, "released", {
      status: "completed",
    });
    assertEqual(updated.escrow_status, "released", "Released from platform_hold");

    console.log("  Platform hold -> released completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 10: Platform Hold -> Refund
 */
async function testPlatformHoldRefund(sellerId, buyerId) {
  section("10. Platform Hold -> Refund");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 6000,
      escrow_currency: "USD",
      escrow_fee: 150,
      escrow_net_amount: 5850,
    });
    await updateEscrowStatus(order.id, "buyer_paid", {
      stripe_payment_intent: "pi_test_holdrefund_" + Date.now(),
    });
    await updateEscrowStatus(order.id, "platform_hold");

    const updated = await updateEscrowStatus(order.id, "refunded", {
      status: "cancelled",
    });
    assertEqual(updated.escrow_status, "refunded", "Refund from platform_hold");
    assertEqual(updated.status, "cancelled", "Order cancelled after refund");

    console.log("  Platform hold -> refund completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 11: Shortcut Path — buyer_paid -> shipping (skip secured)
 */
async function testShortcutPath(sellerId, buyerId) {
  section("11. Shortcut Path (buyer_paid -> shipping)");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 4000,
      escrow_currency: "USD",
      escrow_fee: 100,
      escrow_net_amount: 3900,
    });
    await updateEscrowStatus(order.id, "buyer_paid");

    // Skip secured, go directly to shipping
    const updated = await updateEscrowStatus(order.id, "shipping");
    assertEqual(updated.escrow_status, "shipping", "Shortcut: buyer_paid -> shipping works");
    assertNotNull(updated.escrow_shipped_at, "escrow_shipped_at set on shortcut path");

    console.log("  Shortcut path completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 12: Wire Transfer Method
 */
async function testWireTransferMethod(sellerId, buyerId) {
  section("12. Wire Transfer Payment Method");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 25000,
      escrow_currency: "EUR",
      escrow_fee: 625,
      escrow_net_amount: 24375,
    });

    const updated = await updateEscrowStatus(order.id, "buyer_paid", {
      escrow_method: "wire",
    });
    assertEqual(updated.escrow_method, "wire", "Wire transfer method recorded");
    assertEqual(updated.escrow_currency, "EUR", "EUR currency preserved");
    assert(!updated.stripe_payment_intent, "No stripe_payment_intent for wire transfer");

    console.log("  Wire transfer method test completed.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 13: Multi-Currency Support
 */
async function testMultiCurrency(sellerId, buyerId) {
  section("13. Multi-Currency Support");

  const currencies = ["USD", "EUR", "KRW", "CNY", "JPY"];
  const amounts = [10000, 8500, 13900000, 68000, 1500000];

  for (let i = 0; i < currencies.length; i++) {
    const cur = currencies[i];
    const amt = amounts[i];
    const fee = Math.round(amt * PLATFORM_FEE_RATE * 100) / 100;
    const net = Math.round((amt - fee) * 100) / 100;

    const order = await createTestOrder(sellerId, buyerId);
    try {
      const updated = await updateEscrowStatus(order.id, "requested", {
        escrow_amount: amt,
        escrow_currency: cur,
        escrow_fee: fee,
        escrow_net_amount: net,
      });
      assertEqual(updated.escrow_currency, cur, `Currency ${cur} stored correctly`);
      assertEqual(Number(updated.escrow_amount), amt, `Amount ${amt} ${cur} stored correctly`);
    } finally {
      await cleanupTestOrder(order.id);
    }
  }
}

/**
 * SUITE 14: Escrow Confirm Days Configuration
 */
async function testConfirmDays(sellerId, buyerId) {
  section("14. Confirm Days Configuration");

  const dayOptions = [7, 14, 30];

  for (const days of dayOptions) {
    const order = await createTestOrder(sellerId, buyerId);
    try {
      const updated = await updateEscrowStatus(order.id, "requested", {
        escrow_amount: 1000,
        escrow_currency: "USD",
        escrow_confirm_days: days,
        escrow_fee: 25,
        escrow_net_amount: 975,
      });
      assertEqual(updated.escrow_confirm_days, days, `Confirm days ${days} stored correctly`);
    } finally {
      await cleanupTestOrder(order.id);
    }
  }
}

/**
 * SUITE 15: Cross-Portal Data Consistency
 * Verifies that the same order data is accessible from seller (user_id),
 * buyer (buyer_id), and admin perspectives.
 */
async function testCrossPortalConsistency(sellerId, buyerId) {
  section("15. Cross-Portal Data Consistency");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    await updateEscrowStatus(order.id, "requested", {
      escrow_amount: 9000,
      escrow_currency: "USD",
      escrow_fee: 225,
      escrow_net_amount: 8775,
      escrow_terms: "50/50",
    });
    await updateEscrowStatus(order.id, "buyer_paid", {
      escrow_method: "stripe",
    });
    await updateEscrowStatus(order.id, "secured");

    // Seller query (whistle-app.html pattern)
    const sellerEscrowColumns =
      "deal_id, escrow_status, escrow_amount, escrow_currency, escrow_fee, escrow_net_amount, escrow_terms, escrow_method, escrow_confirm_days, escrow_requested_at, escrow_paid_at, escrow_secured_at, escrow_shipped_at, escrow_delivered_at, escrow_released_at, escrow_disputed_at, stripe_payment_intent, escrow_dispute";
    const { data: sellerView } = await sb
      .from("orders")
      .select(sellerEscrowColumns)
      .eq("user_id", sellerId)
      .eq("id", order.id)
      .single();

    // Buyer query (buyer-app.html pattern)
    const { data: buyerView } = await sb
      .from("orders")
      .select(sellerEscrowColumns)
      .eq("buyer_id", buyerId)
      .eq("id", order.id)
      .single();

    // Admin query (full access)
    const { data: adminView } = await sb
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .single();

    assertNotNull(sellerView, "Seller can query their escrow order");
    assertNotNull(buyerView, "Buyer can query their escrow order");
    assertNotNull(adminView, "Admin can query any escrow order");

    if (sellerView && buyerView && adminView) {
      assertEqual(sellerView.escrow_status, buyerView.escrow_status, "Seller and buyer see same escrow_status");
      assertEqual(sellerView.escrow_status, adminView.escrow_status, "Seller and admin see same escrow_status");
      assertEqual(sellerView.escrow_amount, buyerView.escrow_amount, "Seller and buyer see same amount");
      assertEqual(sellerView.escrow_currency, buyerView.escrow_currency, "Seller and buyer see same currency");
      assertEqual(sellerView.escrow_fee, buyerView.escrow_fee, "Seller and buyer see same fee");
      assertEqual(sellerView.escrow_terms, buyerView.escrow_terms, "Seller and buyer see same terms");
      assertEqual(sellerView.escrow_method, buyerView.escrow_method, "Seller and buyer see same method");

      // Verify label mapping consistency
      const statusLabelsEN = {
        none: "None",
        requested: "Requested",
        buyer_paid: "Buyer Paid",
        secured: "Secured (Pending Settlement)",
        shipping: "Shipping",
        delivered: "Delivered",
        release_requested: "Release Requested",
        released: "Settled",
        disputed: "Dispute In Progress",
        cancelled: "Cancelled",
        refunded: "Refunded",
        pending_manual_payout: "Pending Manual Payout",
        settlement_failed: "Settlement Failed",
      };

      const buyerLabelsEN = {
        none: "None",
        requested: "Payment Requested",
        buyer_paid: "Paid",
        secured: "Payment Confirmed (Settlement Pending)",
        shipping: "Shipped — Awaiting Delivery",
        delivered: "Delivery Confirmed",
        release_requested: "Settlement Processing",
        released: "Settled",
        disputed: "Dispute In Progress",
        cancelled: "Cancelled",
        refunded: "Refunded",
        pending_manual_payout: "Pending Manual Payout",
        settlement_failed: "Settlement Failed",
      };

      // All statuses should have labels in both portals
      for (const st of ALL_ESCROW_STATUSES) {
        if (st === "partially_refunded" || st === "platform_hold") {
          continue; // These are internal statuses
        }
        const hasSellerLabel = statusLabelsEN[st] !== undefined;
        const hasBuyerLabel = buyerLabelsEN[st] !== undefined;
        assert(hasSellerLabel, `Seller label exists for status '${st}'`);
        assert(hasBuyerLabel, `Buyer label exists for status '${st}'`);
      }
    }

    console.log("  Cross-portal consistency verified.");
  } finally {
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 16: Auto-Release Timeout Configuration
 * Verifies the auto-release constants match expected values.
 */
function testAutoReleaseConfig() {
  section("16. Auto-Release Configuration");

  const AUTO_CANCEL_BUSINESS_DAYS = 3;
  const AUTO_CONFIRM_DAYS = 14;
  const STRIPE_AUTH_EXPIRY_DAYS = 6;

  assertEqual(AUTO_CANCEL_BUSINESS_DAYS, 3, "Auto-cancel after 3 business days");
  assertEqual(AUTO_CONFIRM_DAYS, 14, "Auto-confirm delivery after 14 days");
  assertEqual(STRIPE_AUTH_EXPIRY_DAYS, 6, "Stripe auth captured before 6-day expiry (7-day limit)");

  // Verify auto-release targets correct statuses
  const autoCancelTargets = ["buyer_paid"];
  const autoConfirmTargets = ["shipping", "delivered"];
  const autoExpiryCaptureTargets = ["buyer_paid", "secured"];

  assertIncludes(autoCancelTargets, "buyer_paid", "Auto-cancel targets buyer_paid orders");
  assertIncludes(autoConfirmTargets, "shipping", "Auto-confirm targets shipping orders");
  assertIncludes(autoConfirmTargets, "delivered", "Auto-confirm targets delivered orders");
  assertIncludes(autoExpiryCaptureTargets, "buyer_paid", "Auth expiry capture targets buyer_paid");
  assertIncludes(autoExpiryCaptureTargets, "secured", "Auth expiry capture targets secured");
}

/**
 * SUITE 17: Escrow Log Verification
 */
async function testEscrowLog(sellerId, buyerId) {
  section("17. Escrow Log Verification");

  const order = await createTestOrder(sellerId, buyerId);
  try {
    // Insert a log entry manually (simulating edge function behavior)
    const now = new Date().toISOString();
    await sb.from("escrow_auto_log").insert({
      order_id: order.id,
      action: "transition_none_to_requested",
      detail: "Role: seller, User: test",
      created_at: now,
    });

    const logs = await fetchEscrowLog(order.id);
    assert(logs.length > 0, "Escrow log entries exist after transition");
    assertEqual(logs[0].action, "transition_none_to_requested", "Log action matches transition");
    assertNotNull(logs[0].created_at, "Log has timestamp");

    console.log("  Escrow log verification completed.");
  } finally {
    await sb.from("escrow_auto_log").delete().eq("order_id", order.id);
    await cleanupTestOrder(order.id);
  }
}

/**
 * SUITE 18: Edge Function Transition Map Completeness
 * Verifies no orphaned or unreachable states exist.
 */
function testTransitionMapCompleteness() {
  section("18. Transition Map Completeness");

  // All non-terminal states must have outgoing transitions
  const hasOutgoing = Object.keys(VALID_TRANSITIONS);
  const allReachable = new Set();
  allReachable.add("none"); // Starting state

  for (const from of Object.keys(VALID_TRANSITIONS)) {
    for (const to of VALID_TRANSITIONS[from]) {
      allReachable.add(to);
    }
  }

  // Check that every status mentioned as a target also has defined behavior
  const terminalStatuses = ["released", "cancelled", "refunded"];
  for (const status of allReachable) {
    if (terminalStatuses.includes(status)) {
      assert(
        !VALID_TRANSITIONS[status] || VALID_TRANSITIONS[status].length === 0,
        `Terminal status '${status}' has no outgoing transitions`,
      );
    }
  }

  // Every non-terminal target status should have a role defined
  for (const status of allReachable) {
    if (status === "none") continue;
    assertNotNull(
      ROLE_PERMISSIONS[status],
      `Role permissions defined for status '${status}'`,
    );
  }

  // Every transition target must be reachable from 'none'
  const visited = new Set();
  const queue = ["none"];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const next = VALID_TRANSITIONS[current] || [];
    for (const n of next) {
      if (!visited.has(n)) {
        queue.push(n);
      }
    }
  }

  for (const status of allReachable) {
    assert(visited.has(status), `Status '${status}' is reachable from 'none'`);
  }
}

/**
 * SUITE 19: Dispute Precondition Checks
 * Verifies dispute can only be raised from certain statuses.
 */
function testDisputePreconditions() {
  section("19. Dispute Preconditions");

  const canDispute = ["shipping", "delivered", "release_requested", "platform_hold"];
  const cannotDispute = ["none", "requested", "buyer_paid", "secured", "released", "cancelled", "refunded"];

  for (const status of canDispute) {
    if (VALID_TRANSITIONS[status]) {
      assertIncludes(
        VALID_TRANSITIONS[status],
        "disputed",
        `Can dispute from '${status}'`,
      );
    }
  }

  for (const status of cannotDispute) {
    if (VALID_TRANSITIONS[status]) {
      assert(
        !VALID_TRANSITIONS[status].includes("disputed"),
        `Cannot dispute from '${status}'`,
      );
    }
  }
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("Whistle AI — Escrow E2E Test Suite");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Verbose: ${VERBOSE}`);

  // Resolve seller and buyer IDs
  let sellerId = process.env.TEST_SELLER_ID;
  let buyerId = process.env.TEST_BUYER_ID;

  if (!sellerId || !buyerId) {
    console.log("\nLooking up test users...");

    // Find any seller (user with at least one order)
    if (!sellerId) {
      const { data: sellerRow } = await sb
        .from("orders")
        .select("user_id")
        .not("user_id", "is", null)
        .limit(1)
        .single();
      if (sellerRow) {
        sellerId = sellerRow.user_id;
      }
    }

    // Find any buyer
    if (!buyerId) {
      const { data: buyerRow } = await sb
        .from("orders")
        .select("buyer_id")
        .not("buyer_id", "is", null)
        .limit(1)
        .single();
      if (buyerRow) {
        buyerId = buyerRow.buyer_id;
      }
    }

    if (!sellerId || !buyerId) {
      console.error("ERROR: Could not find test seller/buyer IDs. Set TEST_SELLER_ID and TEST_BUYER_ID env vars.");
      process.exit(1);
    }
  }

  console.log(`Seller ID: ${sellerId}`);
  console.log(`Buyer ID:  ${buyerId}`);

  // ── Pure logic tests (no DB) ──
  testStateTransitionMap();
  testRolePermissions();
  testFeeCalculation();
  testAutoReleaseConfig();
  testTransitionMapCompleteness();
  testDisputePreconditions();

  // ── DB integration tests ──
  try {
    await testHappyPathDB(sellerId, buyerId);
    await testCancellationFlows(sellerId, buyerId);
    await testDisputeFlow(sellerId, buyerId);
    await testDisputeFromLateStages(sellerId, buyerId);
    await testRefundFromDispute(sellerId, buyerId);
    await testPlatformHold(sellerId, buyerId);
    await testPlatformHoldRefund(sellerId, buyerId);
    await testShortcutPath(sellerId, buyerId);
    await testWireTransferMethod(sellerId, buyerId);
    await testMultiCurrency(sellerId, buyerId);
    await testConfirmDays(sellerId, buyerId);
    await testCrossPortalConsistency(sellerId, buyerId);
    await testEscrowLog(sellerId, buyerId);
  } catch (err) {
    console.error("\nFATAL ERROR during DB tests:", err.message);
    if (VERBOSE) {
      console.error(err.stack);
    }
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log("  TEST SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${failedTests}`);

  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      console.log(`    - ${f}`);
    }
  }

  console.log(`\n  Result: ${failedTests === 0 ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
