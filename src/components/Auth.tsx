import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Briefcase, User, Lock, AtSign, Loader2, Eye, EyeOff, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showRescueForm, setShowRescueForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '', // Recovery Email
    password: ''
  });

  const [rescueData, setRescueData] = useState({
    username: '',
    newEmail: '',
    newPassword: '',
    adminKey: ''
  });

  const handleRescueAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/recover-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: rescueData.username.trim(),
          newEmail: rescueData.newEmail.toLowerCase().trim(),
          newPassword: rescueData.newPassword || undefined,
          adminKey: rescueData.adminKey
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message || "Account credentials successfully updated!", { duration: 6000 });
        setIsForgotPassword(false);
        setIsLogin(true);
        setShowRescueForm(false);
        setFormData({
          fullName: '',
          username: rescueData.username,
          email: '',
          password: rescueData.newPassword || ''
        });
      } else {
        toast.error(data.message || "Failed to rescue/recover account.");
      }
    } catch (error: any) {
      console.error("Rescue account error:", error);
      toast.error(error.message || "An error occurred during account recovery.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) {
      toast.error('Please enter your username');
      return;
    }
    setLoading(true);

    try {
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

      const uid = usernameSnap.data().uid;

      // 2. Fetch user profile to get recovery email
      const userRef = doc(db, 'users', uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
        throw error;
      }

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data();
      const recoveryEmail = userData.recoveryEmail;

      if (!recoveryEmail) {
        setShowRescueForm(true);
        setRescueData(prev => ({
          ...prev,
          username: formData.username
        }));
        throw new Error(
          'Legacy Account Action Required: No recovery email was set for this username. We have opened the administrative account rescue assistant below.'
        );
      }

      // 3. Initiate Firebase Auth Password Reset Email to recovery email
      // Note: Because Firebase Auth stores the email as both the real one (if created normally) 
      // or the fake one (if legacy), we must trigger reset to the real user credentials' registered email.
      // Wait, is the account in Firebase Auth created using `email` or `recoveryEmail`?
      // Ah! In legacy signup, `const email = `${formData.username.toLowerCase()}@reimbful.com`;` was used to register the Firebase Auth account.
      // So the Auth account has the email as `<username>@reimbful.com`.
      // If we call sendPasswordResetEmail(auth, recoveryEmail), it might fail if there's no auth account registered under recoveryEmail!
      // Wait, let's verify how users are registered!
      // In the new signup below:
      // We will register them in Firebase Auth using their REAL email address!
      // That way, we can sendPasswordResetEmail on that real email address.
      // And during Login, we find their real email in the user doc and login using that email!
      // Let's make sure this is EXACTLY how it works.
      await sendPasswordResetEmail(auth, recoveryEmail);
      toast.success(`Password reset email sent to ${recoveryEmail}! Check your inbox.`);
      setIsForgotPassword(false);
    } catch (error: any) {
      console.warn("Forgot Password Warning:", error?.message || error);
      if (error.code === 'auth/too-many-requests' || error.message?.includes('too-many-requests')) {
        toast.error("We have detected too many reset link requests. Please wait a few minutes before trying again to protect account security.", { duration: 8000 });
      } else {
        toast.error(error.message || 'Failed to send reset email');
      }
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

        const uid = usernameSnap.data().uid;

        // 2. Fetch user profile to check if a real email exists
        const userRef = doc(db, 'users', uid);
        let userSnap = await getDoc(userRef);
        let loginEmail = `${formData.username.toLowerCase()}@reimbful.com`; // default legacy fallback

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.recoveryEmail) {
            loginEmail = userData.recoveryEmail;
          }
        }

        // 3. Sign in using resolved email
        await signInWithEmailAndPassword(auth, loginEmail, formData.password);
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

        const realEmail = formData.email.toLowerCase().trim();
        if (!realEmail) {
          throw new Error('Email address is required for security and recovery purposes');
        }

        // 2. Create Auth User with real email address
        const userCredential = await createUserWithEmailAndPassword(auth, realEmail, formData.password);
        const user = userCredential.user;

        // 3. Save Profile & Username Mapping
        try {
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name: formData.fullName,
            username: formData.username.toLowerCase(),
            recoveryEmail: realEmail, // Store recovery/primary email address
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
      const errorMsg = error?.message || "";
      const isKnownUserError = [
        "Username not found",
        "Username already taken",
        "Email address is required",
        "User profile not found",
        "Legacy account",
        "too-many-requests",
        "auth/too-many-requests"
      ].some(msg => errorMsg.includes(msg));

      if (isKnownUserError || (error && error.code && [
        'auth/invalid-credential',
        'auth/wrong-password',
        'auth/user-not-found',
        'auth/email-already-in-use',
        'auth/weak-password',
        'auth/invalid-email',
        'auth/operation-not-allowed',
        'auth/too-many-requests'
      ].includes(error.code))) {
        console.warn("Auth check warning:", error.code || error.message);
      } else {
        console.error("Auth Exception:", error);
      }
      if (error.code === 'unavailable' || error.message?.includes('Could not reach Cloud Firestore backend')) {
        toast.error("Firestore connection failed. Please check your internet or Firebase configuration.");
      } else if (error.code === 'auth/invalid-credential') {
        if (isLogin) {
          toast.error(
            "Invalid username or password. Note: If your Firebase database has been re-created or reset, your old account no longer exists. Please click 'Sign Up' below to register a new account on this database!",
            { duration: 6000 }
          );
        } else {
          toast.error(
            "Registration error (invalid key/credentials). Please ensure the 'Email/Password' sign-in provider is enabled in your Firebase Console under Build > Authentication.",
            { duration: 6000 }
          );
        }
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error(
          "Email/Password sign-in is not enabled in your Firebase project. Go to the Firebase Console -> Build -> Authentication -> Sign-in method, click 'Add new provider', and enable 'Email/Password'.",
          { duration: 8000 }
        );
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("This recovery email is already in use by another registered user. Please use a different email or sign in.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password is too weak. Firebase requires passwords to be at least 6 characters long.");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Please enter a valid, correctly formatted email address.");
      } else if (error.code === 'auth/too-many-requests' || error.message?.includes('too-many-requests')) {
        toast.error(
          "Too many authentication attempts detected. To protect your account, this action has been temporarily blocked. Please wait a few minutes before trying again, or switch network connections.",
          { duration: 8000 }
        );
      } else {
        toast.error(error.message || "An unexpected authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl shadow-lg mb-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">
              {showRescueForm ? "Account Rescue" : "Reset Password"}
            </h1>
            <p className="text-neutral-500 mt-2 text-sm leading-relaxed px-2">
              {showRescueForm 
                ? "Lacks configured email? Input the admin passcode to link a real email & secure a new login credential immediately."
                : "Enter your username to receive a password reset link"}
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100">
            {showRescueForm ? (
              <form onSubmit={handleRescueAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Legacy Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Username"
                      value={rescueData.username}
                      onChange={(e) => setRescueData({ ...rescueData, username: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">New Recovery Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="you@example.com"
                      value={rescueData.newEmail}
                      onChange={(e) => setRescueData({ ...rescueData, newEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">New Password (Optional)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                      value={rescueData.newPassword}
                      onChange={(e) => setRescueData({ ...rescueData, newPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Admin Recovery Key</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Configured admin bypass key"
                      value={rescueData.adminKey}
                      onChange={(e) => setRescueData({ ...rescueData, adminKey: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply Rescue Override'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            )}

            <div className="mt-6 flex flex-col gap-3 text-center">
              {showRescueForm ? (
                <button
                  onClick={() => {
                    setShowRescueForm(false);
                  }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-700 transition"
                >
                  Cancel Admin Mode
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowRescueForm(true);
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 transition"
                >
                  Rescue Legacy Account? (Admin Bypass)
                </button>
              )}

              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                  setShowRescueForm(false);
                }}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Email Address (for Recovery)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-neutral-700">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
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
              onClick={() => {
                setIsLogin(!isLogin);
                // Clear state when toggling
                setFormData({
                  fullName: '',
                  username: '',
                  email: '',
                  password: ''
                });
              }}
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
