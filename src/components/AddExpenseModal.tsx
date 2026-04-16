import React, { useState, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ExpenseCategory } from '../types';
import { X, Loader2, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { fileToBase64, compressImage } from '../lib/fileUtils';

interface AddExpenseModalProps {
  tripId: string;
  onClose: () => void;
}

const categories: ExpenseCategory[] = ['Travel', 'Food', 'Lodging', 'Conveyance', 'Miscellaneous'];

export default function AddExpenseModal({ tripId, onClose }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [billImage, setBillImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: 'Travel' as ExpenseCategory,
    vendorName: '',
    amount: '',
    notes: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
      const allowedMimeTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const isAllowed = allowedMimeTypes.some(type => file.type.startsWith(type)) || 
                        allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isAllowed) {
        toast.error("Invalid file type. Please upload an image, PDF, or Word document.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size too large (max 5MB)");
        return;
      }
      setBillImage(file);
      
      // Only set preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let billImageUrl = '';
      if (billImage) {
        setUploading(true);
        setUploadProgress(20);
        
        try {
          let fileToProcess: Blob | File = billImage;

          // Compress if it's an image to stay under Firestore 1MB limit
          if (billImage.type.startsWith('image/')) {
            setUploadProgress(40);
            // Use more aggressive compression for Firestore storage
            fileToProcess = await compressImage(billImage, 800, 800, 0.5);
            setUploadProgress(70);
          }

          // Convert to base64
          billImageUrl = await fileToBase64(fileToProcess);
          
          // Check size (Firestore limit is 1MB per document)
          if (billImageUrl.length > 1000000) {
            throw new Error("File is too large for Firestore (max ~750KB after encoding). Please use a smaller file or a lower resolution image.");
          }
          
          setUploadProgress(100);
        } catch (processError: any) {
          console.error("File processing error:", processError);
          throw processError;
        } finally {
          setUploading(false);
        }
      }

      const amountNum = parseFloat(formData.amount);
      
      await addDoc(collection(db, 'expenses'), {
        tripId,
        category: formData.category,
        vendorName: formData.vendorName,
        amount: amountNum,
        billImageUrl,
        notes: formData.notes,
        createdAt: Date.now()
      });

      // Update Trip Total
      await updateDoc(doc(db, 'trips', tripId), {
        totalAmount: increment(amountNum)
      });

      toast.success("Expense added!");
      onClose();
    } catch (error: any) {
      console.error("Full error details:", error);
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
      toast.error(error.message || "Failed to add expense.");
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getVendorLabel = () => {
    switch (formData.category) {
      case 'Travel': return 'Travel Name (e.g. Indigo, Uber)';
      case 'Food': return 'Restaurant Name';
      case 'Lodging': return 'Hotel Name';
      case 'Conveyance': return 'Mode of Conveyance';
      default: return 'Vendor Name';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-10 sm:pt-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900">Add Expense</h3>
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
              placeholder={formData.category === 'Conveyance' ? "e.g. Auto, Bus, Train" : "Enter name..."}
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
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Bill (Image, PDF, Word)</label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                billImage ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              {billImage ? (
                <div className="relative inline-block group">
                  {previewUrl ? (
                    <div className="relative">
                      <img src={previewUrl} alt="Preview" className="h-32 w-32 object-cover rounded-xl shadow-md" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white text-[10px] font-bold">
                        Selected
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 w-32 bg-white rounded-xl shadow-md flex flex-col items-center justify-center p-2">
                      <Upload className="w-8 h-8 text-orange-600 mb-2" />
                      <p className="text-[10px] font-bold text-neutral-600 truncate w-full">{billImage.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBillImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-700 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-neutral-200 hover:border-orange-300 transition-all"
                  >
                    <div className="bg-orange-50 p-3 rounded-full mb-2">
                      <Camera className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-xs font-bold text-neutral-700">Take Photo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-neutral-200 hover:border-orange-300 transition-all"
                  >
                    <div className="bg-blue-50 p-3 rounded-full mb-2">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-xs font-bold text-neutral-700">Upload File</p>
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="*/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={handleFileChange} 
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
            disabled={loading || (uploading && uploadProgress < 100)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {loading || uploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{uploading ? `Processing Image (${Math.round(uploadProgress)}%)` : 'Saving...'}</span>
                </div>
                {uploading && (
                  <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
