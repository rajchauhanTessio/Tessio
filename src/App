import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import MobileClient from './components/MobileClient';
import Auth from './components/Auth';
import SharedTableView from './components/SharedTableView';
import FlyerView from './components/FlyerView';
import { Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

function AppContent() {
  const { token, user } = useAuth();
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [showFlyer, setShowFlyer] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/shared/')) {
      const id = path.split('/')[2];
      if (id) setSharedId(id);
    }
  }, []);

  if (sharedId) {
    return <SharedTableView id={sharedId} />;
  }

  if (showFlyer) {
    return <FlyerView onBack={() => setShowFlyer(false)} />;
  }

  // If not logged in, show Auth (which is mobile-styled)
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-4">
        <Auth onShowFlyer={() => setShowFlyer(true)} />
      </div>
    );
  }

  // Admin view
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 w-full flex flex-col relative">
        <AdminDashboard onShowFlyer={() => setShowFlyer(true)} />
      </div>
    );
  }

  // Client view
  return (
    <div className="min-h-screen bg-slate-50 w-full flex flex-col relative">
      <MobileClient onShowFlyer={() => setShowFlyer(true)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
