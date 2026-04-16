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

      // 2. Prepare groups
      const categories: ExpenseCategory[] = ['Travel', 'Food', 'Lodging', 'Conveyance', 'Miscellaneous'];
      const dateStr = format(new Date(trip.startDate), 'ddMMyyyy');

      // 3. Generate PDFs in parallel for all categories
      const pdfGenerationPromises = categories.map(async (category, index) => {
        const categoryExpenses = allExpenses.filter(e => e.category === category);
        if (categoryExpenses.length === 0) return;

        // Collect all parts generation promises for this category
        const partPromises: Promise<ArrayBuffer | string>[] = [];
        
        // Summary page
        partPromises.push(pdf(<TripSummaryPDF trip={trip} expenses={categoryExpenses} category={category} />).toBlob().then(b => b.arrayBuffer()));

        // Expense details
        for (const expense of categoryExpenses) {
          if (!expense.billImageUrl) continue;

          if (expense.billImageUrl.startsWith('data:application/pdf')) {
            partPromises.push(pdf(<PDFExpenseDetailPagePDF expense={expense} />).toBlob().then(b => b.arrayBuffer()));
            partPromises.push(Promise.resolve(expense.billImageUrl));
          } else {
            partPromises.push(pdf(<ExpensePagePDF expense={expense} />).toBlob().then(b => b.arrayBuffer()));
          }
        }

        const parts = await Promise.all(partPromises);
        const finalBlob = await mergePDFs(parts);
        
        if (finalBlob && finalBlob.size > 0) {
          const fileName = `${dateStr} ${category}.pdf`;
          
          // Add a small delay for each download to prevent browser blocking multiple files
          await new Promise(resolve => setTimeout(resolve, index * 800));

          try {
            // Standard saving
            saveAs(finalBlob, fileName);
          } catch (saveError) {
            // Mobile fallback
            const url = URL.createObjectURL(finalBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }
      });

      await Promise.all(pdfGenerationPromises);

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
