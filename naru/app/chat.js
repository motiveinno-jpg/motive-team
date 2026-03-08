/**
 * NARU Chat — 딜 메시지 시스템
 * Supabase Realtime 기반, 자동번역, 서류 공유, 거래 단계 관리
 */

Router.register('chat', function(state) {
  const deals = state._deals || [];

  if (deals.length === 0 && state.products.length === 0) {
    return UI.empty('💬', '아직 진행 중인 거래가 없습니다',
      '바이어 매칭 후 거래가 시작되면 여기서 소통할 수 있습니다.',
      '제품 등록하기', "Router.go('analyze')");
  }

  let h = '';

  // Chat layout: thread list + messages
  h += '<div style="display:grid;grid-template-columns:280px 1fr;gap:0;height:calc(100vh - 72px);border:1px solid var(--bd);border-radius:var(--radius-lg);overflow:hidden">';

  // Left: Thread list
  h += '<div style="background:var(--s1);border-right:1px solid var(--bd);display:flex;flex-direction:column">';

  // Thread header
  h += '<div style="padding:16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:8px">';
  h += '<h3 style="font-size:15px;font-weight:700;color:#fff;flex:1">거래 채팅</h3>';
  h += `<span style="font-size:12px;color:var(--tx2)">${deals.length}건</span>`;
  h += '</div>';

  // Thread list
  h += '<div style="flex:1;overflow-y:auto">';

  if (deals.length === 0) {
    h += '<div style="padding:24px;text-align:center;color:var(--tx2);font-size:12px">';
    h += '진행 중인 거래가 없습니다.<br><br>';
    h += '바이어와 매칭되면 거래 채팅이 자동으로 생성됩니다.';
    h += '</div>';
  }

  const activeDealId = state._activeDealId || (deals[0] && deals[0].id);

  deals.forEach(deal => {
    const isActive = deal.id === activeDealId;
    const product = state.products.find(p => p.id === deal.product_id);
    const unread = deal.unread_count || 0;

    h += `<div onclick="Chat.selectDeal('${deal.id}')" style="padding:14px 16px;cursor:pointer;border-bottom:1px solid var(--bd);background:${isActive ? 'var(--pri-bg)' : 'transparent'};transition:background .2s">`;
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
    h += `<div style="font-size:13px;font-weight:700;color:${isActive ? 'var(--pri)' : '#fff'};flex:1">${deal.buyer_name || 'Buyer'}</div>`;
    if (unread > 0) {
      h += `<span style="background:var(--pri);color:#000;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;min-width:18px;text-align:center">${unread}</span>`;
    }
    h += '</div>';
    h += `<div style="font-size:11px;color:var(--tx2);margin-bottom:2px">${product ? UI.trunc(product.name, 25) : ''}</div>`;
    h += '<div style="display:flex;align-items:center;gap:6px">';
    h += Chat._stageBadge(deal.stage);
    if (deal.last_message_at) {
      h += `<span style="font-size:10px;color:var(--tx3);margin-left:auto">${UI.ago(deal.last_message_at)}</span>`;
    }
    h += '</div>';
    if (deal.last_message) {
      h += `<div style="font-size:11px;color:var(--tx3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.trunc(deal.last_message, 35)}</div>`;
    }
    h += '</div>';
  });

  h += '</div></div>';

  // Right: Message area
  h += '<div style="display:flex;flex-direction:column;background:var(--bg)">';

  if (!activeDealId || deals.length === 0) {
    h += '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--tx2);font-size:14px">';
    h += '거래를 선택하세요';
    h += '</div>';
  } else {
    const deal = deals.find(d => d.id === activeDealId);
    if (deal) {
      // Message header
      h += '<div style="padding:14px 20px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:12px">';
      h += '<div style="flex:1">';
      h += `<div style="font-size:14px;font-weight:700;color:#fff">${deal.buyer_name || 'Buyer'}</div>`;
      h += `<div style="font-size:11px;color:var(--tx2)">${deal.buyer_country || ''}</div>`;
      h += '</div>';
      h += Chat._stageBadge(deal.stage);
      h += '<div style="display:flex;gap:6px">';
      h += `<button onclick="Chat.showDealInfo('${deal.id}')" class="btn btn-ghost btn-sm">거래정보</button>`;
      h += `<button onclick="Chat.toggleTranslate()" class="btn btn-ghost btn-sm" id="translate-toggle" style="font-size:11px">🌐 번역</button>`;
      h += '</div>';
      h += '</div>';

      // Messages area
      h += `<div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:8px">`;
      h += Chat._renderMessages(deal);
      h += '</div>';

      // Input area
      h += '<div style="padding:12px 20px;border-top:1px solid var(--bd);background:var(--s1)">';

      // Quick actions
      h += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">';
      h += `<button onclick="Chat.sendQuickAction('${deal.id}','quote')" class="btn btn-ghost btn-sm" style="font-size:11px">📋 견적 요청</button>`;
      h += `<button onclick="Chat.sendQuickAction('${deal.id}','sample')" class="btn btn-ghost btn-sm" style="font-size:11px">📦 샘플 요청</button>`;
      h += `<button onclick="Chat.shareDocument('${deal.id}')" class="btn btn-ghost btn-sm" style="font-size:11px">📄 서류 공유</button>`;
      h += `<button onclick="Chat.advanceStage('${deal.id}')" class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--grn)">⏩ 단계 진행</button>`;
      h += '</div>';

      // Message input
      h += '<div style="display:flex;gap:8px;align-items:flex-end">';
      h += `<label style="cursor:pointer;padding:8px;color:var(--tx2)" title="파일 첨부">`;
      h += `<input type="file" id="chat-file" style="display:none" onchange="Chat.handleFile(event)">📎</label>`;
      h += `<textarea id="chat-input" class="form-input" rows="1" placeholder="메시지를 입력하세요..." style="flex:1;min-height:40px;max-height:120px;resize:none" onkeydown="Chat.handleKey(event,'${deal.id}')"></textarea>`;
      h += `<button onclick="Chat.sendMessage('${deal.id}')" class="btn btn-pri btn-sm" style="padding:10px 16px">전송</button>`;
      h += '</div>';

      h += '</div>';
    }
  }

  h += '</div></div>';

  return h;
});

