import React, { useState } from 'react';
import { 
  updateProfile, 
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { ArrowLeft, User, AtSign, Lock, Loader2, Save, Eye, EyeOff, HelpCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import SOPPDF from './SOPPDF';
import { saveAs } from 'file-saver';

interface ProfileProps {
  profile: UserProfile;
  onBack: () => void;
  onUpdate: (profile: UserProfile) => void;
}

export default function Profile({ profile, onBack, onUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name,
    username: profile.username,
    recoveryEmail: profile.recoveryEmail || '',
    newPassword: '',
    currentPassword: ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const isEmailChanged = formData.recoveryEmail.trim().toLowerCase() !== (profile.recoveryEmail || '').trim().toLowerCase();

      // 1. Re-authenticate if password change, username change, or recovery email change is requested
      if (formData.newPassword || formData.username !== profile.username || isEmailChanged) {
        if (!formData.currentPassword) {
          throw new Error("Current password is required for security changes.");
        }
        const reauthEmail = auth.currentUser.email || profile.recoveryEmail || `${profile.username.toLowerCase().trim()}@reimbful.com`;
        const credential = EmailAuthProvider.credential(reauthEmail, formData.currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // 2. Handle Username Change and Recovery Email mapping update
      if (formData.username !== profile.username) {
        const newUsernameRef = doc(db, 'usernames', formData.username.toLowerCase().trim());
        const newUsernameSnap = await getDoc(newUsernameRef);
        if (newUsernameSnap.exists()) {
          throw new Error("Username already taken");
        }

        // Delete old mapping, create new one with recovery email
        await deleteDoc(doc(db, 'usernames', profile.username.toLowerCase().trim()));
        await setDoc(newUsernameRef, { 
          uid: auth.currentUser.uid,
          recoveryEmail: formData.recoveryEmail.toLowerCase().trim(),
          authEmail: auth.currentUser.email
        });
      }

      // 3. Update Auth Profile, Auth Email & Password
      if (formData.name !== profile.name) {
        await updateProfile(auth.currentUser, { displayName: formData.name });
      }

      let emailVerificationSent = false;
      if (isEmailChanged) {
        const newEmail = formData.recoveryEmail.toLowerCase().trim();
        try {
          // Try standard updateEmail first
          await updateEmail(auth.currentUser, newEmail);
          
          // If direct update succeeds, update active authEmail in usernames mapping
          const usernameRef = doc(db, 'usernames', formData.username.toLowerCase().trim());
          await updateDoc(usernameRef, { 
            recoveryEmail: newEmail,
            authEmail: newEmail
          });
        } catch (emailErr: any) {
          console.warn("Direct updateEmail failed, falling back to verifyBeforeUpdateEmail:", emailErr);
          if (emailErr.code === 'auth/operation-not-allowed' || emailErr.message?.includes('verify') || emailErr.code?.includes('verified') || emailErr.message?.includes('operation-not-allowed')) {
            // Fallback to verifyBeforeUpdateEmail
            await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
            emailVerificationSent = true;
            // Save recoveryEmail and pendingEmail, keep authEmail active for current session login
            const usernameRef = doc(db, 'usernames', formData.username.toLowerCase().trim());
            await updateDoc(usernameRef, { 
              recoveryEmail: newEmail,
              pendingEmail: newEmail
            });
          } else {
            throw emailErr;
          }
        }
      }

      if (formData.newPassword) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }

      // 4. Update Firestore Profile
      const updatedProfile = {
        ...profile,
        name: formData.name,
        username: formData.username.toLowerCase().trim(),
        recoveryEmail: formData.recoveryEmail.toLowerCase().trim()
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);

      onUpdate(updatedProfile);
      if (emailVerificationSent) {
        toast.success("Profile saved. A verification link was sent to your new email. Your login email will update once verified!");
      } else {
        toast.success("Profile updated successfully!");
      }
      setFormData({ ...formData, currentPassword: '', newPassword: '' });
    } catch (error: any) {
      console.error("Profile Update Error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSOP = async () => {
    const loadingToast = toast.loading("Generating SOP PDF...");
    try {
      const blob = await pdf(<SOPPDF />).toBlob();
      saveAs(blob, 'Reimbful_SOP.pdf');
      toast.success("SOP Downloaded successfully!", { id: loadingToast });
    } catch (error) {
      console.error("SOP Error:", error);
      toast.error("Failed to generate SOP", { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-neutral-600" />
          </button>
          <h2 className="text-2xl font-bold text-neutral-900">Edit Profile</h2>
        </div>
        <button
          onClick={handleDownloadSOP}
          className="flex items-center gap-2 text-sm font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-all"
        >
          <HelpCircle className="w-4 h-4" />
          User Guide (SOP)
        </button>
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

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Recovery Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="name@example.com"
                value={formData.recoveryEmail}
                onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
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
                    type={showNewPassword ? "text" : "password"}
                    className="w-full pl-10 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Leave blank to keep current"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required={formData.newPassword !== '' || formData.username !== profile.username || formData.recoveryEmail.trim().toLowerCase() !== (profile.recoveryEmail || '').trim().toLowerCase()}
                    className="w-full pl-10 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Required for sensitive changes"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
