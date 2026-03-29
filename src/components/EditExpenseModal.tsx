import React, { useState, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Expense, ExpenseCategory } from '../types';
import { X, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditExpenseModalProps {
  expense: Expense;
  tripId: string;
  onClose: () => void;
}

const categories: ExpenseCategory[] = ['Travel', 'Food', 'Hotel', 'Other'];

export default function EditExpenseModal({ expense, tripId, onClose }: EditExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [billImage, setBillImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(expense.billImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: expense.category as ExpenseCategory,
    vendorName: expense.vendorName,
    amount: expense.amount.toString(),
    notes: expense.notes || ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size too large (max 5MB)");
        return;
      }
      setBillImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let billImageUrl = expense.billImageUrl || '';
      
      // If a new image was selected, process it
      if (billImage) {
        setProcessing(true);
        setProcessProgress(20);
        
        billImageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(billImage);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
              setProcessProgress(100);
              resolve(dataUrl);
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
        setProcessing(false);
      } else if (!previewUrl) {
        // If previewUrl was cleared, set billImageUrl to empty
        billImageUrl = '';
      }

      const amountNum = parseFloat(formData.amount);
      const amountDiff = amountNum - expense.amount;
      
      await updateDoc(doc(db, 'expenses', expense.id), {
        category: formData.category,
        vendorName: formData.vendorName,
        amount: amountNum,
        billImageUrl,
        notes: formData.notes
      });

      // Update Trip Total if amount changed
      if (amountDiff !== 0) {
        await updateDoc(doc(db, 'trips', tripId), {
          totalAmount: increment(amountDiff)
        });
      }

      toast.success("Expense updated!");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `expenses/${expense.id}`);
      toast.error("Failed to update expense");
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const getVendorLabel = () => {
    switch (formData.category) {
      case 'Travel': return 'Travel Name (e.g. Uber, Indigo)';
      case 'Food': return 'Restaurant Name';
      case 'Hotel': return 'Hotel Name';
      default: return 'Vendor Name';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900">Edit Expense</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                    formData.category === cat 
                      ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-orange-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">{getVendorLabel()}</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Enter name..."
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="0"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Bill Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                previewUrl ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 bg-neutral-50 hover:border-orange-300'
              }`}
            >
              {previewUrl ? (
                <div className="relative inline-block group">
                  <img src={previewUrl} alt="Preview" className="h-32 w-32 object-cover rounded-xl shadow-md" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBillImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to change
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                    <Camera className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-sm font-bold text-neutral-700">Click to upload bill</p>
                  <p className="text-xs text-neutral-500 mt-1">Camera or Gallery</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes (Optional)</label>
            <textarea
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[80px]"
              placeholder="Add any extra details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || processing}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {loading || processing ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{processing ? `Processing Image (${Math.round(processProgress)}%)` : 'Updating...'}</span>
                </div>
              </div>
            ) : 'Update Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
