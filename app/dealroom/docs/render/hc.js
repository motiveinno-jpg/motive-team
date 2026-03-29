// /app/dealroom/docs/render/hc.js
// Renders a Health/Phytosanitary Certificate PDF from document.content using jsPDF + autoTable

export function renderHCToPdf(document) {
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
  doc.setTextColor(4, 120, 87);
  doc.text('HEALTH / PHYTOSANITARY CERTIFICATE', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const docNo = document.doc_number || c.certificate_no || 'N/A';
  const dateStr = c.generated_at ? new Date(c.generated_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  doc.text(`Certificate No: ${docNo}`, margin, y);
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Certifying Authority
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('CERTIFYING AUTHORITY', margin, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const authority = c.certifying_authority || {};
  const authorityLines = [
    authority.name || 'Animal and Plant Quarantine Agency (APQA)',
    authority.address || '',
  ].filter(Boolean);
  authorityLines.forEach(line => { doc.text(line, margin, y); y += 4.5; });
  y += 4;

  // Exporter / Consignee
  const halfWidth = (pageWidth - margin * 2) / 2;
  doc.setFont(undefined, 'bold');
  doc.text('EXPORTER', margin, y);
  doc.text('CONSIGNEE', margin + halfWidth + 5, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const exporter = c.exporter || c.seller || {};
  const consignee = c.consignee || c.buyer || {};
  const exporterLines = [
    exporter.company || exporter.name || 'N/A',
    exporter.address || '',
  ].filter(Boolean);
  const consigneeLines = [
    consignee.company || consignee.name || 'N/A',
    consignee.address || '',
  ].filter(Boolean);
  const maxLines = Math.max(exporterLines.length, consigneeLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (exporterLines[i]) doc.text(exporterLines[i], margin, y);
    if (consigneeLines[i]) doc.text(consigneeLines[i], margin + halfWidth + 5, y);
    y += 4.5;
  }
  y += 4;

  // Product details
  doc.setFont(undefined, 'bold');
  doc.text('PRODUCT DETAILS', margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');

  const details = [
    ['Product Description', c.product_description || c.description || 'N/A'],
    ['Country of Origin', c.origin || 'REPUBLIC OF KOREA'],
    ['Destination Country', c.destination_country || c.destination || 'N/A'],
    ['Quantity', c.quantity ? fmt(c.quantity) + (c.unit ? ` ${c.unit}` : '') : 'N/A'],
    ['HS Code', c.hs_code || 'N/A'],
  ];

  doc.autoTable({
    startY: y,
    body: details.map(([label, value]) => [label, value]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [236, 253, 245] },
      1: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // Health declaration
  doc.setFont(undefined, 'bold');
  doc.text('HEALTH DECLARATION', margin, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const declaration = c.declaration || c.health_declaration ||
    'This is to certify that the products described above have been inspected and/or tested according to appropriate officially approved procedures and are considered to be free from quarantine pests and practically free from other injurious pests, and that they are considered to conform with the current phytosanitary requirements of the importing country.';
  const declLines = doc.splitTextToSize(declaration, pageWidth - margin * 2);
  doc.text(declLines, margin, y);
  y += declLines.length * 4.5 + 8;

  // Treatment info
  if (c.treatment) {
    doc.setFont(undefined, 'bold');
    doc.text('TREATMENT:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const treatLines = doc.splitTextToSize(c.treatment, pageWidth - margin * 2);
    doc.text(treatLines, margin, y);
    y += treatLines.length * 4.5 + 4;
  }

  // Official stamp area
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(1);
  doc.rect(pageWidth - margin - 55, y, 55, 25);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('OFFICIAL STAMP', pageWidth - margin - 27.5, y + 10, { align: 'center' });
  doc.setTextColor(0);

  // Signature
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 20, margin + 60, y + 20);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Authorized Officer Signature', margin, y + 25);

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Generated by Whistle AI - Export Management Platform', pageWidth / 2, y, { align: 'center' });

  doc.save(`${document.doc_number || 'HC'}_${dateStr.replace(/\//g, '-')}.pdf`);
}

function fmt(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '0'; }
