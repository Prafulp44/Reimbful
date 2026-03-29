import React, { useState } from 'react';
import { 
  updateProfile, 
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { ArrowLeft, User, AtSign, Lock, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileProps {
  profile: UserProfile;
  onBack: () => void;
  onUpdate: (profile: UserProfile) => void;
}

export default function Profile({ profile, onBack, onUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name,
    username: profile.username,
    newPassword: '',
    currentPassword: ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // 1. Re-authenticate if password change is requested
      if (formData.newPassword || formData.username !== profile.username) {
        if (!formData.currentPassword) {
          throw new Error("Current password is required for security changes.");
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, formData.currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // 2. Handle Username Change
      if (formData.username !== profile.username) {
        const newUsernameRef = doc(db, 'usernames', formData.username.toLowerCase());
        const newUsernameSnap = await getDoc(newUsernameRef);
        if (newUsernameSnap.exists()) {
          throw new Error("Username already taken");
        }

        // Delete old mapping, create new one
        await deleteDoc(doc(db, 'usernames', profile.username.toLowerCase()));
        await setDoc(newUsernameRef, { uid: auth.currentUser.uid });
      }

      // 3. Update Auth Profile & Password
      if (formData.name !== profile.name) {
        await updateProfile(auth.currentUser, { displayName: formData.name });
      }
      if (formData.newPassword) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }

      // 4. Update Firestore Profile
      const updatedProfile = {
        ...profile,
        name: formData.name,
        username: formData.username.toLowerCase()
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);

      onUpdate(updatedProfile);
      toast.success("Profile updated successfully!");
      setFormData({ ...formData, currentPassword: '', newPassword: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-600" />
        </button>
        <h2 className="text-2xl font-bold text-neutral-900">Edit Profile</h2>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Username</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Security</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">New Password (Optional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Leave blank to keep current"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    required={formData.newPassword !== '' || formData.username !== profile.username}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Required for sensitive changes"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}
