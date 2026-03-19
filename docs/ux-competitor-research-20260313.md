# B2B Export Platform UX Research — Competitor Analysis
**Date**: 2026-03-13
**Purpose**: Actionable UX patterns from 10 top platforms → Whistle AI implementation

---

## 1. ALIBABA.COM — Inquiry System + Trust Architecture

### What They Do Exceptionally Well
**Multi-layered Trust Badges**: Every product card stacks 3-4 trust signals — Verified Manufacturer badge (168x42px), Trade Assurance shield, Gold Supplier years, Response Rate percentage. These are NOT hidden — they occupy ~30% of each product card's visual real estate.

**Dual-Mode Search**: Products tab + Manufacturers tab in the same search bar. Users searching "electronics" can instantly pivot from product browsing to factory sourcing.

**RFQ as First-Class CTA**: "Request for Quotation" is placed above the fold with the description "Post customized sourcing requirements to get quotes." It's not buried in a menu — it's a primary conversion path equal to search.

### Whistle Implementation

```css
/* Trust Badge Stack — vertical badge column on supplier cards */
.supplier-card .trust-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: absolute;
  top: 8px;
  right: 8px;
}
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-verified { background: #e8f5e9; color: #2e7d32; }
.badge-escrow { background: #e3f2fd; color: #1565c0; }
.badge-voucher { background: #fff3e0; color: #e65100; }
.badge-response { background: #f3e5f5; color: #7b1fa2; }
```

**Specific Actions for Whistle**:
1. Add response rate badge to manufacturer profiles: "평균 응답 시간: 2시간" with a colored dot (green <4h, yellow <24h, red >24h)
2. Add "수출바우처 수행기관" badge as a Korean-exclusive trust signal — no competitor has this
3. Place RFQ/Inquiry button at the SAME visual weight as Search — not hidden in a submenu
4. Implement dual-tab search: "제조사 검색" | "제품 검색" toggle in the search bar

---

## 2. GLOBAL SOURCES — Supplier Verification Tiers

### What They Do Exceptionally Well
**Tiered Verification System**: Instead of binary "verified/not verified," they use graduated levels — Checked Supplier → Verified → Audited → with different badge colors and detail depth at each tier. This creates aspiration for suppliers to upgrade.

**RFQ with Specificity Templates**: Their RFQ forms pre-populate with industry-specific fields (for electronics: voltage, certification, packaging type) rather than generic text boxes.

### Whistle Implementation

**Specific Actions**:
1. Create 3-tier manufacturer verification: Basic (자가인증) → Verified (서류확인) → Premium (현장실사)
```html
<!-- Verification tier indicator -->
<div class="verification-tier tier-3">
  <div class="tier-bar active"></div>
  <div class="tier-bar active"></div>
  <div class="tier-bar active"></div>
  <span>Premium 인증 제조사</span>
</div>
```
```css
.verification-tier {
  display: flex;
  align-items: center;
  gap: 3px;
}
.tier-bar {
  width: 20px;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
}
.tier-bar.active { background: #4caf50; }
.tier-1 .tier-bar:nth-child(n+2) { background: #e0e0e0; }
.tier-2 .tier-bar:nth-child(3) { background: #e0e0e0; }
```

2. Build industry-specific inquiry templates: when a buyer selects "식품" category, the inquiry form auto-adds fields for HACCP, 유통기한, 포장단위, FDA 필요 여부

---

## 3. INDIAMART — Lead Funnel UX

### What They Do Exceptionally Well
**3-Step Value Prop Above Form**: "Tell us what You Need" → "Receive free quotes from sellers" → "Seal the Deal" — displayed directly above the inquiry form, not on a separate page. This sets expectations before engagement.

**No Pricing Displayed**: Forces every interaction through quotation request, maximizing lead capture. Every product page is a lead generation page.

**Repeated CTA Placement**: The "Tell Us What You Are Looking For" form appears at the TOP of the page AND is repeated mid-scroll AND at footer. The same form, 3 times per page.

