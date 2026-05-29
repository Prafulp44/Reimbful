import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Briefcase, User, Lock, AtSign, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    recoveryEmail: ''
  });

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername) {
      toast.error('Please enter your username.');
      return;
    }
    setLoading(true);

    try {
      const usernameRef = doc(db, 'usernames', recoveryUsername.toLowerCase().trim());
      const usernameSnap = await getDoc(usernameRef);
      if (!usernameSnap.exists()) {
        throw new Error('Username not found.');
      }

      const data = usernameSnap.data();
      const recoveryEmail = data?.recoveryEmail;
      if (!recoveryEmail) {
        throw new Error('This account does not have a recovery email associated. Please contact support.');
      }

      await sendPasswordResetEmail(auth, recoveryEmail);
      
      const maskEmail = (email: string) => {
        const [name, domain] = email.split('@');
        if (name.length <= 2) return `***@${domain}`;
        return `${name[0]}***${name[name.length - 1]}@${domain}`;
      };

      toast.success(`A password reset link was sent to your recovery email: ${maskEmail(recoveryEmail)}`);
      setIsRecovery(false);
      setRecoveryUsername('');
    } catch (error: any) {
      console.error('Recovery Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login Logic
        // 1. Look up UID from username
        const usernameRef = doc(db, 'usernames', formData.username.toLowerCase().trim());
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

        // 2. Sign in with recovery/auth email if present, else fallback to fake email
        const usernameData = usernameSnap.data();
        const primaryEmail = usernameData?.authEmail || `${formData.username.toLowerCase().trim()}@reimbful.com`;

        const candidates = new Set<string>();
        candidates.add(primaryEmail);
        if (usernameData?.recoveryEmail) {
          candidates.add(usernameData.recoveryEmail.toLowerCase().trim());
        }
        candidates.add(`${formData.username.toLowerCase().trim()}@reimbful.com`);

        let lastError: any = null;
        let success = false;

        for (const candidateEmail of candidates) {
          try {
            await signInWithEmailAndPassword(auth, candidateEmail, formData.password);
            success = true;
            break;
          } catch (err: any) {
            lastError = err;
            if (err.code !== 'auth/invalid-credential' && !err.message?.includes('invalid-credential')) {
              throw err;
            }
          }
        }

        if (!success && lastError) {
          throw lastError;
        }

        toast.success('Welcome back!');
      } else {
        // Signup Logic
        // 1. Check if username exists
        const usernameRef = doc(db, 'usernames', formData.username.toLowerCase().trim());
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

        if (!formData.recoveryEmail) {
          throw new Error('Recovery email is required.');
        }

        // 2. Create Auth User using recovery email
        const email = formData.recoveryEmail.toLowerCase().trim();
        const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
        const user = userCredential.user;

        // 3. Save Profile & Username Mapping
        try {
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name: formData.fullName,
            username: formData.username.toLowerCase().trim(),
            recoveryEmail: formData.recoveryEmail.toLowerCase().trim(),
            createdAt: Date.now()
          });

          await setDoc(usernameRef, {
            uid: user.uid,
            recoveryEmail: formData.recoveryEmail.toLowerCase().trim(),
            authEmail: formData.recoveryEmail.toLowerCase().trim()
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
            {isRecovery 
              ? 'Recover your account using username' 
              : (isLogin ? 'Sign in to track your expenses' : 'Create an account to get started')}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100">
          {isRecovery ? (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Username</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    placeholder="Enter your username"
                    value={recoveryUsername}
                    onChange={(e) => setRecoveryUsername(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
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

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Recovery Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                        placeholder="name@example.com"
                        value={formData.recoveryEmail}
                        onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </>
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
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsRecovery(true)}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {isRecovery ? (
              <button
                type="button"
                onClick={() => setIsRecovery(false)}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
