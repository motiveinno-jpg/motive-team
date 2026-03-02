// /app/dealroom/ui/modals/quoteModal.js
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

export function openQuoteModal({ supabase, dealId }) {
  const overlay = el(`
    <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;padding:18px;">
      <div style="width:min(720px,100%);background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
        <div style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
          <div style="font-weight:800;">Create Quote</div>
          <div style="margin-left:auto;">
            <button data-close class="dr-btn" type="button">닫기</button>
          </div>
        </div>

        <div style="padding:14px;display:grid;gap:10px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <label style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;opacity:.7;">Currency</span>
              <select data-currency class="dr-input">
                <option value="USD" selected>USD</option>
                <option value="KRW">KRW</option>
                <option value="JPY">JPY</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;opacity:.7;">Incoterms</span>
              <select data-incoterms class="dr-input">
                <option value="FOB" selected>FOB</option>
                <option value="CIF">CIF</option>
                <option value="DDP">DDP</option>
                <option value="EXW">EXW</option>
              </select>
            </label>

            <label style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;opacity:.7;">Valid Until</span>
              <input data-valid class="dr-input" type="date" />
            </label>
          </div>

          <div>
            <div style="font-size:12px;opacity:.7;margin-bottom:6px;">Items</div>
            <div data-items style="display:grid;gap:8px;"></div>
            <button data-add class="dr-btn" type="button" style="margin-top:8px">+ Add Item</button>
          </div>

          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:12px;opacity:.7;">Notes</span>
            <textarea data-notes class="dr-input" rows="2" placeholder="Optional"></textarea>
          </label>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button data-send class="dr-btn" type="button" style="background:#2563eb;color:#fff;border-color:#2563eb;">Send Quote</button>
            <span data-status style="font-size:12px;opacity:.7;"></span>
          </div>
        </div>
      </div>
    </div>
  `);

  const $items = overlay.querySelector('[data-items]');
  const $add = overlay.querySelector('[data-add]');
  const $send = overlay.querySelector('[data-send]');
  const $status = overlay.querySelector('[data-status]');
  const $currency = overlay.querySelector('[data-currency]');
  const $incoterms = overlay.querySelector('[data-incoterms]');
  const $valid = overlay.querySelector('[data-valid]');
  const $notes = overlay.querySelector('[data-notes]');

  function close() { overlay.remove(); }
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function addItemRow(init = {}) {
    const row = el(`
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:center;">
        <input data-name class="dr-input" placeholder="Product name" value="${init.product_name || ''}" />
        <input data-qty class="dr-input" type="number" min="0" placeholder="Qty" value="${init.qty ?? ''}" />
        <input data-price class="dr-input" type="number" min="0" step="0.01" placeholder="Unit price" value="${init.unit_price ?? ''}" />
        <button data-del class="dr-btn" type="button" style="padding:6px 8px">X</button>
      </div>
    `);
    row.querySelector('[data-del]').addEventListener('click', () => row.remove());
    $items.appendChild(row);
  }

  addItemRow();

  $add.addEventListener('click', () => addItemRow());

  async function send() {
    $status.textContent = 'Sending…';
    $send.disabled = true;

    const rows = [...$items.querySelectorAll('div')];
    const items = rows.map(r => ({
      product_name: r.querySelector('[data-name]')?.value?.trim() || '',
      qty: n(r.querySelector('[data-qty]')?.value),
      unit_price: n(r.querySelector('[data-price]')?.value),
    })).filter(it => it.product_name && it.qty > 0);

    if (!items.length) {
      $status.textContent = 'At least 1 item is required';
      $send.disabled = false;
      return;
    }

    const validUntil = $valid.value ? new Date($valid.value).toISOString() : null;

    try {
      // 1) Create draft quote
      const { data: quote, error: qErr } = await supabase.from('quotes')
        .insert({
          deal_id: dealId,
          status: 'draft',
          currency: $currency.value,
          incoterms: $incoterms.value,
          valid_until: validUntil,
          notes: $notes.value || null,
        })
        .select('*').single();

      if (qErr) throw qErr;

      // 2) Insert quote items
      const { error: iErr } = await supabase.from('quote_items').insert(
        items.map(it => ({ quote_id: quote.id, ...it }))
      );
      if (iErr) throw iErr;

      // 3) Send via Edge Function
      const { error: sErr } = await supabase.functions.invoke('send-quote', {
        body: { deal_id: dealId, quote_id: quote.id },
      });
      if (sErr) throw sErr;

      $status.textContent = 'Sent!';
      setTimeout(close, 600);
    } catch (e) {
      console.error('[quote send error]', e);
      $status.textContent = `Error: ${e?.message || String(e)}`;
    } finally {
      $send.disabled = false;
    }
  }

  $send.addEventListener('click', send);

  document.body.appendChild(overlay);
  return close;
}
