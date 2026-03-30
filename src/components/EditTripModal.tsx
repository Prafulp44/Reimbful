import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Trip } from '../types';
import { X, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditTripModalProps {
  trip: Trip;
  onClose: () => void;
}

export default function EditTripModal({ trip, onClose }: EditTripModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tripTitle: trip.tripTitle,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes || '',
    reimbursementStatus: trip.reimbursementStatus || 'Pending'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        tripTitle: formData.tripTitle,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,
        reimbursementStatus: formData.reimbursementStatus
      });
      toast.success("Trip updated successfully!");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${trip.id}`);
      toast.error("Failed to update trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-10 sm:pt-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900">Edit Trip</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Trip Title</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Business Trip to Mumbai"
              value={formData.tripTitle}
              onChange={(e) => setFormData({ ...formData, tripTitle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Reimbursement Status</label>
            <select
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              value={formData.reimbursementStatus}
              onChange={(e) => setFormData({ ...formData, reimbursementStatus: e.target.value as any })}
            >
              <option value="Pending">Pending</option>
              <option value="Uploaded">Uploaded</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes (Optional)</label>
            <textarea
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px]"
              placeholder="Any specific details about the trip..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