### Whistle Implementation

**Specific Actions**:
1. Add a persistent bottom-bar inquiry CTA on all manufacturer profile pages:
```css
/* Sticky bottom inquiry bar */
.sticky-inquiry-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}
.sticky-inquiry-bar .manufacturer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sticky-inquiry-bar .cta-group {
  display: flex;
  gap: 8px;
}
```

2. Implement the 3-step visual pipeline on the buyer landing page:
```css
.value-steps {
  display: flex;
  justify-content: center;
  gap: 0;
  margin: 32px 0;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  position: relative;
}
.step:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -12px;
  top: 20px;
  width: 24px;
  height: 2px;
  background: #3b82f6;
}
.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}
```

---

## 4. FLEXPORT — Logistics Dashboard + Document Management

### What They Do Exceptionally Well
**Stepper/Progress Tracking**: Shipment status uses a horizontal stepper component showing: Booked → Picked Up → In Transit → Customs → Delivered. Each step shows date and responsible party.

**12-Column Grid System**: Dense data presentation with responsive breakpoints at 1024px and 1280px. Forms use validation states (error/success/focus) with clear visual distinction.

**Document-Centric Design**: Every shipment has a "Documents" tab that lists all required docs with status (uploaded/pending/rejected) and version history.

### Whistle Implementation

**Specific Actions**:
1. Build a shipment/deal stepper component:
```css
/* Deal progress stepper */
.deal-stepper {
  display: flex;
  align-items: flex-start;
  padding: 16px 0;
  overflow-x: auto;
}
.deal-step {
  flex: 1;
  min-width: 120px;
  text-align: center;
  position: relative;
}
.deal-step::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  height: 2px;
  background: #e0e0e0;
}
.deal-step.completed::before { background: #4caf50; }
.deal-step.active::before {
  background: linear-gradient(90deg, #4caf50 50%, #e0e0e0 50%);
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e0e0e0;
  margin: 0 auto 8px;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.completed .step-dot {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}
.step-label { font-size: 12px; color: #666; }
.step-date { font-size: 11px; color: #999; margin-top: 2px; }
```

2. Document checklist per deal with traffic-light status:
```
견적서(PI)      ✅ 완료  2026-03-01
상업송장(CI)    ✅ 완료  2026-03-05
패킹리스트(PL)  🟡 대기  -
원산지증명(CO)  ⬜ 미시작 -
선적서류(B/L)   ⬜ 미시작 -
```
Each row clickable → opens document viewer/editor inline.

---

## 5. FREIGHTOS — Calculator/Estimator UX

### What They Do Exceptionally Well
**Pre-populated Defaults**: China → US as default origin/destination (the most common lane). Reduces form completion time by 40%.

**Weighted Scoring for Results**: Results ranked by algorithm combining: cost (weight%), transit time (weight%), carrier rating (weight%). Users can adjust weight sliders to re-rank.

**Multi-Currency + Multi-Unit**: Supports USD/EUR/GBP and metric/imperial seamlessly. Unit preference saved in profile.

**Saved Quotes**: Up to 100 saved quotes for comparison, with expiry dates shown.

### Whistle Implementation

**Specific Actions**:
1. Build the cost simulator with smart defaults:
```css
/* Cost calculator card */
.cost-calculator {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.calc-route {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.calc-route .route-field {
  flex: 1;
}
.calc-route .route-arrow {
  color: #3b82f6;
  font-size: 20px;
  flex-shrink: 0;
}
/* Result ranking cards */
.quote-result {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.quote-result:hover { border-color: #3b82f6; }
.quote-result.recommended {
  border-color: #3b82f6;
  background: #f8faff;
}
.quote-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.tag-cheapest { background: #dcfce7; color: #166534; }
.tag-fastest { background: #dbeafe; color: #1e40af; }
.tag-best { background: #fef3c7; color: #92400e; }
```

