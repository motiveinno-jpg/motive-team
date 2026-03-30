# Whistle AI — Test Suite

## Escrow E2E Tests

Comprehensive end-to-end test suite for the escrow payment system. Verifies DB state transitions, cross-portal consistency, fee calculations, and edge cases.

### Prerequisites

- Node.js 18+
- `@supabase/supabase-js` package installed

```bash
cd /Users/motive/motive-team
npm install @supabase/supabase-js
```

### Running the Tests

```bash
SUPABASE_URL=https://lylktgxngrlxmsldxdqj.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
node tests/escrow-e2e-test.js
```

For verbose output (prints every passing assertion):

```bash
SUPABASE_URL=https://lylktgxngrlxmsldxdqj.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
VERBOSE=1 \
node tests/escrow-e2e-test.js
```

### Optional Environment Variables

| Variable | Description |
|---|---|
| `TEST_DEAL_ID` | Run against a specific existing deal instead of creating test orders |
| `TEST_SELLER_ID` | Seller user UUID (required with `TEST_DEAL_ID`) |
| `TEST_BUYER_ID` | Buyer user UUID (required with `TEST_DEAL_ID`) |
| `VERBOSE` | Set to `1` to print every assertion |

### What It Tests

| Suite | Description |
|---|---|
| 1. State Machine | Validates transition map: happy path, shortcuts, invalid transitions |
| 2. Role Permissions | Verifies which roles can trigger which transitions |
| 3. Happy Path DB | Full lifecycle: none -> requested -> buyer_paid -> secured -> shipping -> delivered -> release_requested -> released |
| 4. Fee Calculation | Platform fee (2.5%) arithmetic across different amounts |
| 5. Cancellation | Cancel from requested, buyer_paid, and secured stages |
| 6. Dispute Flow | Dispute from shipping, then resolution to released |
| 7. Late-Stage Dispute | Dispute from delivered and release_requested |
| 8. Refund from Dispute | Dispute resolved with full refund |
| 9. Platform Hold | Stripe auth expiry prevention: buyer_paid -> platform_hold -> released |
| 10. Platform Hold Refund | platform_hold -> refunded path |
| 11. Shortcut Path | buyer_paid -> shipping (skip explicit secured step) |
| 12. Wire Transfer | Wire payment method recording |
| 13. Multi-Currency | USD, EUR, KRW, CNY, JPY support |
| 14. Confirm Days | 7, 14, 30 day configuration options |
| 15. Cross-Portal | Seller, buyer, and admin see identical escrow data |
| 16. Auto-Release Config | Timeout constants: 3 biz days cancel, 14 days confirm, 6 days auth expiry |
| 17. Escrow Log | Transition logging to escrow_auto_log table |
| 18. Transition Completeness | No orphaned or unreachable states |
| 19. Dispute Preconditions | Dispute only allowed from shipping/delivered/release_requested/platform_hold |

### Escrow Flow Diagram

```
none
  |
  v
requested (seller)
  |         \
  v          v
buyer_paid   cancelled
  |    \
  v     v
secured  shipping (seller) ----> platform_hold (system, auth expiry)
  |        |       \               |       \
  v        v        v              v        v
shipping  delivered  disputed    released  refunded
  |        |    \       |    \
  v        v     v      v     v
delivered  release_req  released  refunded
  |    \      |    \
  v     v     v     v
release_req  disputed  released  disputed
  |
  v
released (admin/system)
```

### Key Constants

- **Platform fee**: 2.5% (`PLATFORM_FEE_RATE = 0.025`)
- **Auto-cancel unaccepted**: 3 business days
- **Auto-confirm delivery**: 14 calendar days after shipping
- **Stripe auth capture**: 6 days (before 7-day Stripe limit)

### Edge Functions Tested Against

- `escrow-transition` — Server-side state machine with role validation
- `escrow-auto-release` — Cron job for auto-cancel, auto-confirm, auth expiry capture

### DB Tables Involved

- `orders` — Primary escrow state (16 escrow columns)
- `disputes` — Dispute records for admin review
- `escrow_auto_log` — Audit trail of all transitions
- `notifications` — User notifications for status changes
- `matchings` — Deal matching metadata updates

### Cleanup

The test creates temporary orders prefixed with `TEST-ESC-` and cleans them up automatically after each suite. If a test fails mid-run, you can manually clean up:

```sql
DELETE FROM escrow_auto_log WHERE order_id IN (
  SELECT id FROM orders WHERE order_number LIKE 'TEST-ESC-%'
);
DELETE FROM orders WHERE order_number LIKE 'TEST-ESC-%';
```
