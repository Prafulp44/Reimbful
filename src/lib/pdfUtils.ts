import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDFs into one in the order provided.
 * @param parts An array of ArrayBuffer (from @react-pdf/renderer) or base64 strings (from attachments)
 * @returns The merged PDF as a Blob
 */
export async function mergePDFs(parts: (ArrayBuffer | string)[]): Promise<Blob> {
  console.log(`Starting merge of ${parts.length} PDF parts`);
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    try {
      let partBytes: Uint8Array;
      if (typeof part === 'string') {
        console.log(`Processing part ${i+1}: base64 string`);
        // Remove data URL prefix if present
        const cleanBase64 = part.startsWith('data:application/pdf;base64,') 
          ? part.replace('data:application/pdf;base64,', '') 
          : part;
          
        partBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
      } else {
        console.log(`Processing part ${i+1}: ArrayBuffer`);
        partBytes = new Uint8Array(part);
      }
        
      const partPdf = await PDFDocument.load(partBytes);
      const copiedPages = await mergedPdf.copyPages(partPdf, partPdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      console.log(`Successfully merged part ${i+1}`);
    } catch (error) {
      console.error(`Error merging PDF part ${i+1}:`, error);
      // Skip failed parts
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  console.log(`Merge complete, total size: ${mergedPdfBytes.length} bytes`);
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}