2. Add slider-based ranking adjustment:
   - "비용 우선" ←→ "속도 우선" single slider
   - Results re-sort in real-time as slider moves
   - Show estimated savings: "해상운송 선택 시 $2,340 절감 (배송 +14일)"

---

## 6. PANDADOC — Document Creation + E-Signature Flow

### What They Do Exceptionally Well
**Drag-and-Drop Block Editor**: Documents built from content blocks — text, image, pricing table, signature field, date field. No blank-page intimidation.

**Template-First Workflow**: Users never start from scratch. Template gallery organized by document type (Proposal, Invoice, Contract) with preview thumbnails.

**Recipient-Centric Signing**: Each signature/initial field is color-coded by recipient. Signer sees ONLY their fields highlighted in their color, with a "Next" button jumping between fields.

**Document Activity Timeline**: Shows exactly when document was viewed, by whom, how long they spent on each page. This data drives follow-up urgency.

### Whistle Implementation

**Specific Actions**:
1. Build export document templates with pre-filled blocks:
```css
/* Document builder */
.doc-builder {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  height: calc(100vh - 64px);
}
.doc-sidebar {
  border-right: 1px solid #e5e7eb;
  padding: 16px;
  overflow-y: auto;
}
.doc-canvas {
  padding: 40px;
  overflow-y: auto;
  background: #f5f5f5;
}
.doc-page {
  background: white;
  max-width: 800px;
  margin: 0 auto;
  padding: 60px;
  min-height: 1100px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
/* Draggable blocks */
.block-palette .block-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: grab;
  font-size: 13px;
}
.block-item:hover { background: #f3f4f6; }
.block-item.dragging { opacity: 0.5; }
/* Signature fields color-coded by recipient */
.sig-field[data-recipient="buyer"] {
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}
.sig-field[data-recipient="seller"] {
  border: 2px dashed #10b981;
  background: rgba(16, 185, 129, 0.05);
}
```

2. Document activity feed in deal chat:
```
📄 PI-2026-0042 활동
├─ 03/13 14:22 바이어가 문서를 열람함 (2분 30초)
├─ 03/13 14:25 바이어가 가격 섹션에서 4분 머무름 ⚠️
├─ 03/13 14:30 바이어가 서명 완료
└─ 03/13 14:30 자동으로 CI 생성 시작
```
The "4분 머무름" on price section is a negotiation signal — surface this to the manufacturer.

---

## 7. STRIPE DASHBOARD — Financial Data UX

### What They Do Exceptionally Well
**Keyboard Shortcut System**: Press `?` for shortcuts overlay. `/` for search. `G then H` for Home. Two-key combos for power users without blocking mouse users.

**Customizable Home Widgets**: Users add/remove metric widgets. Default: Gross Volume, Net Revenue, Successful Payments, New Customers. Each widget clickable to drill down.

**Progressive Detail Disclosure**: Customer list → Click customer → Side panel shows subscriptions, payments, invoices, quotes. No page navigation — panel slides in from right.

**Filter System**: Every list supports compound filters — "Status is active AND created after Jan 1 AND amount > $100" with AND/OR logic, saveable as named views.

### Whistle Implementation

**Specific Actions**:
1. Implement keyboard shortcuts:
```javascript
// Whistle keyboard shortcuts
const SHORTCUTS = {
  '/': () => focusSearch(),
  'g+h': () => navigate('home'),
  'g+d': () => navigate('deals'),
  'g+m': () => navigate('messages'),
  'g+s': () => navigate('documents'),
  'n+d': () => createNewDeal(),
  'n+i': () => createNewInquiry(),
  '?': () => showShortcutsModal(),
  'Escape': () => closePanel(),
};
// Two-key combo handler
let pendingKey = null;
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const key = e.key.toLowerCase();
  if (pendingKey) {
    const combo = `${pendingKey}+${key}`;
    if (SHORTCUTS[combo]) { SHORTCUTS[combo](); e.preventDefault(); }
    pendingKey = null;
  } else if (['g','n'].includes(key)) {
    pendingKey = key;
    setTimeout(() => { pendingKey = null; }, 500);
  } else if (SHORTCUTS[key]) {
    SHORTCUTS[key](); e.preventDefault();
  }
});
```

