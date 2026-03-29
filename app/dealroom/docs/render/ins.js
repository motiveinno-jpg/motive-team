// /app/dealroom/docs/render/ins.js
// Renders an Insurance Certificate PDF from document.content using jsPDF + autoTable

export function renderINSToPdf(document) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) { alert('PDF 라이브러리가 로드되지 않았습니다.'); return; }

  const c = document.content || {};
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(124, 58, 237);
  doc.text('INSURANCE CERTIFICATE', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const docNo = document.doc_number || c.certificate_no || 'N/A';
  const dateStr = c.generated_at ? new Date(c.generated_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  doc.text(`Certificate No: ${docNo}`, margin, y);
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  // Policy No
  if (c.policy_no) {
    doc.text(`Policy No: ${c.policy_no}`, margin, y);
    y += 5;
  }

  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Insured / Beneficiary
  doc.setFontSize(9);
  const halfWidth = (pageWidth - margin * 2) / 2;
  doc.setFont(undefined, 'bold');
  doc.text('INSURED (Exporter)', margin, y);
  doc.text('BENEFICIARY (Buyer)', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const insured = c.insured || c.seller || {};
  const beneficiary = c.beneficiary || c.buyer || {};
  const insuredLines = [
    insured.company || insured.name || 'N/A',
    insured.address || '',
  ].filter(Boolean);
  const beneficiaryLines = [
    beneficiary.company || beneficiary.name || 'N/A',
    beneficiary.address || '',
  ].filter(Boolean);
  const maxLines = Math.max(insuredLines.length, beneficiaryLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (insuredLines[i]) doc.text(insuredLines[i], margin, y);
    if (beneficiaryLines[i]) doc.text(beneficiaryLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // Insurance details
  doc.setFont(undefined, 'bold');
  doc.text('INSURANCE DETAILS', margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');

  const coverageType = c.coverage_type || c.coverage || 'All Risks';
  const details = [
    ['Goods Description', c.goods_description || c.description || 'N/A'],
    ['Insured Value', c.insured_value ? cur(c.insured_value, c.currency) : 'N/A'],
    ['Coverage Type', coverageType],
    ['From', c.from || c.origin || 'N/A'],
    ['To', c.to || c.destination || 'N/A'],
    ['Vessel / Conveyance', c.vessel || c.conveyance || 'N/A'],
  ];

  doc.autoTable({
    startY: y,
    body: details.map(([label, value]) => [label, value]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [245, 243, 255] },
      1: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // Items table (if provided)
  const items = Array.isArray(c.items) ? c.items : [];
  if (items.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('INSURED GOODS', margin, y);
    y += 5;

    const tableData = items.map((item, idx) => [
      idx + 1,
      item.product_name || item.description || 'N/A',
      fmt(item.qty),
      item.value ? cur(item.value, c.currency) : '-',
    ]);

    doc.autoTable({
      startY: y,
      head: [['#', 'Description', 'Qty', 'Insured Value']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Claims settling agent
  if (c.claims_agent || c.claims_settling_agent) {
    doc.setFont(undefined, 'bold');
    doc.text('CLAIMS SETTLING AGENT', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const agent = c.claims_agent || c.claims_settling_agent || {};
    const agentName = typeof agent === 'string' ? agent : (agent.name || 'N/A');
    doc.text(agentName, margin, y);
    if (typeof agent === 'object' && agent.address) { y += 4.5; doc.text(agent.address, margin, y); }
    y += 7;
  }

  // Conditions
  if (c.conditions || c.terms) {
    doc.setFont(undefined, 'bold');
    doc.text('CONDITIONS:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(c.conditions || c.terms, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // Signature
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Authorized Signature (Insurer)', margin, y);

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Generated by Whistle AI - Export Management Platform', pageWidth / 2, y, { align: 'center' });

  doc.save(`${document.doc_number || 'INS'}_${dateStr.replace(/\//g, '-')}.pdf`);
}

function fmt(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '0'; }
function cur(n, c = 'USD') {
  const v = Number(n); if (!Number.isFinite(v)) return '-';
  const s = { USD: '$', KRW: '₩', JPY: '¥', EUR: '€' }[c] || c + ' ';
  return s + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
