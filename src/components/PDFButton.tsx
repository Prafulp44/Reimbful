import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Expense } from '../types';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TripReportPDF from './TripReportPDF';
import { FileText, Loader2 } from 'lucide-react';

interface PDFButtonProps {
  trip: Trip;
}

export default function PDFButton({ trip }: PDFButtonProps) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchExpenses = async () => {
    if (expenses) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'expenses'),
        where('tripId', '==', trip.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expenseData);
    } catch (error) {
      console.error("Error fetching expenses for PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onMouseEnter={handleFetchExpenses} onClick={handleFetchExpenses} className="flex-1">
      {!expenses && !loading ? (
        <button 
          className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors"
        >
          <FileText className="w-4 h-4" /> Bills
        </button>
      ) : loading ? (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 text-white font-bold rounded-xl opacity-70"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Bills
        </button>
      ) : (
        <PDFDownloadLink
          document={<TripReportPDF trip={trip} expenses={expenses!} />}
          fileName={`Reimbful_${trip.tripTitle.replace(/\s+/g, '_')}.pdf`}
          className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors"
        >
          {({ loading }) => loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4" /> Bills</>}
        </PDFDownloadLink>
      )}
    </div>
  );
}