2. Right-side detail panel (not full page navigation):
```css
/* Slide-in detail panel */
.detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 12px rgba(0,0,0,0.1);
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 200;
  overflow-y: auto;
}
.detail-panel.open { transform: translateX(0); }
.detail-panel .panel-header {
  position: sticky;
  top: 0;
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
/* Overlay behind panel */
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.2);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}
.panel-overlay.active {
  opacity: 1;
  pointer-events: auto;
}
```

3. Dashboard metric widgets:
```css
.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}
.metric-label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.metric-value { font-size: 28px; font-weight: 700; color: #111; }
.metric-change { font-size: 12px; margin-top: 4px; }
.metric-change.up { color: #059669; }
.metric-change.down { color: #dc2626; }
```

---

## 8. MONDAY.COM — Pipeline Board Visualization

### What They Do Exceptionally Well
**Multi-View Same Data**: Same dataset viewable as Table, Kanban, Timeline (Gantt), Calendar, Chart, Map. User switches view with tabs — data stays identical.

**Color-Coded Status Columns**: Status uses full-width colored cells (not just a dot). Green/Yellow/Orange/Red fills the entire cell, making board scannable at a glance from across a room.

**Group Collapse**: Items organized in collapsible groups with colored headers. A deal board might group by: "신규 문의" (blue), "협상 중" (orange), "계약 진행" (yellow), "거래 완료" (green).

**Automation Recipes**: "When status changes to Done, notify someone" — natural language automation builder that non-technical users can configure.

### Whistle Implementation

**Specific Actions**:
1. Deal pipeline with Monday-style status columns:
```css
/* Full-cell status colors */
.status-cell {
  padding: 6px 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  border-radius: 4px;
  min-width: 100px;
}
.status-inquiry { background: #579bfc; }    /* 문의 */
.status-sample { background: #a25ddc; }     /* 샘플 */
.status-negotiate { background: #fdab3d; }  /* 협상 */
.status-contract { background: #ffcb00; color: #333; } /* 계약 */
.status-production { background: #00c875; } /* 생산 */
.status-shipping { background: #66ccff; }   /* 선적 */
.status-complete { background: #33d9b2; }   /* 완료 */
.status-stuck { background: #e2445c; }      /* 중단 */

/* Group headers with color bars */
.deal-group {
  margin-bottom: 16px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.group-header .color-bar {
  width: 4px;
  height: 24px;
  border-radius: 2px;
}
.group-header .count {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}
.group-content { /* Collapsible */ }
.group-header.collapsed + .group-content { display: none; }
```

2. View switcher for deals:
```html
<div class="view-switcher">
  <button class="view-btn active" data-view="table">
    <svg><!-- table icon --></svg> 테이블
  </button>
  <button class="view-btn" data-view="kanban">
    <svg><!-- kanban icon --></svg> 보드
  </button>
  <button class="view-btn" data-view="timeline">
    <svg><!-- timeline icon --></svg> 타임라인
  </button>
</div>
```

---

## 9. NOTION — Clean Form/Table UX

### What They Do Exceptionally Well
**Inline Property Editing**: Click any cell in a table → edit in place. No modal, no separate form. Type changes happen via dropdown in the cell itself.

**Slash Command System**: Type `/` anywhere to get a contextual menu of insertable blocks. Dramatically reduces toolbar hunting.

**Database Views with Filters**: Each database supports saved views — "All Deals," "My Active Deals," "Overdue Deals" — each with its own filter/sort/group configuration. Views are tabs above the table.

**Template Buttons**: "New from template" creates pre-structured entries. A "New Deal" template auto-fills: company name field, status=inquiry, assigned=creator, due date=+7 days.

**Minimal Chrome**: Almost zero visible UI chrome. Content takes 90%+ of viewport. Toolbar appears only on hover. Sidebar collapsible to just icons.

