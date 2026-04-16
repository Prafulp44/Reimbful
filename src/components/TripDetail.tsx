import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Expense } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  IndianRupee, 
  Trash2, 
  Calendar, 
  MapPin, 
  Utensils, 
  Building2, 
  MoreHorizontal,
  Car,
  Loader2,
  Image as ImageIcon,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import AddExpenseModal from './AddExpenseModal';
import EditExpenseModal from './EditExpenseModal';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';
import PDFButton from './PDFButton';

interface TripDetailProps {
  tripId: string;
  onBack: () => void;
}

const categoryIcons = {
  Travel: <MapPin className="w-5 h-5 text-blue-600" />,
  Food: <Utensils className="w-5 h-5 text-orange-600" />,
  Lodging: <Building2 className="w-5 h-5 text-purple-600" />,
  Conveyance: <Car className="w-5 h-5 text-emerald-600" />,
  Miscellaneous: <MoreHorizontal className="w-5 h-5 text-neutral-600" />
};

export default function TripDetail({ tripId, onBack }: TripDetailProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => {
    const tripRef = doc(db, 'trips', tripId);
    const unsubscribeTrip = onSnapshot(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        setTrip({ id: snapshot.id, ...snapshot.data() } as Trip);
      }
    });

    const q = query(
      collection(db, 'expenses'),
      where('tripId', '==', tripId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expenseData);
      setLoading(false);
    });

    return () => {
      unsubscribeTrip();
      unsubscribeExpenses();
    };
  }, [tripId]);

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'expenses', deletingExpense.id));
      await updateDoc(doc(db, 'trips', tripId), {
        totalAmount: increment(-deletingExpense.amount)
      });
      toast.success("Expense deleted");
      setDeletingExpense(null);
    } catch (error) {
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  if (loading || !trip) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{trip.tripTitle}</h2>
          <p className="text-sm text-neutral-500 font-medium">
            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Total Card */}
      <div className="bg-neutral-900 rounded-3xl p-8 text-white shadow-xl shadow-neutral-200">
        <p className="text-neutral-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Reimbursement</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{formatCurrency(trip.totalAmount)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-neutral-900">Expenses</h3>
        <div className="flex items-center gap-2">
          <PDFButton trip={trip} variant="compact" />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 text-orange-600 font-bold text-sm hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center">
          <p className="text-neutral-400 font-medium">No expenses recorded for this trip yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center">
                  {categoryIcons[expense.category as keyof typeof categoryIcons]}
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{expense.vendorName}</h4>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                    <span>{expense.category}</span>
                    <span>•</span>
                    <span>{format(new Date(expense.createdAt), 'MMM d')}</span>
                    {expense.billImageUrl && (
                      <a 
                        href={expense.billImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-orange-600 font-medium hover:underline"
                      >
                        <ImageIcon className="w-3 h-3" /> Bill
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900">{formatCurrency(expense.amount)}</span>
                <div className="flex items-center gap-1 transition-opacity">
                  <button 
                    onClick={() => setEditingExpense(expense)}
                    className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingExpense(expense)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddExpenseModal 
          tripId={tripId} 
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}

      {editingExpense && (
        <EditExpenseModal 
          expense={editingExpense} 
          tripId={tripId} 
          onClose={() => setEditingExpense(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeletingExpense(null)}
        isLoading={isDeleteLoading}
      />
    </div>
  );
}
