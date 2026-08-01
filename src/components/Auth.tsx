import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ShieldCheck, Phone, User, Mail, Store, Lock, ArrowLeft } from 'lucide-react';
import tessioLogo from '../assets/images/tessio_logo_1783360514202.jpg';

export default function Auth({ onShowFlyer }: { onShowFlyer?: () => void }) {
  const { login, register, resetPinRequest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [userType, setUserType] = useState<'Owner' | 'User'>('Owner');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, pin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setMobile(cleaned);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ username, mobile, email, pin, shopName, userType });
      setSuccess('Registration submitted! Awaiting admin approval.');
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await resetPinRequest(username, mobile);
      setSuccess(data.message);
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container bg-white relative overflow-hidden">
      {/* Tessio Logo Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none z-0">
        <img 
          src={tessioLogo} 
          alt="Tessio Logo Watermark" 
          className="w-80 h-80 object-contain rotate-12 scale-125" 
          referrerPolicy="no-referrer" 
        />
      </div>
      
      <div className="auth-content flex flex-col relative z-10">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 overflow-hidden border border-slate-100 shadow-lg shadow-slate-100">
            <img 
              src={tessioLogo} 
              alt="Tessio Logo" 
              className="w-full h-full object-cover scale-105" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-wider">Tessio</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Textile Dealer & Seller Portal</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-6 text-center">
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold mb-6 text-center">
            {success}
          </motion.div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                required
                type="text" 
                placeholder="Username"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                required
                type="password" 
                maxLength={6}
                placeholder="6-Digit PIN"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setMode('reset')} className="text-xs font-bold text-slate-400 hover:text-emerald-600">Forgot PIN?</button>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login Now'}
            </button>
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account? <button type="button" onClick={() => setMode('register')} className="text-emerald-600 font-bold">Sign Up</button>
            </p>

            {onShowFlyer && (
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button 
                  type="button" 
                  onClick={onShowFlyer}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all text-xs font-bold text-slate-600"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ✨ Features & SLA Flyer
                </button>
              </div>
            )}
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setMode('login')} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={16} /></button>
              <h2 className="font-bold">Create Account</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Account Role / User Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUserType('Owner')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      userType === 'Owner' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    Shop Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('User')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      userType === 'User' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User size={14} />
                    User / Staff
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 ml-1">
                  {userType === 'Owner' 
                    ? '1 Owner per shop. Has full authority to add, update & delete.' 
                    : 'Staff account. View-only access to share data with Shop Owner.'}
                </p>
              </div>

              <Input icon={<User size={18}/>} placeholder="Username" value={username} onChange={setUsername} />
              <Input icon={<Phone size={18}/>} placeholder="Mobile Number" value={mobile} onChange={handleMobileChange} maxLength={10} />
              <Input icon={<Mail size={18}/>} placeholder="Email Address" type="email" value={email} onChange={setEmail} />
              <Input icon={<Store size={18}/>} placeholder="Shop Name (e.g. Royal Silks)" value={shopName} onChange={setShopName} />
              <Input icon={<Lock size={18}/>} placeholder="6-Digit PIN" type="password" maxLength={6} value={pin} onChange={setPin} />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Submitting...' : 'Register Account'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setMode('login')} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={16} /></button>
              <h2 className="font-bold">Reset Security PIN</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Enter your username and registered mobile number to receive reset instructions.</p>
            
            <Input icon={<User size={18}/>} placeholder="Username" value={username} onChange={setUsername} />
            <Input icon={<Phone size={18}/>} placeholder="Registered Mobile" value={mobile} onChange={handleMobileChange} maxLength={10} />

            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Processing...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({ icon, placeholder, type = "text", value, onChange, maxLength }: any) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
      <input 
        required
        type={type} 
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
