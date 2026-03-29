import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Briefcase, User, Lock, AtSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login Logic
        // 1. Look up UID from username
        const usernameRef = doc(db, 'usernames', formData.username.toLowerCase());
        let usernameSnap;
        try {
          usernameSnap = await getDoc(usernameRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'usernames');
          throw error;
        }
        
        if (!usernameSnap.exists()) {
          throw new Error('Username not found');
        }

        // 2. Sign in with fake email
        const email = `${formData.username.toLowerCase()}@reimbful.com`;
        await signInWithEmailAndPassword(auth, email, formData.password);
        toast.success('Welcome back!');
      } else {
        // Signup Logic
        // 1. Check if username exists
        const usernameRef = doc(db, 'usernames', formData.username.toLowerCase());
        let usernameSnap;
        try {
          usernameSnap = await getDoc(usernameRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'usernames');
          throw error;
        }
        
        if (usernameSnap.exists()) {
          throw new Error('Username already taken');
        }

        // 2. Create Auth User
        const email = `${formData.username.toLowerCase()}@reimbful.com`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
        const user = userCredential.user;

        // 3. Save Profile & Username Mapping
        try {
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name: formData.fullName,
            username: formData.username.toLowerCase(),
            createdAt: Date.now()
          });

          await setDoc(usernameRef, {
            uid: user.uid
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'users/usernames');
          throw error;
        }

        await updateProfile(user, { displayName: formData.fullName });
        toast.success('Account created!');
      }
      onAuthSuccess();
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === 'unavailable' || error.message?.includes('Could not reach Cloud Firestore backend')) {
        toast.error("Firestore connection failed. Please check your internet or Firebase configuration.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl shadow-lg mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Reimbful</h1>
          <p className="text-neutral-500 mt-2">
            {isLogin ? 'Sign in to track your expenses' : 'Create an account to get started'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
