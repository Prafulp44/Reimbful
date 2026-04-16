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

  const handleDownload = async (isCombined: boolean = false) => {
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

      const categories: ExpenseCategory[] = ['Travel', 'Food', 'Lodging', 'Conveyance', 'Miscellaneous'];
      const dateStr = format(new Date(trip.startDate), 'ddMMyyyy');

      if (isCombined) {
        // GENERATE ONE SINGLE MERGED PDF FOR ALL CATEGORIES
        toast.loading("Merging all categories into one report...", { duration: 2000 });
        const masterParts: (ArrayBuffer | string)[] = [];

        for (const category of categories) {
          const categoryExpenses = allExpenses.filter(e => e.category === category);
          if (categoryExpenses.length === 0) continue;

          // Add Summary for this category
          masterParts.push(await pdf(<TripSummaryPDF trip={trip} expenses={categoryExpenses} category={category} />).toBlob().then(b => b.arrayBuffer()));

          // Add Details for this category
          for (const expense of categoryExpenses) {
            if (!expense.billImageUrl) continue;

            if (expense.billImageUrl.startsWith('data:application/pdf')) {
              masterParts.push(await pdf(<PDFExpenseDetailPagePDF expense={expense} />).toBlob().then(b => b.arrayBuffer()));
              masterParts.push(expense.billImageUrl);
            } else {
              masterParts.push(await pdf(<ExpensePagePDF expense={expense} />).toBlob().then(b => b.arrayBuffer()));
            }
          }
        }

        const finalMasterBlob = await mergePDFs(masterParts);
        if (finalMasterBlob && finalMasterBlob.size > 0) {
          const fileName = `${dateStr} Complete Report.pdf`;
          saveAs(finalMasterBlob, fileName);
          toast.success("Complete report downloaded!");
        }
        return;
      }

      // 3. Generate PDFs in parallel for all categories (Individual)
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
      <div className="flex gap-2">
        <button 
          onClick={() => handleDownload(true)}
          disabled={loading}
          className="flex items-center gap-2 text-orange-600 font-bold text-sm hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
          title="Download One Comprehensive PDF"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4" /> Full Report</>}
        </button>
        <button 
          onClick={() => handleDownload(false)}
          disabled={loading}
          className="flex items-center gap-2 text-neutral-600 font-bold text-sm hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
          title="Download Separate PDFs by Category"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4" /> Split by Category</>}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <button 
        onClick={() => handleDownload(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 shadow-lg shadow-orange-100"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><FileText className="w-4 h-4" /> Download Combined Report</>
        )}
      </button>
      <button 
        onClick={() => handleDownload(false)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-bold rounded-xl transition-colors disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><FileText className="w-4 h-4" /> Separate PDFs by Category</>
        )}
      </button>
    </div>
  );
}
