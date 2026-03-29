// /app/dealroom/docs/render/lc.js
// Renders a Letter of Credit Application PDF from document.content using jsPDF + autoTable

export function renderLCToPdf(document) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) { alert('PDF 라이브러리가 로드되지 않았습니다.'); return; }

  const c = document.content || {};
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text('LETTER OF CREDIT APPLICATION', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const docNo = document.doc_number || c.lc_no || 'N/A';
  const dateStr = c.generated_at ? new Date(c.generated_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  doc.text(`L/C No: ${docNo}`, margin, y);
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(225, 29, 72);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Applicant / Beneficiary
  doc.setFontSize(9);
  const halfWidth = (pageWidth - margin * 2) / 2;
  doc.setFont(undefined, 'bold');
  doc.text('APPLICANT (Buyer)', margin, y);
  doc.text('BENEFICIARY (Seller)', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const applicant = c.applicant || c.buyer || {};
  const beneficiary = c.beneficiary || c.seller || {};
  const applicantLines = [
    applicant.company || applicant.name || 'N/A',
    applicant.address || '',
    applicant.email || '',
  ].filter(Boolean);
  const beneficiaryLines = [
    beneficiary.company || beneficiary.name || 'N/A',
    beneficiary.address || '',
    beneficiary.email || '',
  ].filter(Boolean);
  const maxLines = Math.max(applicantLines.length, beneficiaryLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (applicantLines[i]) doc.text(applicantLines[i], margin, y);
    if (beneficiaryLines[i]) doc.text(beneficiaryLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // Bank info
  doc.setFont(undefined, 'bold');
  doc.text('ISSUING BANK', margin, y);
  doc.text('ADVISING BANK', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const issuingBank = c.issuing_bank || {};
  const advisingBank = c.advising_bank || {};
  const issuingLines = [
    issuingBank.name || issuingBank.company || 'N/A',
    issuingBank.address || '',
    issuingBank.swift ? `SWIFT: ${issuingBank.swift}` : '',
  ].filter(Boolean);
  const advisingLines = [
    advisingBank.name || advisingBank.company || 'N/A',
    advisingBank.address || '',
    advisingBank.swift ? `SWIFT: ${advisingBank.swift}` : '',
  ].filter(Boolean);
  const maxBankLines = Math.max(issuingLines.length, advisingLines.length);
  for (let i = 0; i < maxBankLines; i++) {
    if (issuingLines[i]) doc.text(issuingLines[i], margin, y);
    if (advisingLines[i]) doc.text(advisingLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // L/C details
  doc.setFont(undefined, 'bold');
  doc.text('CREDIT DETAILS', margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');

  const expiryDate = c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-US') : 'N/A';
  const lcDetails = [
    ['Amount', c.amount ? cur(c.amount, c.currency) : 'N/A'],
    ['Currency', c.currency || 'USD'],
    ['Expiry Date', expiryDate],
    ['Type', c.lc_type || 'Irrevocable'],
    ['Tenor', c.tenor || 'At Sight'],
    ['Partial Shipments', c.partial_shipments || 'Allowed'],
    ['Transshipment', c.transshipment || 'Allowed'],
  ];

  doc.autoTable({
    startY: y,
    body: lcDetails.map(([label, value]) => [label, value]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [255, 241, 242] },
      1: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // Required Documents
  const requiredDocs = Array.isArray(c.required_documents) ? c.required_documents : [];
  if (requiredDocs.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('REQUIRED DOCUMENTS', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    requiredDocs.forEach((docItem, idx) => {
      const text = typeof docItem === 'string' ? docItem : (docItem.name || docItem.description || '');
      doc.text(`${idx + 1}. ${text}`, margin + 3, y);
      y += 4.5;
    });
    y += 4;
  } else {
    // Default required documents
    doc.setFont(undefined, 'bold');
    doc.text('REQUIRED DOCUMENTS', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const defaultDocs = [
      'Commercial Invoice (original + 3 copies)',
      'Packing List (original + 3 copies)',
      'Bill of Lading (full set 3/3)',
      'Certificate of Origin',
      'Insurance Certificate',
    ];
    defaultDocs.forEach((d, idx) => {
      doc.text(`${idx + 1}. ${d}`, margin + 3, y);
      y += 4.5;
    });
    y += 4;
  }

  // Terms and conditions
  if (c.terms || c.conditions || c.notes || document.notes) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = margin; }
    doc.setFont(undefined, 'bold');
    doc.text('TERMS AND CONDITIONS:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(c.terms || c.conditions || c.notes || document.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // Signature
  if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = margin; }
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Applicant Signature', margin, y);

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Generated by Whistle AI - Export Management Platform', pageWidth / 2, y, { align: 'center' });

  doc.save(`${document.doc_number || 'LC'}_${dateStr.replace(/\//g, '-')}.pdf`);
}

function fmt(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '0'; }
function cur(n, c = 'USD') {
  const v = Number(n); if (!Number.isFinite(v)) return '-';
  const s = { USD: '$', KRW: '₩', JPY: '¥', EUR: '€' }[c] || c + ' ';
  return s + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
