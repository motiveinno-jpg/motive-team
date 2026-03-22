/**
 * NARU Documents — 수출 서류 생성/관리
 * PI(견적서), CI(상업송장), PL(포장명세서), CO(원산지증명서), SC(매매계약서)
 * 건당 3,000원
 */

const DOC_TYPES = [
  { id: 'pi', label: 'Proforma Invoice', ko: '견적서', icon: '📋', price: 3000 },
  { id: 'ci', label: 'Commercial Invoice', ko: '상업송장', icon: '🧾', price: 3000 },
  { id: 'pl', label: 'Packing List', ko: '포장명세서', icon: '📦', price: 3000 },
  { id: 'co', label: 'Certificate of Origin', ko: '원산지증명서', icon: '🏛️', price: 3000 },
  { id: 'sc', label: 'Sales Contract', ko: '매매계약서', icon: '📝', price: 3000 }
];

Router.register('documents', function(state) {
  if (!state.products || !state.products.length) {
    return UI.empty('📄', '서류를 생성하려면 제품이 필요합니다',
      '먼저 제품을 등록하고 AI 분석을 완료하세요.',
      '제품 등록하기', "Router.go('analyze')");
  }

  let h = '';

  // Header
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">';
  h += '<h2 style="font-size:20px;font-weight:800;color:#fff;flex:1">서류함</h2>';
  h += `<button onclick="Docs.showCreateModal()" class="btn btn-pri btn-sm">+ 서류 생성</button>`;
  h += '</div>';

  // Document type cards (quick create)
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:24px">';
  DOC_TYPES.forEach(dt => {
    h += `<div onclick="Docs.showCreateModal('${dt.id}')" class="card" style="cursor:pointer;padding:16px;text-align:center;transition:all .2s">`;
    h += `<div style="font-size:28px;margin-bottom:8px">${dt.icon}</div>`;
    h += `<div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:2px">${dt.ko}</div>`;
    h += `<div style="font-size:11px;color:var(--tx2)">${dt.label}</div>`;
    h += `<div style="font-size:11px;color:var(--pri);margin-top:6px">${UI.won(dt.price)}/건</div>`;
    h += '</div>';
  });
  h += '</div>';

  // Document history
  h += '<h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:12px">생성 이력</h3>';

  // Load documents from state (we'll add to state in init)
  const docs = state._documents || [];

  if (docs.length === 0) {
    h += '<div style="text-align:center;padding:40px;color:var(--tx2);font-size:13px">';
    h += '아직 생성된 서류가 없습니다.<br>위 서류 유형을 클릭하여 AI 자동 생성을 시작하세요.';
    h += '</div>';
  } else {
    h += '<div class="tbl-wrap" style="overflow-x:auto">';
    h += '<table class="tbl">';
    h += '<thead><tr>';
    h += '<th>서류</th><th>제품</th><th>바이어</th><th>상태</th><th>금액</th><th>생성일</th><th></th>';
    h += '</tr></thead><tbody>';

    docs.forEach(doc => {
      const dtype = DOC_TYPES.find(d => d.id === doc.type) || {};
      const product = state.products.find(p => p.id === doc.product_id);
      const statusBadge = doc.status === 'completed'
        ? UI.badge('완료', 'grn')
        : doc.status === 'generating'
        ? UI.badge('생성중', 'ylw')
        : UI.badge('오류', 'red');

      h += '<tr>';
      h += `<td><span style="font-weight:700;color:#fff">${dtype.icon || '📄'} ${dtype.ko || doc.type}</span></td>`;
      h += `<td>${product ? UI.trunc(product.name, 20) : '-'}</td>`;
      h += `<td>${doc.buyer_name || '-'}</td>`;
      h += `<td>${statusBadge}</td>`;
      h += `<td>${doc.total_amount ? UI.usd(doc.total_amount) : '-'}</td>`;
      h += `<td>${UI.date(doc.created_at)}</td>`;
      h += '<td>';
      if (doc.status === 'completed') {
        h += `<button onclick="Docs.preview('${doc.id}')" class="btn btn-ghost btn-sm" style="margin-right:4px">미리보기</button>`;
        h += `<button onclick="Docs.download('${doc.id}')" class="btn btn-pri btn-sm">다운로드</button>`;
      }
      h += '</td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
  }

  // Consistency check section (if multiple docs exist)
  if (docs.length >= 2) {
    h += '<div style="margin-top:24px;padding:16px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius)">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    h += '<span style="font-size:16px">🔍</span>';
    h += '<span style="font-size:14px;font-weight:700;color:#fff">서류 일관성 검사</span>';
    h += '</div>';
    h += '<p style="font-size:12px;color:var(--tx2);margin-bottom:12px">PI, CI, PL 간 수량/금액/품목이 일치하는지 AI가 자동으로 검사합니다.</p>';
    h += `<button onclick="Docs.checkConsistency()" class="btn btn-ghost btn-sm">일관성 검사 실행</button>`;
    h += '</div>';
  }

  return h;
});

/* Document actions */
const Docs = {
  async loadDocuments() {
    if (!S.company) return;
    const pids = S.products.map(p => p.id);
    if (!pids.length) { S._documents = []; return; }
    const { data } = await sb.from('documents')
      .select('*')
      .in('product_id', pids)
      .order('created_at', { ascending: false });
    S._documents = data || [];
  },

  showCreateModal(preselectedType) {
    const analysisProducts = S.products.filter(p => {
      return S.analyses.some(a => a.product_id === p.id);
    });

    if (analysisProducts.length === 0) {
      UI.toast('분석이 완료된 제품이 없습니다. AI 분석을 먼저 진행하세요.', 'warn');
      return;
    }

    let body = '';

    // Product selection
    body += '<div style="margin-bottom:16px">';
    body += '<label class="form-label">제품 선택</label>';
    body += '<select id="doc-product" class="form-input">';
    analysisProducts.forEach(p => {
      body += `<option value="${p.id}">${p.name}</option>`;
    });
    body += '</select></div>';

    // Document type
    body += '<div style="margin-bottom:16px">';
    body += '<label class="form-label">서류 유형</label>';
    body += '<select id="doc-type" class="form-input">';
    DOC_TYPES.forEach(dt => {
      const sel = dt.id === preselectedType ? ' selected' : '';
      body += `<option value="${dt.id}"${sel}>${dt.icon} ${dt.ko} (${dt.label}) — ${UI.won(dt.price)}</option>`;
    });
    body += '</select></div>';

    // Buyer info
    body += '<div style="margin-bottom:16px">';
    body += '<label class="form-label">바이어 정보 (선택)</label>';
    body += '<input id="doc-buyer-name" class="form-input" placeholder="바이어 회사명" style="margin-bottom:8px">';
    body += '<input id="doc-buyer-country" class="form-input" placeholder="국가 (예: United States)" style="margin-bottom:8px">';
    body += '<input id="doc-buyer-address" class="form-input" placeholder="주소">';
    body += '</div>';

    // Trade terms
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
    body += '<div>';
    body += '<label class="form-label">인코텀즈</label>';
    body += '<select id="doc-incoterms" class="form-input">';
    ['FOB', 'CIF', 'EXW', 'DDP', 'CFR', 'DAP'].forEach(t => {
      body += `<option value="${t}">${t}</option>`;
    });
    body += '</select></div>';
    body += '<div>';
    body += '<label class="form-label">통화</label>';
    body += '<select id="doc-currency" class="form-input">';
    ['USD', 'EUR', 'JPY', 'CNY', 'KRW'].forEach(c => {
      body += `<option value="${c}">${c}</option>`;
    });
    body += '</select></div>';
    body += '</div>';

    // Quantity & Unit price
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
    body += '<div>';
    body += '<label class="form-label">수량</label>';
    body += '<input id="doc-qty" type="number" class="form-input" placeholder="1000" min="1">';
    body += '</div>';
    body += '<div>';
    body += '<label class="form-label">단가</label>';
    body += '<input id="doc-unit-price" type="number" class="form-input" placeholder="25.00" step="0.01" min="0">';
    body += '</div>';
    body += '</div>';

    // Additional notes
    body += '<div style="margin-bottom:20px">';
    body += '<label class="form-label">추가 메모</label>';
    body += '<textarea id="doc-notes" class="form-input" rows="3" placeholder="특이사항, 포장 규격 등"></textarea>';
    body += '</div>';

    // Price notice
    const selectedType = preselectedType || DOC_TYPES[0].id;
    const price = DOC_TYPES.find(d => d.id === selectedType)?.price || 3000;
    const isSub = !!S.sub;

    body += '<div style="padding:12px;background:var(--pri-bg);border-radius:var(--radius-sm);margin-bottom:16px">';
    if (isSub) {
      body += '<span style="font-size:13px;color:var(--pri);font-weight:600">구독 회원 — 무료 생성</span>';
    } else {
      body += `<span style="font-size:13px;color:var(--pri);font-weight:600">비용: ${UI.won(price)}</span>`;
      body += '<span style="font-size:11px;color:var(--tx2);margin-left:8px">(구독하면 무제한)</span>';
    }
    body += '</div>';

    body += `<button onclick="Docs.generate()" class="btn btn-pri" style="width:100%">AI 서류 생성</button>`;

    UI.modal('서류 생성', body, { width: '600px' });
  },

  async generate() {
    try {
    console.log('[NARU-DOC] generate() 시작');
    const productId = document.getElementById('doc-product')?.value;
    const docType = document.getElementById('doc-type')?.value;
    const buyerName = document.getElementById('doc-buyer-name')?.value?.trim();
    const buyerCountry = document.getElementById('doc-buyer-country')?.value?.trim();
    const buyerAddress = document.getElementById('doc-buyer-address')?.value?.trim();
    const incoterms = document.getElementById('doc-incoterms')?.value;
    const currency = document.getElementById('doc-currency')?.value;
    const qty = parseInt(document.getElementById('doc-qty')?.value) || null;
    const unitPrice = parseFloat(document.getElementById('doc-unit-price')?.value) || null;
    const notes = document.getElementById('doc-notes')?.value?.trim();

    console.log('[NARU-DOC] 입력값:', { productId, docType, buyerName, incoterms, currency, qty, unitPrice });

    if (!productId || !docType) {
      UI.toast('제품과 서류 유형을 선택해주세요.', 'warn');
      return;
    }

    // Payment check — 구독자는 무료
    const dtype = DOC_TYPES.find(d => d.id === docType);

    // 구독 상태 재확인 (세션 중 로딩 실패 대비)
    if (!S.sub && S.user) {
      try {
        const { data: freshSub } = await sb.from('subscriptions').select('*')
          .eq('user_id', S.user.id).eq('status', 'active').maybeSingle();
        if (freshSub) S.sub = freshSub;
      } catch {}
    }
    console.log('[NARU-DOC] 구독 상태:', S.sub ? S.sub.plan : 'none');

    if (!S.sub) {
      // No subscription — allow free generation during beta
      console.log('[NARU-DOC] No subscription, free generation allowed (beta)');
      UI.toast('베타 기간 무료 생성', 'info');
    }

    // Close modal
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    UI.toast(`${dtype.ko} AI 생성 중... (30초~1분 소요)`, 'info');

    // Create document record
    console.log('[NARU-DOC] DB insert 시작...');
    const totalAmount = (qty && unitPrice) ? qty * unitPrice : null;
    const { data: doc, error } = await sb.from('documents').insert({
      user_id: S.user.id,
      product_id: productId,
      type: docType,
      doc_type: docType,
      status: 'generating',
      version: 1,
      language: 'en',
      buyer_name: buyerName || null,
      buyer_country: buyerCountry || null,
      buyer_address: buyerAddress || null,
      incoterms: incoterms,
      currency: currency,
      quantity: qty,
      unit_price: unitPrice,
      total_amount: totalAmount,
      notes: notes || null,
      created_by: S.user.id
    }).select().single();

    if (error) {
      console.error('[NARU-DOC] DB insert 실패:', error);
      UI.toast('서류 생성 실패: ' + UI.err(error), 'error');
      return;
    }
    console.log('[NARU-DOC] DB insert 성공:', doc.id);

    try {
      // Call AI to generate document content
      console.log('[NARU-DOC] EF create-document 호출...');
      const result = await API.generateDoc(docType, null, {
        document_id: doc.id,
        product_id: productId,
        buyer: { name: buyerName, country: buyerCountry, address: buyerAddress },
        trade: { incoterms, currency, quantity: qty, unit_price: unitPrice },
        notes
      });
      console.log('[NARU-DOC] EF 응답:', result);

      // Update document with generated content
      await sb.from('documents').update({
        status: 'completed',
        content: result.content || result,
        doc_number: result.doc_number || `NARU-${docType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
      }).eq('id', doc.id);

      UI.toast(`${dtype.ko} 생성 완료!`, 'success');
    } catch (e) {
      console.error('[NARU-DOC] EF 오류:', e);
      await sb.from('documents').update({ status: 'error' }).eq('id', doc.id);
      UI.toast(`서류 생성 오류: ${UI.err(e)}`, 'error');
    }

    // Reload documents
    await Docs.loadDocuments();
    notify();
    } catch (outerErr) {
      console.error('[NARU-DOC] generate() 전체 오류:', outerErr);
      UI.toast('서류 생성 중 오류: ' + (outerErr.message || outerErr), 'error');
    }
  },

  async preview(docId) {
    const docs = S._documents || [];
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    const dtype = DOC_TYPES.find(d => d.id === doc.type) || {};
    const product = S.products.find(p => p.id === doc.product_id);

    let body = '';

    // Document header
    body += '<div style="background:var(--s2);border-radius:var(--radius);padding:20px;margin-bottom:16px">';
    body += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
    body += `<div style="font-size:16px;font-weight:800;color:#fff">${dtype.icon} ${dtype.ko}</div>`;
    body += `<div style="font-size:12px;color:var(--tx2)">No. ${doc.doc_number || '-'}</div>`;
    body += '</div>';

    // Info grid
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">';
    body += `<div><span style="color:var(--tx2)">제품:</span> <span style="color:#fff">${product ? product.name : '-'}</span></div>`;
    body += `<div><span style="color:var(--tx2)">바이어:</span> <span style="color:#fff">${doc.buyer_name || '-'}</span></div>`;
    body += `<div><span style="color:var(--tx2)">인코텀즈:</span> <span style="color:#fff">${doc.incoterms || '-'}</span></div>`;
    body += `<div><span style="color:var(--tx2)">통화:</span> <span style="color:#fff">${doc.currency || 'USD'}</span></div>`;
    if (doc.quantity) body += `<div><span style="color:var(--tx2)">수량:</span> <span style="color:#fff">${UI.num(doc.quantity)}</span></div>`;
    if (doc.unit_price) body += `<div><span style="color:var(--tx2)">단가:</span> <span style="color:#fff">${UI.usd(doc.unit_price)}</span></div>`;
    if (doc.total_amount) body += `<div style="grid-column:1/-1"><span style="color:var(--tx2)">총액:</span> <span style="color:var(--pri);font-weight:700;font-size:14px">${UI.usd(doc.total_amount)}</span></div>`;
    body += '</div>';
    body += '</div>';

    // Document content (AI-generated)
    if (doc.content) {
      body += '<div style="background:#fff;color:#000;border-radius:var(--radius);padding:24px;font-size:13px;line-height:1.8;max-height:400px;overflow-y:auto;font-family:\'Noto Serif KR\',serif">';
      if (typeof doc.content === 'string') {
        const safe = doc.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        body += safe.replace(/\n/g, '<br>');
      } else if (typeof doc.content === 'object') {
        // Structured content
        body += Docs._renderStructuredContent(doc.type, doc.content);
      }
      body += '</div>';
    }

    // Actions
    body += '<div style="display:flex;gap:10px;margin-top:16px">';
    body += `<button onclick="Docs.download('${docId}')" class="btn btn-pri" style="flex:1">다운로드 (PDF)</button>`;
    body += `<button onclick="Docs.duplicate('${docId}')" class="btn btn-ghost" style="flex:1">복제</button>`;
    body += '</div>';

    UI.modal(`${dtype.ko} 미리보기`, body, { width: '700px' });
  },

  _renderStructuredContent(type, content) {
    let h = '';

    // Common header
    h += '<div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:12px">';
    if (content.title) h += `<h2 style="font-size:18px;font-weight:800;margin-bottom:4px">${content.title}</h2>`;
    if (content.doc_number) h += `<div style="font-size:12px;color:#666">No. ${content.doc_number}</div>`;
    if (content.date) h += `<div style="font-size:12px;color:#666">Date: ${content.date}</div>`;
    h += '</div>';

    // Seller / Buyer info
    if (content.seller || content.buyer) {
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
      if (content.seller) {
        h += '<div>';
        h += '<div style="font-weight:700;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px">SELLER</div>';
        h += `<div style="font-size:12px">${content.seller.name || ''}<br>${content.seller.address || ''}</div>`;
        h += '</div>';
      }
      if (content.buyer) {
        h += '<div>';
        h += '<div style="font-weight:700;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px">BUYER</div>';
        h += `<div style="font-size:12px">${content.buyer.name || ''}<br>${content.buyer.address || ''}</div>`;
        h += '</div>';
      }
      h += '</div>';
    }

    // Items table
    if (content.items && content.items.length) {
      h += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px">';
      h += '<thead><tr style="background:#f0f0f0">';
      h += '<th style="padding:6px;border:1px solid #ddd;text-align:left">No.</th>';
      h += '<th style="padding:6px;border:1px solid #ddd;text-align:left">Description</th>';
      h += '<th style="padding:6px;border:1px solid #ddd;text-align:right">Qty</th>';
      h += '<th style="padding:6px;border:1px solid #ddd;text-align:right">Unit Price</th>';
      h += '<th style="padding:6px;border:1px solid #ddd;text-align:right">Amount</th>';
      h += '</tr></thead><tbody>';
      content.items.forEach((item, i) => {
        h += '<tr>';
        h += `<td style="padding:6px;border:1px solid #ddd">${i + 1}</td>`;
        h += `<td style="padding:6px;border:1px solid #ddd">${item.description || ''}</td>`;
        h += `<td style="padding:6px;border:1px solid #ddd;text-align:right">${item.quantity || ''}</td>`;
        h += `<td style="padding:6px;border:1px solid #ddd;text-align:right">${item.unit_price || ''}</td>`;
        h += `<td style="padding:6px;border:1px solid #ddd;text-align:right">${item.amount || ''}</td>`;
        h += '</tr>';
      });
      h += '</tbody></table>';
    }

    // Total
    if (content.total) {
      h += `<div style="text-align:right;font-size:14px;font-weight:700;margin-bottom:12px">TOTAL: ${content.currency || 'USD'} ${content.total}</div>`;
    }

    // Terms
    if (content.terms) {
      h += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666">';
      h += '<div style="font-weight:700;margin-bottom:4px">Terms & Conditions</div>';
      h += String(content.terms).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
      h += '</div>';
    }

    return h;
  },

  async download(docId) {
    const docs = S._documents || [];
    const doc = docs.find(d => d.id === docId);
    if (!doc || !doc.content) {
      UI.toast('서류 내용이 없습니다.', 'warn');
      return;
    }

    // Generate printable HTML and trigger browser print/save as PDF
    const dtype = DOC_TYPES.find(d => d.id === doc.type) || {};
    const product = S.products.find(p => p.id === doc.product_id);

    const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${dtype.ko} - ${product ? product.name : 'NARU'}</title>
<style>
  body{font-family:'Noto Sans KR',sans-serif;padding:40px;color:#000;font-size:13px;line-height:1.8}
  h1{font-size:22px;text-align:center;margin-bottom:4px}
  .doc-no{text-align:center;font-size:12px;color:#666;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{padding:8px 12px;border:1px solid #ddd;font-size:12px}
  th{background:#f0f0f0;font-weight:700}
  .total{text-align:right;font-size:16px;font-weight:700;margin:12px 0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
  .info-block h3{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666}
  @media print{body{padding:20px}}
</style>
</head>
<body>
  <h1>${dtype.label}</h1>
  <div class="doc-no">No. ${doc.doc_number || '-'} | Date: ${UI.date(doc.created_at)}</div>
  <div class="info-grid">
    <div class="info-block">
      <h3>Seller</h3>
      <div>${S.company ? S.company.name : ''}</div>
      <div>${S.company && S.company.address ? S.company.address : ''}</div>
    </div>
    <div class="info-block">
      <h3>Buyer</h3>
      <div>${doc.buyer_name || '-'}</div>
      <div>${doc.buyer_address || ''}</div>
      <div>${doc.buyer_country || ''}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${product ? product.name : '-'}</td>
        <td style="text-align:right">${doc.quantity ? UI.num(doc.quantity) : '-'}</td>
        <td style="text-align:right">${doc.unit_price ? (doc.currency || 'USD') + ' ' + doc.unit_price : '-'}</td>
        <td style="text-align:right">${doc.total_amount ? (doc.currency || 'USD') + ' ' + UI.num(doc.total_amount) : '-'}</td>
      </tr>
    </tbody>
  </table>
  <div class="total">TOTAL: ${doc.currency || 'USD'} ${doc.total_amount ? Number(doc.total_amount).toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}</div>
  <div style="margin-top:16px;font-size:12px">
    <div><strong>Payment Terms:</strong> ${doc.incoterms || 'FOB'}</div>
    ${doc.notes ? `<div style="margin-top:8px"><strong>Remarks:</strong> ${doc.notes}</div>` : ''}
  </div>
  <div class="footer">
    <div>Generated by NARU Export Platform | (주)모티브이노베이션</div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } else {
      // Fallback: download as HTML
      const blob = new Blob([printHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dtype.id}_${doc.doc_number || Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  },

  async duplicate(docId) {
    const docs = S._documents || [];
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    const { data: newDoc, error } = await sb.from('documents').insert({
      product_id: doc.product_id,
      type: doc.type,
      status: 'completed',
      content: doc.content,
      buyer_name: doc.buyer_name,
      buyer_country: doc.buyer_country,
      buyer_address: doc.buyer_address,
      incoterms: doc.incoterms,
      currency: doc.currency,
      quantity: doc.quantity,
      unit_price: doc.unit_price,
      total_amount: doc.total_amount,
      notes: doc.notes,
      doc_number: `NARU-${doc.type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      created_by: S.user.id
    }).select().single();

    if (error) {
      UI.toast('복제 실패: ' + UI.err(error), 'error');
      return;
    }

    UI.toast('서류가 복제되었습니다.', 'success');
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    await Docs.loadDocuments();
    notify();
  },

  async checkConsistency() {
    const docs = S._documents || [];
    if (docs.length < 2) {
      UI.toast('검사할 서류가 2개 이상 필요합니다.', 'warn');
      return;
    }

    UI.toast('일관성 검사 중...', 'info');

    // Group by product
    const byProduct = {};
    docs.filter(d => d.status === 'completed').forEach(d => {
      if (!byProduct[d.product_id]) byProduct[d.product_id] = [];
      byProduct[d.product_id].push(d);
    });

    let issues = [];

    Object.entries(byProduct).forEach(([pid, productDocs]) => {
      if (productDocs.length < 2) return;
      const product = S.products.find(p => p.id === pid);

      // Check quantity consistency
      const qtys = productDocs.filter(d => d.quantity).map(d => d.quantity);
      if (qtys.length > 1 && new Set(qtys).size > 1) {
        issues.push({
          product: product?.name || pid,
          type: 'quantity',
          msg: `수량 불일치: ${productDocs.map(d => `${d.type.toUpperCase()}=${d.quantity || '미기재'}`).join(', ')}`
        });
      }

      // Check total amount consistency
      const amounts = productDocs.filter(d => d.total_amount).map(d => d.total_amount);
      if (amounts.length > 1 && new Set(amounts.map(a => Math.round(a * 100))).size > 1) {
        issues.push({
          product: product?.name || pid,
          type: 'amount',
          msg: `금액 불일치: ${productDocs.map(d => `${d.type.toUpperCase()}=${d.total_amount || '미기재'}`).join(', ')}`
        });
      }

      // Check buyer consistency
      const buyers = productDocs.filter(d => d.buyer_name).map(d => d.buyer_name);
      if (buyers.length > 1 && new Set(buyers).size > 1) {
        issues.push({
          product: product?.name || pid,
          type: 'buyer',
          msg: `바이어 불일치: ${productDocs.map(d => `${d.type.toUpperCase()}=${d.buyer_name || '미기재'}`).join(', ')}`
        });
      }
    });

    let body = '';
    if (issues.length === 0) {
      body += '<div style="text-align:center;padding:20px">';
      body += '<div style="font-size:40px;margin-bottom:12px">✅</div>';
      body += '<div style="font-size:16px;font-weight:700;color:#22c55e">일관성 검사 통과</div>';
      body += '<p style="font-size:13px;color:var(--tx2);margin-top:8px">모든 서류의 수량, 금액, 바이어 정보가 일치합니다.</p>';
      body += '</div>';
    } else {
      body += '<div style="margin-bottom:12px">';
      body += `<div style="font-size:14px;font-weight:700;color:var(--red);margin-bottom:8px">⚠️ ${issues.length}건의 불일치 발견</div>`;
      issues.forEach(issue => {
        body += `<div style="padding:10px;background:var(--red-bg);border:1px solid rgba(239,68,68,.2);border-radius:var(--radius-sm);margin-bottom:8px">`;
        body += `<div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:2px">${issue.product}</div>`;
        body += `<div style="font-size:12px;color:var(--red)">${issue.msg}</div>`;
        body += '</div>';
      });
      body += '</div>';
      body += '<p style="font-size:12px;color:var(--tx2)">서류를 수정하여 불일치를 해결하세요. 세관 통관 시 일관성이 중요합니다.</p>';
    }

    UI.modal('서류 일관성 검사 결과', body, { width: '500px' });
  }
};

// Handle document generation after payment redirect
Docs.handlePaymentReturn = async function() {
  const pending = sessionStorage.getItem('naru_pending_doc');
  if (!pending) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('pay') !== 'success') return;

  sessionStorage.removeItem('naru_pending_doc');
  try {
    const d = JSON.parse(pending);
    const dtype = DOC_TYPES.find(t => t.id === d.docType);
    UI.toast(`결제 완료! ${dtype?.ko || '서류'} 생성 중...`, 'info');

    const totalAmount = (d.qty && d.unitPrice) ? d.qty * d.unitPrice : null;
    const { data: doc, error } = await sb.from('documents').insert({
      user_id: S.user.id, product_id: d.productId, type: d.docType,
      doc_type: d.docType, status: 'generating', version: 1, language: 'en',
      buyer_name: d.buyerName || null, buyer_country: d.buyerCountry || null,
      buyer_address: d.buyerAddress || null, incoterms: d.incoterms,
      currency: d.currency, quantity: d.qty, unit_price: d.unitPrice,
      total_amount: totalAmount, notes: d.notes || null, created_by: S.user.id
    }).select().single();

    if (error) { UI.toast('서류 생성 실패: ' + UI.err(error), 'error'); return; }

    const result = await API.generateDoc(d.docType, null, {
      document_id: doc.id, product_id: d.productId,
      buyer: { name: d.buyerName, country: d.buyerCountry, address: d.buyerAddress },
      trade: { incoterms: d.incoterms, currency: d.currency, quantity: d.qty, unit_price: d.unitPrice },
      notes: d.notes
    });

    await sb.from('documents').update({
      status: 'completed', content: result.content || result,
      doc_number: result.doc_number || `NARU-${d.docType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    }).eq('id', doc.id);

    UI.toast(`${dtype?.ko || '서류'} 생성 완료!`, 'success');
    await Docs.loadDocuments();
    notify();
  } catch (e) {
    UI.toast('서류 생성 오류: ' + UI.err(e), 'error');
  }
};

window.Docs = Docs;