### Whistle Implementation

**Specific Actions**:
1. Implement saved views for deal tables:
```css
/* Saved view tabs */
.view-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
  overflow-x: auto;
}
.view-tab {
  padding: 8px 16px;
  font-size: 13px;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.view-tab:hover { color: #111; }
.view-tab.active {
  color: #111;
  border-bottom-color: #3b82f6;
  font-weight: 500;
}
.view-tab .count {
  font-size: 11px;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
}
```

2. Inline cell editing pattern:
```css
/* Inline edit cells */
.editable-cell {
  padding: 6px 8px;
  border-radius: 4px;
  cursor: text;
  min-height: 32px;
  transition: background 0.1s;
}
.editable-cell:hover { background: #f9fafb; }
.editable-cell:focus {
  background: white;
  box-shadow: 0 0 0 2px #3b82f6;
  outline: none;
}
/* Property type indicators */
.prop-select { cursor: pointer; }
.prop-date { font-family: 'SF Mono', monospace; font-size: 12px; }
.prop-currency::before { content: '$'; color: #9ca3af; }
```

3. Slash command implementation:
```javascript
// Slash command menu in document editor / chat
function initSlashCommands(inputEl) {
  const COMMANDS = [
    { key: 'pi', label: 'Proforma Invoice 생성', icon: '📄', action: 'createPI' },
    { key: 'ci', label: 'Commercial Invoice 생성', icon: '📋', action: 'createCI' },
    { key: 'pl', label: 'Packing List 생성', icon: '📦', action: 'createPL' },
    { key: 'co', label: '원산지증명서 생성', icon: '🏷️', action: 'createCO' },
    { key: 'quote', label: '견적 보내기', icon: '💰', action: 'sendQuote' },
    { key: 'track', label: '선적 추적', icon: '🚢', action: 'trackShipment' },
    { key: 'cost', label: '비용 시뮬레이션', icon: '🧮', action: 'costSim' },
  ];
  // Show menu when "/" typed, filter as user types after "/"
}
```

---

## 10. LINEAR — Speed + Keyboard-First UX

### What They Do Exceptionally Well
**Command Palette (Cmd+K)**: Single entry point for EVERYTHING — navigate, create, search, filter, change status, assign. No need to find the right menu.

**Keyboard-First, Mouse-Optional**: Every action has a keyboard shortcut. `C` creates issue, `S` sets status, `P` sets priority, arrow keys navigate list. Power users never touch the mouse.

**Ultra-Fast Interface**: Optimistic UI updates — actions reflect instantly before server confirms. No loading spinners for common operations.

**Minimal UI Chrome**: No excessive borders, shadows, or decorations. Information hierarchy through typography weight and subtle color differences only.

**Notification Inbox**: Notifications are an "inbox" you process — mark as read, snooze, archive. Not just a bell with a counter.

### Whistle Implementation

**Specific Actions**:
1. Command Palette:
```css
/* Command palette */
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
}
.command-palette {
  width: 560px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  overflow: hidden;
}
.command-input {
  width: 100%;
  padding: 16px 20px;
  border: none;
  font-size: 16px;
  border-bottom: 1px solid #e5e7eb;
  outline: none;
}
.command-results {
  max-height: 360px;
  overflow-y: auto;
}
.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
}
.command-item:hover,
.command-item.selected { background: #f3f4f6; }
.command-item .shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
  font-family: 'SF Mono', monospace;
  display: flex;
  gap: 4px;
}
.shortcut kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
}
```

2. Notification Inbox (not just a badge):
```css
/* Notification inbox panel */
.notif-inbox {
  width: 400px;
  max-height: 70vh;
  overflow-y: auto;
}
.notif-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.1s;
}
.notif-item:hover { background: #f9fafb; }
.notif-item.unread { background: #eff6ff; }
.notif-item.unread:hover { background: #dbeafe; }
.notif-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.1s;
}
.notif-item:hover .notif-actions { opacity: 1; }
.notif-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
}
.notif-action-btn:hover { background: #e5e7eb; }
```

