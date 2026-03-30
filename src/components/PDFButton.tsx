import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Expense } from '../types';
import { pdf } from '@react-pdf/renderer';
import TripReportPDF, { TripSummaryPDF, ExpensePagePDF, PDFExpenseDetailPagePDF } from './TripReportPDF';
import { FileText, Loader2 } from 'lucide-react';
import { mergePDFs } from '../lib/pdfUtils';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';

interface PDFButtonProps {
  trip: Trip;
  variant?: 'full' | 'compact';
}

export default function PDFButton({ trip, variant = 'full' }: PDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // 1. Fetch expenses
      const q = query(
        collection(db, 'expenses'),
        where('tripId', '==', trip.id),
        orderBy('createdAt', 'asc') // Changed to ascending for report flow
      );
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

      // 2. Generate PDF Parts in Order
      const parts: (ArrayBuffer | string)[] = [];
      
      // Part 1: Summary Page
      const summaryBlob = await pdf(<TripSummaryPDF trip={trip} expenses={expenses} />).toBlob();
      parts.push(await summaryBlob.arrayBuffer());

      // Parts 2+: Expenses in order
      for (const expense of expenses) {
        if (!expense.billImageUrl) continue;

        if (expense.billImageUrl.startsWith('data:application/pdf')) {
          // PDF Attachment - Add detail page first
          const detailBlob = await pdf(<PDFExpenseDetailPagePDF expense={expense} />).toBlob();
          parts.push(await detailBlob.arrayBuffer());
          
          // Then add the PDF itself
          parts.push(expense.billImageUrl);
        } else {
          // Image Attachment - Generate a page for it
          const pageBlob = await pdf(<ExpensePagePDF expense={expense} />).toBlob();
          parts.push(await pageBlob.arrayBuffer());
        }
      }

      // 3. Merge all parts
      const finalBlob = await mergePDFs(parts);
      
      if (!finalBlob || finalBlob.size === 0) {
        throw new Error("Generated PDF is empty");
      }

      // 4. Trigger Download
      const fileName = `Reimbful_${trip.tripTitle.replace(/\s+/g, '_')}.pdf`;
      
      // For mobile/iframe reliability, we'll try saveAs first, 
      // but also provide a fallback or use a more direct method if needed.
      try {
        console.log("Triggering download for blob size:", finalBlob.size);
        saveAs(finalBlob, fileName);
      } catch (saveError) {
        console.error("saveAs failed, trying manual download:", saveError);
        const url = URL.createObjectURL(finalBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }

      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button 
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 text-neutral-600 font-bold text-sm hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><FileText className="w-4 h-4" /> Bills</>
        )}
      </button>
    );
  }

  return (
    <div className="flex-1">
      <button 
        onClick={handleDownload}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><FileText className="w-4 h-4" /> Bills</>
        )}
      </button>
    </div>
  );
}
