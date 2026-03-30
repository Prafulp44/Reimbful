import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Trip, Expense, ReimbursementStatus } from '../types';
import { Plus, Calendar, IndianRupee, Trash2, ChevronRight, FileText, Mail, Loader2, Edit2, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import { pdf } from '@react-pdf/renderer';
import TripReportPDF, { TripSummaryPDF, ExpensePagePDF, PDFExpenseDetailPagePDF } from './TripReportPDF';
import { mergePDFs } from '../lib/pdfUtils';
import AddTripModal from './AddTripModal';
import EditTripModal from './EditTripModal';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';
import PDFButton from './PDFButton';
import axios from 'axios';

interface DashboardProps {
  onViewTrip: (id: string) => void;
}

export default function Dashboard({ onViewTrip }: DashboardProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReimbursementStatus | 'All'>('All');

  const statusConfig: Record<ReimbursementStatus, { bg: string, text: string, label: string }> = {
    'Pending': { bg: 'bg-red-50', text: 'text-red-600', label: 'Pending' },
    'Uploaded': { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Uploaded' },
    'Paid': { bg: 'bg-green-50', text: 'text-green-600', label: 'Paid' }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'trips'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
      setTrips(tripData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Failed to load trips");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteTrip = async () => {
    if (!deletingTripId) return;
    setIsDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'trips', deletingTripId));
      toast.success("Trip deleted");
      setDeletingTripId(null);
    } catch (error) {
      toast.error("Failed to delete trip");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleSendEmail = async (trip: Trip) => {
    const email = window.prompt("Enter recipient email ID:");
    if (!email) return;

    setEmailLoading(trip.id);
    try {
      // 1. Fetch expenses for the trip
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
      
      // 4. Convert to base64 using a Promise
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(finalBlob);
      });

      // 6. Send to API with timeout
      const response = await axios.post('/api/send-email', {
        to: email,
        subject: `Expense Report: ${trip.tripTitle}`,
        body: `Please find attached the expense report for the trip: ${trip.tripTitle} (${trip.startDate} to ${trip.endDate}). Total Amount: ${formatCurrency(trip.totalAmount)}`,
        pdfBase64: base64Content
      }, {
        timeout: 30000 // 30 seconds
      });

      if (response.data.success) {
        toast.success("Email sent successfully!");
      } else {
        toast.error(response.data.message || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Email Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send email";
      toast.error(errorMessage);
    } finally {
      setEmailLoading(null);
    }
  };

  const handleStatusChange = async (tripId: string, newStatus: ReimbursementStatus) => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        reimbursementStatus: newStatus
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredTrips = trips.filter(trip => 
    statusFilter === 'All' || trip.reimbursementStatus === statusFilter
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900">Your Trips</h2>
          <span className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
            {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'}
          </span>
        </div>

        {/* Filter UI */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              statusFilter === 'All' 
                ? 'bg-neutral-900 text-white' 
                : 'bg-white text-neutral-600 border border-neutral-200'
            }`}
          >
            All
          </button>
          {(['Pending', 'Uploaded', 'Paid'] as ReimbursementStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                statusFilter === status 
                  ? `${statusConfig[status].bg} ${statusConfig[status].text} border-2 border-current` 
                  : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center">
          <div className="bg-neutral-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">No trips found</h3>
          <p className="text-neutral-500 mt-1">
            {statusFilter === 'All' 
              ? "Add your first travel trip to start tracking expenses." 
              : `No trips with status "${statusFilter}" found.`}
          </p>
          {statusFilter === 'All' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 bg-orange-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-700 transition-colors"
            >
              Add Trip
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-neutral-900">{trip.tripTitle}</h3>
                      <div className="flex items-center gap-1 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTrip(trip);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTripId(trip.id);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 text-sm mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Status Dropdown */}
                    <div className="relative inline-block">
                      <select
                        value={trip.reimbursementStatus || 'Pending'}
                        onChange={(e) => handleStatusChange(trip.id, e.target.value as ReimbursementStatus)}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none transition-all border-none ${
                          statusConfig[trip.reimbursementStatus || 'Pending'].bg
                        } ${statusConfig[trip.reimbursementStatus || 'Pending'].text}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Uploaded">Uploaded</option>
                        <option value="Paid">Paid</option>
                      </select>
                      <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${statusConfig[trip.reimbursementStatus || 'Pending'].text}`} />
                    </div>

                    <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      <span>{trip.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <button 
                    onClick={() => onViewTrip(trip.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors"
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <PDFButton trip={trip} />
                  <button 
                    onClick={() => handleSendEmail(trip)}
                    disabled={emailLoading === trip.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {emailLoading === trip.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Email</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-orange-600 text-white rounded-2xl shadow-2xl shadow-orange-200 flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all active:scale-95 z-20"
      >
        <Plus className="w-8 h-8" />
      </button>

      {isAddModalOpen && (
        <AddTripModal onClose={() => setIsAddModalOpen(false)} />
      )}

      {editingTrip && (
        <EditTripModal 
          trip={editingTrip} 
          onClose={() => setEditingTrip(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingTripId}
        title="Delete Trip"
        message="Are you sure you want to delete this trip and all its expenses? This action cannot be undone."
        onConfirm={handleDeleteTrip}
        onCancel={() => setDeletingTripId(null)}
        isLoading={isDeleteLoading}
      />
    </div>
  );
}
