import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TripDetail from './components/TripDetail';
import Profile from './components/Profile';
import { Toaster } from 'react-hot-toast';
import { LogOut, User as UserIcon, Briefcase } from 'lucide-react';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'trip' | 'profile'>('dashboard');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    // Check Firestore connectivity on mount
    const checkConnectivity = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setFirestoreError(null);
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn("App connectivity check: Permission denied for test/connection. This is expected if rules are still deploying.");
          return;
        }
        console.error("Connectivity check error:", error);
        if (error.code === 'unavailable' || error.message?.includes('Could not reach Cloud Firestore backend')) {
          setFirestoreError("Firestore is unreachable. Please check your Firebase project configuration.");
        }
      }
    };
    checkConnectivity();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setView('dashboard');
    setCurrentTripId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Briefcase className="w-12 h-12 text-orange-600 mb-4" />
          <p className="text-neutral-500 font-medium">Loading Reimbful...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onAuthSuccess={() => {}} />
        <Toaster position="bottom-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <Toaster position="bottom-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        {firestoreError && (
          <div className="bg-red-600 text-white text-[10px] py-1 px-4 text-center font-bold animate-pulse">
            ⚠️ {firestoreError}
          </div>
        )}
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setView('dashboard'); setCurrentTripId(null); }}
          >
            <div className="bg-orange-600 p-1.5 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Reimbful</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('profile')}
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <UserIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={handleSignOut}
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {view === 'dashboard' && (
          <Dashboard 
            onViewTrip={(id) => { setCurrentTripId(id); setView('trip'); }} 
          />
        )}
        
        {view === 'trip' && currentTripId && (
          <TripDetail 
            tripId={currentTripId} 
            onBack={() => { setView('dashboard'); setCurrentTripId(null); }} 
          />
        )}

        {view === 'profile' && profile && (
          <Profile 
            profile={profile} 
            onBack={() => setView('dashboard')} 
            onUpdate={(newProfile) => setProfile(newProfile)}
          />
        )}
      </main>
    </div>
  );
}