const Chat = {
  _translate: false,
  _messages: {},
  _realtimeChannel: null,

  _stageBadge(stage) {
    const stages = {
      'inquiry': ['문의', 'pri'],
      'negotiation': ['협상', 'ylw'],
      'sample': ['샘플', 'acc'],
      'order': ['주문', 'org'],
      'payment': ['결제', 'pri'],
      'shipping': ['출하', 'grn'],
      'completed': ['완료', 'grn']
    };
    const [label, type] = stages[stage] || ['진행중', 'default'];
    return UI.badge(label, type);
  },

  _renderMessages(deal) {
    const messages = Chat._messages[deal.id] || [];
    if (messages.length === 0) {
      return '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--tx2);font-size:13px">첫 메시지를 보내보세요.</div>';
    }

    let h = '';
    let lastDate = '';

    messages.forEach(msg => {
      // Date separator
      const msgDate = UI.date(msg.created_at);
      if (msgDate !== lastDate) {
        h += `<div style="text-align:center;padding:8px;font-size:11px;color:var(--tx3)">${msgDate}</div>`;
        lastDate = msgDate;
      }

      const isMine = msg.sender_id === S.user?.id;

      h += `<div style="display:flex;${isMine ? 'justify-content:flex-end' : 'justify-content:flex-start'};gap:8px">`;

      if (!isMine) {
        // Avatar
        h += `<div style="width:32px;height:32px;border-radius:50%;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${msg.sender_name ? msg.sender_name[0].toUpperCase() : '?'}</div>`;
      }

      h += '<div style="max-width:70%">';

      // Sender name (for received)
      if (!isMine && msg.sender_name) {
        h += `<div style="font-size:10px;color:var(--tx2);margin-bottom:2px">${msg.sender_name}</div>`;
      }

      // Message bubble
      h += `<div style="padding:10px 14px;border-radius:${isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};background:${isMine ? 'var(--pri)' : 'var(--s2)'};color:${isMine ? '#000' : '#fff'};font-size:13px;line-height:1.5;word-break:break-word">`;

      // File attachment
      if (msg.file_url) {
        h += `<div style="margin-bottom:6px"><a href="${msg.file_url}" target="_blank" style="color:${isMine ? '#003' : 'var(--pri)'};font-size:12px">📎 ${msg.file_name || '첨부파일'}</a></div>`;
      }

      h += msg.content || '';

      // Translated text
      if (Chat._translate && msg.translated) {
        h += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${isMine ? 'rgba(0,0,0,.1)' : 'var(--bd)'};font-size:11px;color:${isMine ? 'rgba(0,0,0,.6)' : 'var(--tx2)'}">🌐 ${msg.translated}</div>`;
      }

      h += '</div>';

      // Time
      h += `<div style="font-size:10px;color:var(--tx3);margin-top:4px;${isMine ? 'text-align:right' : ''}">${new Date(msg.created_at).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'})}</div>`;

      h += '</div>';
      h += '</div>';
    });

    return h;
  },

  selectDeal(dealId) {
    S._activeDealId = dealId;
    Chat.loadMessages(dealId);
    Chat.subscribeRealtime(dealId);
    notify();
  },

  async loadDeals() {
    if (!S.company) return;
    const { data } = await sb.from('matchings')
      .select('*')
      .eq('seller_company_id', S.company.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    S._deals = data || [];
  },

  async loadMessages(dealId) {
    const { data } = await sb.from('messages')
      .select('*')
      .eq('matching_id', dealId)
      .order('created_at', { ascending: true })
      .limit(200);
    Chat._messages[dealId] = data || [];

    // Mark as read
    await sb.from('matchings').update({ unread_count: 0 }).eq('id', dealId);

    // Scroll to bottom after render
    setTimeout(() => {
      const el = document.getElementById('chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  },

  subscribeRealtime(dealId) {
    // Unsubscribe previous
    if (Chat._realtimeChannel) {
      sb.removeChannel(Chat._realtimeChannel);
    }

    Chat._realtimeChannel = sb.channel('messages-' + dealId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `matching_id=eq.${dealId}`
      }, payload => {
        const msg = payload.new;
        if (!Chat._messages[dealId]) Chat._messages[dealId] = [];
        Chat._messages[dealId].push(msg);
        notify();
        // Scroll to bottom
        setTimeout(() => {
          const el = document.getElementById('chat-messages');
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      })
      .subscribe();

    S._realtimeSubs.push(Chat._realtimeChannel);
  },

  handleKey(e, dealId) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      Chat.sendMessage(dealId);
    }
    // Auto-resize textarea
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  },

  async sendMessage(dealId) {
    const input = document.getElementById('chat-input');
    const content = input?.value?.trim();
    if (!content) return;

    input.value = '';
    input.style.height = 'auto';

    const msgData = {
      matching_id: dealId,
      sender_id: S.user.id,
      sender_name: S.company?.name || S.user.email,
      content,
      type: 'text'
    };

    // Auto-translate if enabled
    if (Chat._translate) {
      try {
        const result = await API.translate(content, 'en');
        msgData.translated = result.translated || result.text;
      } catch (e) {
        // Translation failed, send without
      }
    }

    const { error } = await sb.from('messages').insert(msgData);
    if (error) {
      UI.toast('메시지 전송 실패: ' + UI.err(error), 'error');
      return;
    }

    // Update last message in deal
    await sb.from('matchings').update({
      last_message: content,
      last_message_at: new Date().toISOString()
    }).eq('id', dealId);
  },

  async handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      UI.toast('파일 크기는 10MB 이하여야 합니다.', 'warn');
      return;
    }

    UI.toast('파일 업로드 중...', 'info');

    const path = `chat/${S.user.id}/${Date.now()}_${file.name}`;
    const { data, error } = await sb.storage.from('attachments').upload(path, file);

    if (error) {
      UI.toast('파일 업로드 실패: ' + UI.err(error), 'error');
      return;
    }

    const { data: urlData } = sb.storage.from('attachments').getPublicUrl(path);
    const fileUrl = urlData?.publicUrl;

    const dealId = S._activeDealId;
    if (!dealId) return;

    await sb.from('messages').insert({
      matching_id: dealId,
      sender_id: S.user.id,
      sender_name: S.company?.name || S.user.email,
      content: `📎 ${file.name}`,
      type: 'file',
      file_url: fileUrl,
      file_name: file.name
    });

    UI.toast('파일이 전송되었습니다.', 'success');
    event.target.value = '';
  },

  toggleTranslate() {
    Chat._translate = !Chat._translate;
    const btn = document.getElementById('translate-toggle');
    if (btn) {
      btn.style.background = Chat._translate ? 'var(--pri-bg)' : '';
      btn.style.borderColor = Chat._translate ? 'var(--pri)' : '';
    }
    notify();
  },

  async sendQuickAction(dealId, action) {
    const actions = {
      quote: '안녕하세요, 이 제품의 견적서(Proforma Invoice)를 요청드립니다. 수량 및 목적지를 알려주시면 정확한 견적을 보내드리겠습니다.',
      sample: '샘플 요청드립니다. 샘플 비용 및 배송 기간을 알려주시면 감사하겠습니다.'
    };

    const content = actions[action];
    if (!content) return;

    document.getElementById('chat-input').value = content;
    document.getElementById('chat-input').focus();
  },

  async shareDocument(dealId) {
    const docs = S._documents || [];
    if (docs.length === 0) {
      UI.toast('공유할 서류가 없습니다. 서류함에서 먼저 생성하세요.', 'warn');
      return;
    }

    let body = '<div style="font-size:13px;color:var(--tx2);margin-bottom:12px">공유할 서류를 선택하세요:</div>';
    docs.filter(d => d.status === 'completed').forEach(doc => {
      const dtype = DOC_TYPES?.find(d => d.id === doc.type) || { ko: doc.type, icon: '📄' };
      body += `<div onclick="Chat._sendDocMessage('${dealId}','${doc.id}')" style="padding:10px;cursor:pointer;border:1px solid var(--bd);border-radius:var(--radius-sm);margin-bottom:6px;display:flex;align-items:center;gap:8px;transition:border-color .2s" onmouseover="this.style.borderColor='var(--pri)'" onmouseout="this.style.borderColor='var(--bd)'">`
      body += `<span>${dtype.icon}</span>`;
      body += `<div style="flex:1"><div style="font-size:13px;font-weight:600;color:#fff">${dtype.ko}</div><div style="font-size:11px;color:var(--tx2)">${doc.doc_number || ''} | ${UI.date(doc.created_at)}</div></div>`;
      body += '</div>';
    });
    UI.modal('서류 공유', body, { width: '400px' });
  },

  async _sendDocMessage(dealId, docId) {
    const docs = S._documents || [];
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    const dtype = (typeof DOC_TYPES !== 'undefined' ? DOC_TYPES : []).find(d => d.id === doc.type) || { ko: doc.type };

    await sb.from('messages').insert({
      matching_id: dealId,
      sender_id: S.user.id,
      sender_name: S.company?.name || S.user.email,
      content: `📄 ${dtype.ko} (${doc.doc_number || ''}) 서류를 공유합니다.`,
      type: 'document',
      metadata: { document_id: docId, doc_type: doc.type }
    });

    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    UI.toast('서류가 공유되었습니다.', 'success');
  },

  async advanceStage(dealId) {
    const deal = (S._deals || []).find(d => d.id === dealId);
    if (!deal) return;

    const stageOrder = ['inquiry', 'negotiation', 'sample', 'order', 'payment', 'shipping', 'completed'];
    const currentIdx = stageOrder.indexOf(deal.stage || 'inquiry');
    const nextStage = stageOrder[currentIdx + 1];

    if (!nextStage) {
      UI.toast('이미 최종 단계입니다.', 'info');
      return;
    }

    const stageLabels = {
      negotiation: '협상',
      sample: '샘플',
      order: '주문',
      payment: '결제',
      shipping: '출하',
      completed: '완료'
    };

    const ok = await UI.confirm(`거래를 "${stageLabels[nextStage]}" 단계로 진행하시겠습니까?`);
    if (!ok) return;

    const { error } = await sb.from('matchings').update({ stage: nextStage }).eq('id', dealId);
    if (error) {
      UI.toast('단계 변경 실패: ' + UI.err(error), 'error');
      return;
    }

    deal.stage = nextStage;

    // Also update product status in pipeline
    if (deal.product_id) {
      const pipelineMap = {
        inquiry: 'matching',
        negotiation: 'dealing',
        sample: 'dealing',
        order: 'dealing',
        payment: 'documenting',
        shipping: 'shipped',
        completed: 'shipped'
      };
      const pipelineStage = pipelineMap[nextStage];
      if (pipelineStage) {
        await sb.from('products').update({ status: pipelineStage }).eq('id', deal.product_id);
        const p = S.products.find(x => x.id === deal.product_id);
        if (p) p.status = pipelineStage;
      }
    }

    // Send system message
    await sb.from('messages').insert({
      matching_id: dealId,
      sender_id: S.user.id,
      sender_name: 'NARU',
      content: `거래 단계가 "${stageLabels[nextStage]}"(으)로 변경되었습니다.`,
      type: 'system'
    });

    UI.toast(`${stageLabels[nextStage]} 단계로 진행했습니다.`, 'success');
    notify();
  },

  showDealInfo(dealId) {
    const deal = (S._deals || []).find(d => d.id === dealId);
    if (!deal) return;

    const product = S.products.find(p => p.id === deal.product_id);

    let body = '';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">';
    body += `<div><span style="color:var(--tx2)">바이어:</span><br><strong style="color:#fff">${deal.buyer_name || '-'}</strong></div>`;
    body += `<div><span style="color:var(--tx2)">국가:</span><br><strong style="color:#fff">${deal.buyer_country || '-'}</strong></div>`;
    body += `<div><span style="color:var(--tx2)">제품:</span><br><strong style="color:#fff">${product ? product.name : '-'}</strong></div>`;
    body += `<div><span style="color:var(--tx2)">단계:</span><br>${Chat._stageBadge(deal.stage)}</div>`;
    body += `<div><span style="color:var(--tx2)">시작일:</span><br><strong style="color:#fff">${UI.date(deal.created_at)}</strong></div>`;
    body += `<div><span style="color:var(--tx2)">마지막 메시지:</span><br><strong style="color:#fff">${deal.last_message_at ? UI.ago(deal.last_message_at) : '-'}</strong></div>`;
    body += '</div>';

    // Stage progress
    const stageOrder = ['inquiry', 'negotiation', 'sample', 'order', 'payment', 'shipping', 'completed'];
    const stageLabels = ['문의', '협상', '샘플', '주문', '결제', '출하', '완료'];
    const currentIdx = stageOrder.indexOf(deal.stage || 'inquiry');

    body += '<div style="margin-top:20px">';
    body += '<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">거래 진행도</div>';
    body += '<div style="display:flex;gap:2px">';
    stageOrder.forEach((s, i) => {
      const isComplete = i <= currentIdx;
      const isCurrent = i === currentIdx;
      body += `<div style="flex:1;text-align:center">`;
      body += `<div style="height:4px;border-radius:2px;background:${isComplete ? 'var(--pri)' : 'var(--s3)'};margin-bottom:4px"></div>`;
      body += `<div style="font-size:9px;color:${isCurrent ? 'var(--pri)' : 'var(--tx3)'};font-weight:${isCurrent ? '700' : '400'}">${stageLabels[i]}</div>`;
      body += '</div>';
    });
    body += '</div></div>';

    UI.modal('거래 정보', body, { width: '480px' });
  }
};

window.Chat = Chat;
