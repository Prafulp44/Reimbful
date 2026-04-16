import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Expense, ExpenseCategory } from '../types';
import { pdf } from '@react-pdf/renderer';
import { TripSummaryPDF, ExpensePagePDF, PDFExpenseDetailPagePDF } from './TripReportPDF';
import { FileText, Loader2 } from 'lucide-react';
import { mergePDFs } from '../lib/pdfUtils';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

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
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

      if (allExpenses.length === 0) {
        toast.error("No expenses found for this trip.");
        return;
      }

      // 2. Group expenses by category
      const categories: ExpenseCategory[] = ['Travel', 'Food', 'Lodging', 'Conveyance', 'Miscellaneous'];
      const dateStr = format(new Date(trip.startDate), 'ddMMyyyy');

      for (const category of categories) {
        const categoryExpenses = allExpenses.filter(e => e.category === category);
        if (categoryExpenses.length === 0) continue;

        // Generate PDF for this category
        const parts: (ArrayBuffer | string)[] = [];
        
        // Part 1: Summary Page
        const summaryBlob = await pdf(<TripSummaryPDF trip={trip} expenses={categoryExpenses} category={category} />).toBlob();
        parts.push(await summaryBlob.arrayBuffer());

        // Parts 2+: Expenses in category
        for (const expense of categoryExpenses) {
          if (!expense.billImageUrl) continue;

          if (expense.billImageUrl.startsWith('data:application/pdf')) {
            const detailBlob = await pdf(<PDFExpenseDetailPagePDF expense={expense} />).toBlob();
            parts.push(await detailBlob.arrayBuffer());
            parts.push(expense.billImageUrl);
          } else {
            const pageBlob = await pdf(<ExpensePagePDF expense={expense} />).toBlob();
            parts.push(await pageBlob.arrayBuffer());
          }
        }

        const finalBlob = await mergePDFs(parts);
        if (finalBlob && finalBlob.size > 0) {
          const fileName = `${dateStr} ${category}.pdf`;
          saveAs(finalBlob, fileName);
        }
      }

      toast.success("PDFs generated and downloaded by category!");
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
