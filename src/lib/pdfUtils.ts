import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDFs into one in the order provided.
 * @param parts An array of ArrayBuffer (from @react-pdf/renderer) or base64 strings (from attachments)
 * @returns The merged PDF as a Blob
 */
export async function mergePDFs(parts: (ArrayBuffer | string)[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const part of parts) {
    try {
      let partBytes: Uint8Array;
      if (typeof part === 'string') {
        // Remove data URL prefix if present
        const cleanBase64 = part.startsWith('data:application/pdf;base64,') 
          ? part.replace('data:application/pdf;base64,', '') 
          : part;
          
        partBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
      } else {
        partBytes = new Uint8Array(part);
      }
        
      const partPdf = await PDFDocument.load(partBytes);
      const copiedPages = await mergedPdf.copyPages(partPdf, partPdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      console.error("Error merging PDF part:", error);
      // Skip failed parts
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}
