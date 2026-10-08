import PDFDocument from 'pdfkit';

export async function syntheticPdf(label: string, attachment?: Buffer, attachmentType = 'application/octet-stream'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('error', reject);
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.text(`BSS synthetic operational fixture: ${label}`);
    if (attachment) pdf.file(attachment, { name: 'eicar.com', type: attachmentType });
    pdf.end();
  });
}

/** Small valid fixtures with exact xref offsets, including escaped PDF names. */
export function structurePdf(extraObjects: string[] = [], catalogExtra = '', pageExtra = ''): Buffer {
  const objects = [`<< /Type /Catalog /Pages 2 0 R ${catalogExtra} >>`, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> ${pageExtra} >>`, ...extraObjects];
  let content = '%PDF-1.7\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(content, 'latin1'));
    content += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = Buffer.byteLength(content, 'latin1');
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  content += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(`${content}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`, 'latin1');
}
