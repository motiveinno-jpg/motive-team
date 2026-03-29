// /app/dealroom/docs/render/sli.js
// Renders a Shipper's Letter of Instruction PDF from document.content using jsPDF + autoTable

export function renderSLIToPdf(document) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) { alert('PDF 라이브러리가 로드되지 않았습니다.'); return; }

  const c = document.content || {};
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFontSize(17);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text("SHIPPER'S LETTER OF INSTRUCTION", pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const docNo = document.doc_number || 'N/A';
  const dateStr = c.generated_at ? new Date(c.generated_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  doc.text(`SLI No: ${docNo}`, margin, y);
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Shipper / Forwarding Agent
  doc.setFontSize(9);
  const halfWidth = (pageWidth - margin * 2) / 2;
  doc.setFont(undefined, 'bold');
  doc.text('SHIPPER', margin, y);
  doc.text('FORWARDING AGENT', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const shipper = c.shipper || c.seller || {};
  const agent = c.forwarding_agent || c.agent || {};
  const shipperLines = [
    shipper.company || shipper.name || 'N/A',
    shipper.address || '',
    shipper.phone || '',
  ].filter(Boolean);
  const agentLines = [
    agent.company || agent.name || 'N/A',
    agent.address || '',
    agent.phone || '',
  ].filter(Boolean);
  const maxLines = Math.max(shipperLines.length, agentLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (shipperLines[i]) doc.text(shipperLines[i], margin, y);
    if (agentLines[i]) doc.text(agentLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // Consignee / Notify Party
  doc.setFont(undefined, 'bold');
  doc.text('CONSIGNEE', margin, y);
  doc.text('NOTIFY PARTY', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const consignee = c.consignee || c.buyer || {};
  const notifyParty = c.notify_party || {};
  const consigneeLines = [
    consignee.company || consignee.name || 'N/A',
    consignee.address || '',
  ].filter(Boolean);
  const notifyLines = [
    notifyParty.company || notifyParty.name || 'SAME AS CONSIGNEE',
    notifyParty.address || '',
  ].filter(Boolean);
  const maxPartyLines = Math.max(consigneeLines.length, notifyLines.length);
  for (let i = 0; i < maxPartyLines; i++) {
    if (consigneeLines[i]) doc.text(consigneeLines[i], margin, y);
    if (notifyLines[i]) doc.text(notifyLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // Shipping instructions
  doc.setFont(undefined, 'bold');
  doc.text('SHIPPING INSTRUCTIONS', margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');

  const shippingDetails = [
    ['Mode of Transport', c.transport_mode || c.mode || 'N/A'],
    ['Vessel / Flight', c.vessel || c.flight || 'N/A'],
    ['Port of Loading', c.port_of_loading || 'N/A'],
    ['Port of Discharge', c.port_of_discharge || 'N/A'],
    ['Final Destination', c.final_destination || c.destination || 'N/A'],
  ];

  doc.autoTable({
    startY: y,
    body: shippingDetails.map(([label, value]) => [label, value]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [255, 251, 235] },
      1: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // Goods description table
  const items = Array.isArray(c.items) ? c.items : [];
  if (items.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('GOODS DESCRIPTION', margin, y);
    y += 5;

    const tableData = items.map((item, idx) => [
      idx + 1,
      item.product_name || item.description || 'N/A',
      fmt(item.qty),
      item.gross_weight ? fmt(item.gross_weight) + ' kg' : '-',
      item.value ? cur(item.value, c.currency) : '-',
    ]);

    doc.autoTable({
      startY: y,
      head: [['#', 'Description', 'Qty', 'Gross Weight', 'Value for Customs']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Declared value for customs
  if (c.customs_value) {
    doc.setFont(undefined, 'bold');
    doc.text(`Declared Value for Customs: ${cur(c.customs_value, c.currency)}`, margin, y);
    y += 7;
  }

  // Special instructions
  if (c.special_instructions || c.notes || document.notes) {
    doc.setFont(undefined, 'bold');
    doc.text('SPECIAL INSTRUCTIONS:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(c.special_instructions || c.notes || document.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // Signature
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Shipper Signature', margin, y);

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Generated by Whistle AI - Export Management Platform', pageWidth / 2, y, { align: 'center' });

  doc.save(`${document.doc_number || 'SLI'}_${dateStr.replace(/\//g, '-')}.pdf`);
}

function fmt(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '0'; }
function cur(n, c = 'USD') {
  const v = Number(n); if (!Number.isFinite(v)) return '-';
  const s = { USD: '$', KRW: '₩', JPY: '¥', EUR: '€' }[c] || c + ' ';
  return s + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