---

## CROSS-CUTTING PATTERNS — Applicable to All

### A. Empty States & Progressive Disclosure

Every major section needs a purpose-driven empty state, not just "데이터가 없습니다."

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}
.empty-state .illustration {
  width: 180px;
  height: 140px;
  margin-bottom: 24px;
  opacity: 0.8;
}
.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #111;
}
.empty-state p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 20px;
}
.empty-state .cta-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
```

**Specific empty states needed**:
| Section | Title | Description | CTA |
|---------|-------|-------------|-----|
| Deals | 첫 거래를 시작해보세요 | 바이어 문의를 수락하거나, 직접 견적서를 보내 거래를 시작하세요 | + 새 거래 생성 |
| Documents | 서류가 자동 생성됩니다 | 거래가 진행되면 PI, CI, PL이 자동으로 생성됩니다 | 서류 템플릿 보기 |
| Messages | 아직 메시지가 없습니다 | 바이어와의 모든 커뮤니케이션이 여기에 모입니다 | 바이어 찾기 |
| Analytics | 데이터가 쌓이고 있어요 | 첫 거래 완료 후 수출 분석 리포트를 확인할 수 있습니다 | 샘플 리포트 보기 |

### B. Onboarding / First-Time UX

Steal from Notion + Monday:

```css
/* Onboarding checklist — sticky on first 7 days */
.onboarding-checklist {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}
.onboarding-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.onboarding-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar .fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  transition: width 0.3s;
}
.progress-text { font-size: 12px; color: #6b7280; }
.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f9fafb;
}
.checklist-item .check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  flex-shrink: 0;
}
.checklist-item.done .check {
  background: #3b82f6;
  border-color: #3b82f6;
  /* checkmark via SVG background */
}
.checklist-item .item-action {
  margin-left: auto;
  font-size: 12px;
  color: #3b82f6;
  cursor: pointer;
}
```

**Manufacturer onboarding checklist**:
1. ☐ 회사 정보 입력 (5분)
2. ☐ 대표 제품 1개 등록 (3분)
3. ☐ AI 수출 분석 리포트 받기 (자동)
4. ☐ 첫 번째 바이어 문의에 응답 (—)
5. ☐ 견적서(PI) 발송 (—)

**Buyer onboarding checklist**:
1. ☐ 관심 카테고리 선택 (1분)
2. ☐ 제조사 3곳 북마크 (2분)
3. ☐ 첫 문의 보내기 (3분)
4. ☐ 견적서 받고 비교하기 (—)

### C. Mobile Responsiveness

Key breakpoints following Flexport/Linear patterns:

```css
/* Breakpoint system */
@media (max-width: 1280px) {
  /* Sidebar collapses to icons only */
  .sidebar { width: 64px; }
  .sidebar .label { display: none; }
  /* Tables get horizontal scroll */
  .data-table-wrapper { overflow-x: auto; }
}
@media (max-width: 1024px) {
  /* Switch from grid to stack */
  .dashboard-metrics { grid-template-columns: repeat(2, 1fr); }
  .doc-builder { grid-template-columns: 1fr; }
  .doc-sidebar { display: none; /* show as bottom sheet */ }
}
@media (max-width: 768px) {
  /* Full mobile */
  .sidebar { display: none; /* bottom nav instead */ }
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 8px 0 env(safe-area-inset-bottom);
  }
  .dashboard-metrics { grid-template-columns: 1fr; }
  .detail-panel { width: 100vw; }
  .command-palette { width: calc(100vw - 32px); }
  .deal-stepper { flex-wrap: nowrap; overflow-x: auto; }
}
```

### D. Search & Filtering

Combine Stripe's compound filters + Alibaba's dual-tab search:

```css
/* Compound filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}
.filter-chip.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}
.filter-chip .remove {
  width: 14px;
  height: 14px;
  opacity: 0.5;
}
.filter-chip .remove:hover { opacity: 1; }
.add-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
  border: 1px dashed #d1d5db;
  cursor: pointer;
}
```

### E. Notification Management

Combine Stripe's alert prioritization + Linear's inbox model:

**Notification priority levels**:
- **Critical** (red dot): 결제 분쟁, 서류 반려, 계약 만료 임박
- **Action Required** (orange): 바이어 문의 미응답 24h, 서류 서명 대기
- **Informational** (blue): 새 바이어 매칭, 리포트 완성, 요금제 안내
- **System** (gray): 로그인 알림, 시스템 업데이트

### F. Subscription/Upgrade Prompts

Non-intrusive, contextual — never modal popups:

```css
/* Inline upgrade prompt */
.upgrade-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea11, #764ba211);
  border: 1px solid #667eea33;
  border-radius: 8px;
  margin: 12px 0;
}
.upgrade-prompt .icon { font-size: 20px; }
.upgrade-prompt .text {
  flex: 1;
  font-size: 13px;
  color: #4b5563;
}
.upgrade-prompt .text strong { color: #111; }
.upgrade-prompt .upgrade-btn {
  padding: 6px 14px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
```

**Context-specific prompts** (show only at the moment of need):
- Generating 4th AI report → "무료 플랜은 월 3건까지. Pro 업그레이드로 무제한 리포트"
- 3rd team member invited → "Starter는 2명까지. Pro로 업그레이드하면 10명까지"
- Viewing blurred buyer match → "Pro 플랜에서 바이어 상세정보를 확인하세요"

---

## PRIORITY IMPLEMENTATION ORDER

Based on impact and effort:

| Priority | Pattern | Source | Impact | Effort |
|----------|---------|--------|--------|--------|
| 1 | Command Palette (Cmd+K) | Linear | HIGH — power user retention | 1 day |
| 2 | Deal Pipeline Stepper | Flexport + Monday | HIGH — core transaction UX | 1 day |
| 3 | Empty States (all sections) | Notion | HIGH — first impression | 0.5 day |
| 4 | Keyboard Shortcuts | Stripe + Linear | MED — efficiency | 0.5 day |
| 5 | Onboarding Checklist | Notion + Monday | HIGH — activation rate | 0.5 day |
| 6 | Right-Side Detail Panel | Stripe | MED — navigation fluidity | 1 day |
| 7 | Trust Badge Stack | Alibaba | MED — conversion trust | 0.5 day |
| 8 | Document Activity Feed | PandaDoc | MED — negotiation intel | 0.5 day |
| 9 | Compound Filters | Stripe | MED — data management | 1 day |
| 10 | Notification Inbox | Linear | MED — engagement | 1 day |
| 11 | View Switcher (Table/Kanban/Timeline) | Monday + Notion | MED — data flexibility | 2 days |
| 12 | Cost Calculator with Ranking | Freightos | MED — cost simulation | 1 day |
| 13 | Saved Views | Notion | LOW — power feature | 1 day |
| 14 | Mobile Bottom Nav | All | HIGH for mobile users | 0.5 day |
| 15 | Contextual Upgrade Prompts | Stripe | MED — revenue | 0.5 day |

**Total estimated: ~12 days for all 15 patterns.**

---

## WHISTLE-SPECIFIC UNIQUE ADVANTAGES (No Competitor Has These)

1. **수출바우처 수행기관 Badge** — Only Whistle can show this Korean government-backed trust signal
2. **AI 3-Expert Panel Report** — No B2B platform generates multi-expert analysis from a URL
3. **Full-Cycle in One Chat** — Alibaba separates chat/orders/docs; Whistle unifies them
4. **Document Auto-Chain** — PI signed → CI auto-generated → PL auto-generated. No manual re-entry
5. **Bilingual Deal Chat** — Real-time translation in the deal thread, not a separate tool

These should be highlighted as badge/feature callouts throughout the platform, not buried in marketing copy.
