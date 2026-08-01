import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  Settings as SettingsIcon, 
  Home, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  Edit2,
  Save,
  LogOut,
  Phone,
  Mail,
  Store,
  Share2,
  Download,
  Upload,
  X,
  ShieldCheck,
  Globe,
  Activity,
  Lock,
  FileText,
  Calculator,
  Check,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  QrCode,
  Users,
  Bell,
  Calendar,
  History,
  Clock,
  Scan,
  Loader2,
  ExternalLink,
  Table as TableIcon,
  RefreshCw,
  Copy,
  Printer,
  Database,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import ClientManagementView from './ClientManagementView';
import InvoiceManagementView from './InvoiceManagementView';
import tessioLogo from '../assets/images/tessio_logo_1783360514202.jpg';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MobileClient({ onShowFlyer }: { onShowFlyer?: () => void }) {
  const { user, logout, fetchWithAuth, updateUser } = useAuth();
  const isReadOnly = user?.userType === 'User' || user?.userType === 'user';
  const [activeTab, setActiveTab] = useState<'home' | 'account' | 'settings'>('home');
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'details' | 'qr' | 'clients' | 'invoices' | 'manage-services' | 'records-list'>('list');
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);

  // Custom dialog and toast notification states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onConfirm();
      }
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, isOpen: true });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const publishedServices = user?.publishedServices || [];
  const qrPublished = publishedServices.includes('QR Generator');
  const clientPublished = publishedServices.includes('Client Management');
  const invoicePublished = publishedServices.includes('Invoice Management');
  const totalPublishedCount = 1 + [qrPublished, clientPublished, invoicePublished].filter(Boolean).length;
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dealerFilter, companyFilter]);

  const loadUploads = async () => {
    try {
      const data = await fetchWithAuth('/uploads');
      setUploads(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2 && activeTab === 'home') {
        setIsSearchingLive(true);
        try {
          const data = await fetchWithAuth(`/records/suggestions?q=${encodeURIComponent(searchTerm)}`);
          setLiveResults(data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearchingLive(false);
        }
      } else {
        setLiveResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  const loadRecords = async () => {
    try {
      const data = await fetchWithAuth('/records');
      setRecords(data);
      await loadUploads();
    } catch (err: any) {
      if (err.message !== "Session expired" && !err.message?.includes("Session expired")) {
        console.error("Failed to load records:", err);
      } else {
        console.warn("Records load skipped: Session expired");
      }
    }
  };

  const handleDeleteUpload = async (id: number, filename: string) => {
    showConfirm(
      "Delete Uploaded File",
      `Are you sure you want to delete all records uploaded from "${filename}"? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          await fetchWithAuth(`/uploads/${id}`, { method: 'DELETE' });
          showToast("File and associated records deleted successfully.", "success");
          await loadUploads();
          await loadRecords();
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  useEffect(() => {
    loadRecords();
    fetchWithAuth('/user/profile')
      .then(profileData => {
        if (profileData && profileData.user) {
          updateUser(profileData.user);
        }
      })
      .catch(err => {
        if (err.message !== "Session expired" && !err.message?.includes("Session expired")) {
          console.error("Failed to refresh user profile:", err);
        } else {
          console.warn("User profile refresh skipped: Session expired");
        }
      });
  }, []);

  const filteredRecords = records.filter(r => {
    const dealerCode = r.dealer_code || '(Pending)';
    const matchesSearch = searchTerm === '' || 
                         dealerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.company_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDealer = dealerFilter === '' || dealerCode.toLowerCase().includes(dealerFilter.toLowerCase());
    const matchesCompany = companyFilter === '' || r.company_code.toLowerCase().includes(companyFilter.toLowerCase());
    return matchesSearch && matchesDealer && matchesCompany;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (id: any) => {
    const numId = Number(id);
    setSelectedIds(prev => 
      prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      "Delete Selected Records",
      `Are you sure you want to delete ${selectedIds.length} records? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          const response = await fetchWithAuth('/records/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids: selectedIds })
          });
          console.log('Bulk delete success:', response);
          setSelectedIds([]);
          setIsSelectMode(false);
          showToast(`Successfully deleted ${selectedIds.length} records.`, "success");
          await loadRecords();
        } catch (err: any) {
          console.error('Bulk delete error:', err);
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleShareWhatsApp = (record: any) => {
    const text = `Record Details:\nDealer Code: ${record.dealer_code}\nCompany Code: ${record.company_code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareAllWhatsApp = () => {
    if (records.length === 0) {
      alert("No records to share");
      return;
    }
    const header = `My Records Summary (${records.length} total):\n\n`;
    const body = records.map((r, i) => `${i + 1}. Dealer: ${r.dealer_code} | Company: ${r.company_code}`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(header + body)}`, '_blank');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `records_${user.username}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedRecords = JSON.parse(event.target?.result as string);
          if (Array.isArray(importedRecords)) {
            await fetchWithAuth('/records/bulk-import', {
              method: 'POST',
              body: JSON.stringify({ records: importedRecords })
            });
            alert(`Successfully imported ${importedRecords.length} records!`);
            loadRecords();
          }
        } catch (err) {
          alert("Invalid file format");
        }
      };
      reader.readAsText(file);
    } else {
      // Excel handling will be done through the custom view
      alert("Please use the Excel Import option for .xlsx files");
    }
  };

  const calculatePrices = (recordOrCp: any) => {
    let cp = 0;
    let commission = Number(user?.dealerCommission) || 0;
    
    if (typeof recordOrCp === 'number') {
      cp = recordOrCp;
    } else {
      cp = recordOrCp.cost_price || 0;
      if (recordOrCp.dealer_commission !== undefined) {
        commission = Number(recordOrCp.dealer_commission);
      }
    }
    
    const sp = cp + (cp * commission / 100);
    return { cp, sp, commission };
  };

  return (
    <div className="client-container font-sans">
      <div className="client-content">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {activeTab === 'home' && (
                <div className="space-y-6">
                  {/* Premium Header Banner inspired by the image */}
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white p-6 shadow-xl shadow-blue-500/15">
                    {/* Background light glow effects */}
                    <div className="absolute top-[-50%] right-[-30%] w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 rounded-full bg-indigo-300/10 blur-2xl pointer-events-none" />
                    
                    {/* Top Action Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center">
                          <Home size={14} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Client Portal</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs font-bold font-mono">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      </div>
                    </div>

                    {/* Shop details / Title */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <h2 className="text-xl font-extrabold tracking-tight leading-tight">
                          {user?.shopName || 'Tessio Digital'}
                        </h2>
                        <ChevronRight size={16} className="rotate-90 opacity-70" />
                      </div>
                      <p className="text-[11px] text-white/80 font-medium flex items-center gap-1.5 flex-wrap">
                        Welcome, <span className="font-bold">{user?.username}</span>
                        {isReadOnly ? (
                          <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Staff (View-Only)
                          </span>
                        ) : (
                          <span className="bg-emerald-400 text-emerald-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Shop Owner
                          </span>
                        )}
                      </p>
                    </div>

                    {/* General Search bar */}
                    <div className="relative mt-6">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search records or codes..."
                        className="w-full bg-white text-slate-800 placeholder-slate-400 border-none rounded-2xl py-3 pl-10 pr-10 text-xs shadow-md shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (e.target.value) {
                            setView('records-list');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          setView('records-list');
                          setShowFilters(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
                      >
                        <Filter size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Services Grid Header */}
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Workspace Services</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Select a digital service below</p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-xl">
                      {1 + [
                        qrPublished && user?.services?.['QR Generator'] === true,
                        clientPublished && user?.services?.['Client Management'] === true,
                        invoicePublished && user?.services?.['Invoice Management'] === true
                      ].filter(Boolean).length} Enabled
                    </span>
                  </div>

                  {/* Services Bento Grid */}
                  <div className={`grid gap-x-4 gap-y-6 pt-1 ${totalPublishedCount <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {/* Service: My Records */}
                    <div 
                      onClick={() => setView('records-list')}
                      className="group flex flex-col items-center cursor-pointer select-none active:scale-95 transition-transform"
                    >
                      <div className="relative w-full aspect-square rounded-[1.75rem] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/15 overflow-hidden">
                        {/* Decorative internal elements */}
                        <div className="absolute top-[-20%] right-[-20%] w-12 h-12 rounded-full bg-white/10 blur-md" />
                        <Database className="text-white w-8 h-8" />
                        
                        {/* Star / Status Badge */}
                        <div className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[8px] font-bold text-white">
                          <Star size={7} className="fill-white text-white" />
                          <span>4.9</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800 mt-2.5 text-center group-hover:text-indigo-600 transition-colors leading-tight">My Records</span>
                      <span className="text-[9px] font-medium text-slate-400 text-center mt-0.5">Core Database</span>
                    </div>

                    {/* Service: QR Generator */}
                    {qrPublished && (() => {
                      const isEnabled = user?.services?.['QR Generator'] === true;
                      return (
                        <div 
                          onClick={() => {
                            if (isEnabled) {
                              setView('qr');
                            } else {
                              setView('manage-services');
                            }
                          }}
                          className="group flex flex-col items-center cursor-pointer select-none active:scale-95 transition-transform"
                        >
                          <div className={`relative w-full aspect-square rounded-[1.75rem] flex items-center justify-center overflow-hidden transition-all shadow-lg ${
                            isEnabled 
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/15' 
                              : 'bg-slate-100 border border-slate-200'
                          }`}>
                            <div className="absolute top-[-20%] right-[-20%] w-12 h-12 rounded-full bg-white/10 blur-md" />
                            <QrCode className={`${isEnabled ? 'text-white' : 'text-slate-400'} w-8 h-8`} />
                            
                            {/* Star / Status Badge */}
                            <div className={`absolute top-2.5 right-2.5 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[8px] font-bold ${
                              isEnabled 
                                ? 'bg-white/20 border border-white/10 text-white' 
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isEnabled ? (
                                <>
                                  <Star size={7} className="fill-white text-white" />
                                  <span>4.8</span>
                                </>
                              ) : (
                                <Lock size={7} />
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 mt-2.5 text-center group-hover:text-amber-500 transition-colors leading-tight">QR Generator</span>
                          <span className="text-[9px] font-medium text-slate-400 text-center mt-0.5">Automation</span>
                        </div>
                      );
                    })()}

                    {/* Service: Client Management */}
                    {clientPublished && (() => {
                      const isEnabled = user?.services?.['Client Management'] === true;
                      return (
                        <div 
                          onClick={() => {
                            if (isEnabled) {
                              setView('clients');
                            } else {
                              setView('manage-services');
                            }
                          }}
                          className="group flex flex-col items-center cursor-pointer select-none active:scale-95 transition-transform"
                        >
                          <div className={`relative w-full aspect-square rounded-[1.75rem] flex items-center justify-center overflow-hidden transition-all shadow-lg ${
                            isEnabled 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/15' 
                              : 'bg-slate-100 border border-slate-200'
                          }`}>
                            <div className="absolute top-[-20%] right-[-20%] w-12 h-12 rounded-full bg-white/10 blur-md" />
                            <Users className={`${isEnabled ? 'text-white' : 'text-slate-400'} w-8 h-8`} />
                            
                            {/* Star / Status Badge */}
                            <div className={`absolute top-2.5 right-2.5 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[8px] font-bold ${
                              isEnabled 
                                ? 'bg-white/20 border border-white/10 text-white' 
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isEnabled ? (
                                <>
                                  <Star size={7} className="fill-white text-white" />
                                  <span>4.7</span>
                                </>
                              ) : (
                                <Lock size={7} />
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 mt-2.5 text-center group-hover:text-blue-500 transition-colors leading-tight">Clients</span>
                          <span className="text-[9px] font-medium text-slate-400 text-center mt-0.5">CRM & Tracking</span>
                        </div>
                      );
                    })()}

                    {/* Service: Invoice System */}
                    {invoicePublished && (() => {
                      const isEnabled = user?.services?.['Invoice Management'] === true;
                      return (
                        <div 
                          onClick={() => {
                            if (isEnabled) {
                              setView('invoices');
                            } else {
                              setView('manage-services');
                            }
                          }}
                          className="group flex flex-col items-center cursor-pointer select-none active:scale-95 transition-transform"
                        >
                          <div className={`relative w-full aspect-square rounded-[1.75rem] flex items-center justify-center overflow-hidden transition-all shadow-lg ${
                            isEnabled 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/15' 
                              : 'bg-slate-100 border border-slate-200'
                          }`}>
                            <div className="absolute top-[-20%] right-[-20%] w-12 h-12 rounded-full bg-white/10 blur-md" />
                            <FileText className={`${isEnabled ? 'text-white' : 'text-slate-400'} w-8 h-8`} />
                            
                            {/* Star / Status Badge */}
                            <div className={`absolute top-2.5 right-2.5 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[8px] font-bold ${
                              isEnabled 
                                ? 'bg-white/20 border border-white/10 text-white' 
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isEnabled ? (
                                <>
                                  <Star size={7} className="fill-white text-white" />
                                  <span>4.6</span>
                                </>
                              ) : (
                                <Lock size={7} />
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 mt-2.5 text-center group-hover:text-emerald-500 transition-colors leading-tight">Invoices</span>
                          <span className="text-[9px] font-medium text-slate-400 text-center mt-0.5">Billing & Estimates</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Dealer Settings card */}
                  <div className="mt-4">
                    <DealerSettings onUpdate={loadRecords} />
                  </div>
                </div>
              )}



{activeTab === 'account' && <AccountView onRecordsUpdate={loadRecords} />}
{activeTab === 'settings' && <SettingsView onLogout={logout} onManageServices={() => setView('manage-services')} onShowFlyer={onShowFlyer} />}
</motion.div>
          )}

          {view === 'records-list' && (
            <motion.div 
              key="records-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {isReadOnly && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                    <span>Staff Mode: View-Only Access ({user?.shopName || 'Shop'})</span>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest bg-amber-200/60 px-2 py-0.5 rounded-lg text-amber-900">User</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setView('list')}
                    className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-transform border border-slate-100"
                    title="Back to Services"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-none">My Records</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core Database</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {records.length > 0 && (
                    <>
                      <button 
                        id="filter-btn"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md active:shadow-inner",
                          showFilters 
                            ? "bg-amber-500 text-white shadow-amber-200 ring-2 ring-amber-500/20" 
                            : "bg-white text-slate-500 shadow-slate-100 border border-slate-200"
                        )}
                        title="Toggle Filters"
                        style={{
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                      >
                        <Filter size={18} className={cn("transition-transform duration-300", showFilters && "rotate-180")} />
                      </button>
                      <button 
                        id="select-mode-btn"
                        onClick={() => {
                          setIsSelectMode(!isSelectMode);
                          setSelectedIds([]);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md active:shadow-inner",
                          isSelectMode 
                            ? "bg-emerald-500 text-white shadow-emerald-200 ring-2 ring-emerald-500/20" 
                            : "bg-white text-slate-500 shadow-slate-100 border border-slate-200"
                        )}
                        title={isSelectMode ? "Cancel Selection" : "Bulk Select"}
                      >
                        <ShieldCheck size={18} />
                      </button>
                    </>
                  )}
                  {!isSelectMode && !isReadOnly && (
                    <>
                      <label 
                        id="excel-import-btn"
                        className="w-10 h-10 bg-white text-blue-600 border border-slate-200 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md shadow-slate-100/50 hover:bg-slate-50 cursor-pointer"
                        title="Bulk Excel Import"
                      >
                        <Upload size={18} />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".xlsx, .xls" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedExcelFile(file);
                              setView('excel' as any);
                            }
                          }} 
                        />
                      </label>
                      <button 
                        id="add-record-btn"
                        onClick={() => setView('add')}
                        className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                        title="Add Record"
                      >
                        <Plus size={22} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isSelectMode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 space-y-3"
                >
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const filteredIds = filteredRecords.map(r => Number(r.id));
                          const allFilteredSelected = filteredIds.every(id => selectedIds.includes(id));
                          
                          if (allFilteredSelected) {
                            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
                          } else {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-emerald-600 px-2 py-1 active:bg-emerald-50 rounded-lg transition-colors"
                      >
                        {filteredRecords.every(r => selectedIds.includes(Number(r.id))) && filteredRecords.length > 0 ? (
                          <><CheckSquare size={16} /> Deselect All</>
                        ) : (
                          <><Square size={16} /> Select All</>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">{selectedIds.length} Selected</span>
                    </div>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                      <span className="text-xs font-bold text-red-700">{selectedIds.length} Selected</span>
                      <button 
                        onClick={handleBulkDelete}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Delete Selected
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search records..."
                      className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Filter Dealer</label>
                      <input 
                        type="text"
                        placeholder="Search Dealer..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        value={dealerFilter}
                        onChange={(e) => setDealerFilter(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Filter Company</label>
                      <input 
                        type="text"
                        placeholder="Search Company..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3 relative pb-4">
                <AnimatePresence>
                  {searchTerm.length >= 2 && liveResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-indigo-50/50 rounded-[2rem] p-4 mb-6 border border-indigo-100"
                    >
                      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-2">Live Suggestions from Dealer Codes</h3>
                      <div className="space-y-2">
                        {liveResults.map((s: any) => {
                          const pricing = calculatePrices(s);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => {
                                setSelectedRecord(s);
                                setView('details');
                              }}
                              className="bg-white p-3 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-transform cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                                  {s.dealer_code?.[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{s.dealer_code} / {s.company_code}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">Retail: ${pricing.sp.toFixed(2)}</p>
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {paginatedRecords.map(record => {
                  const { sp } = calculatePrices(record);
                  const recordId = Number(record.id);
                  const isSelected = selectedIds.includes(recordId);
                  return (
                    <div 
                      key={record.id}
                      onClick={() => { 
                        if (isSelectMode) {
                          toggleSelect(recordId);
                        } else {
                          setSelectedRecord(record); 
                          setView('details'); 
                        }
                      }}
                      className={cn(
                        "bg-white border p-4 rounded-2xl flex items-center justify-between hover:border-emerald-200 transition-all cursor-pointer active:bg-slate-50 shadow-sm",
                        isSelected ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500" : "border-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isSelectMode && (
                          <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                            isSelected ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-200"
                          )}>
                            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Dealer: {record.dealer_code || '(Pending)'}</p>
                            {record.source && record.source !== 'Manual' && (
                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[80px]" title={record.source}>
                                {record.source}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">Company: {record.company_code}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">SP: ${sp.toFixed(2)}</p>
                        </div>
                      </div>
                      {!isSelectMode && <ChevronRight className="text-slate-300 ml-2" size={20} />}
                    </div>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-400 text-sm">No records found</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {filteredRecords.length > 0 && (
                  <div className="flex flex-col items-center justify-between gap-4 pt-4 border-t border-slate-100 sm:flex-row px-1">
                    <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                      Showing <span className="font-bold text-slate-800">{Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                      <span className="font-bold text-slate-800">{Math.min(filteredRecords.length, currentPage * itemsPerPage)}</span> of{' '}
                      <span className="font-bold text-slate-800">{filteredRecords.length}</span> records
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95"
                        title="Previous Page"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Page Numbers */}
                      {(() => {
                        const pages = [];
                        const maxPagesToShow = 3;
                        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                        if (endPage - startPage + 1 < maxPagesToShow) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }

                        if (startPage > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setCurrentPage(1)}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-95",
                                currentPage === 1 
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" 
                                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              1
                            </button>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <span key="dots-start" className="text-slate-400 text-xs px-1 select-none">
                                ...
                              </span>
                            );
                          }
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          if (i < 1 || i > totalPages) continue;
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-95",
                                currentPage === i 
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" 
                                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {i}
                            </button>
                          );
                        }

                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <span key="dots-end" className="text-slate-400 text-xs px-1 select-none">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-95",
                                currentPage === totalPages 
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" 
                                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {totalPages}
                            </button>
                          );
                        }

                        return pages;
                      })()}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95"
                        title="Next Page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">Rows:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Data & Share Options */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} className="text-indigo-500" />
                    Data & Share Actions
                  </h3>
                </div>

                <div className={cn("grid gap-3", isReadOnly ? "grid-cols-2" : "grid-cols-3")}>
                  <button 
                    onClick={handleShareAllWhatsApp} 
                    className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-100 active:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Share2 size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">Share All</span>
                  </button>

                  <button 
                    onClick={handleExport} 
                    className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-100 active:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Download size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">Export JSON</span>
                  </button>

                  {!isReadOnly && (
                    <label 
                      className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 active:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Upload size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">Import JSON</span>
                      <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                  )}
                </div>
              </div>

              {/* Upload History Section */}
              <div className="pt-6 border-t border-slate-100 space-y-4 pb-24" id="upload-history-container">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Upload size={14} className="text-blue-500" />
                    Upload History
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uploads.length} Files</span>
                </div>

                <div className="space-y-3">
                  {uploads.map(upload => (
                    <div key={upload.id} className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 leading-tight truncate max-w-[150px]">{upload.filename}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {new Date(upload.timestamp).toLocaleDateString()} • {upload.recordCount ?? upload.record_count ?? 0} Records
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteUpload(upload.id, upload.filename)}
                        disabled={loading}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95"
                        title="Delete records from this file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {uploads.length === 0 && (
                    <div className="text-center py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                      <Upload size={20} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-[11px] text-slate-400 font-medium">No upload history found</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'add' && <RecordForm onBack={() => setView('records-list')} onSuccess={loadRecords} />}
          {view === 'edit' && <RecordForm record={selectedRecord} onBack={() => setView('records-list')} onSuccess={loadRecords} />}
          {view === 'details' && (
            <RecordDetails 
              record={selectedRecord} 
              pricing={calculatePrices(selectedRecord)}
              isReadOnly={isReadOnly}
              onBack={() => setView('records-list')} 
              onEdit={() => setView('edit')}
              onShare={() => handleShareWhatsApp(selectedRecord)}
              onDelete={async () => {
                showConfirm(
                  "Delete Record",
                  "Are you sure you want to delete this record? This action cannot be undone.",
                  async () => {
                    try {
                      await fetchWithAuth(`/records/${selectedRecord.id}`, { method: 'DELETE' });
                      showToast("Record deleted successfully.", "success");
                      await loadRecords();
                      setView('records-list');
                    } catch (err: any) {
                      showToast(err.message, "error");
                    }
                  }
                );
              }}
            />
          )}
          {(view as any) === 'excel' && (
            <ExcelImportView 
              initialFile={selectedExcelFile}
              onBack={() => {
                setSelectedExcelFile(null);
                setView('records-list');
              }} 
              onSuccess={() => { 
                setSelectedExcelFile(null);
                loadRecords(); 
                setView('records-list'); 
              }} 
            />
          )}
{view === 'qr' && (
<ActionQRGenerator 
onBack={() => setView('list')} 
/>
)}
{view === 'clients' && (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6 pb-24"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('list')}
          className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-none">Client Management</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Track & Remind</p>
        </div>
      </div>
      <button 
        onClick={() => {
          // Trigger add client in child component
          const event = new CustomEvent('trigger-add-client');
          window.dispatchEvent(event);
        }}
        className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={20} />
      </button>
    </div>
    <div className="flex-1">
      <ClientManagementView fetchWithAuth={fetchWithAuth} />
    </div>
  </motion.div>
)}
{view === 'invoices' && (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6 pb-24"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('list')}
          className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-none">Invoice System</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Professional Billing</p>
        </div>
      </div>
    </div>
    <div className="flex-1">
      <InvoiceManagementView fetchWithAuth={fetchWithAuth} />
    </div>
  </motion.div>
)}
{view === 'manage-services' && (
  <ServiceRequestView onBack={() => setView('list')} />
)}
</AnimatePresence>
</div>

<div className="client-nav">
  {/* Desktop Sidebar Header */}
  <div className="hidden md:flex flex-col items-center text-center pb-6 border-b border-slate-100 mb-6 w-full">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 overflow-hidden border border-slate-100 shadow-sm shadow-slate-100/50">
      <img 
        src={tessioLogo} 
        alt="Tessio Logo" 
        className="w-14 h-14 object-contain" 
        referrerPolicy="no-referrer" 
      />
    </div>
    <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-none">Tessio Records</h1>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Client Portal</p>
  </div>

  <div className="flex md:flex-col items-center justify-around md:justify-start w-full md:gap-2">
    <NavButton active={activeTab === 'home'} icon={<Home size={20} />} label="Home" onClick={() => { setActiveTab('home'); setView('list'); }} />
    <NavButton active={activeTab === 'account'} icon={<User size={20} />} label="Account" onClick={() => { setActiveTab('account'); setView('list'); }} />
    <NavButton active={activeTab === 'settings'} icon={<SettingsIcon size={20} />} label="Settings" onClick={() => { setActiveTab('settings'); setView('list'); }} />
  </div>

  {/* Desktop Sidebar Footer */}
  <div className="hidden md:flex flex-col w-full mt-auto pt-6 border-t border-slate-100 gap-3">
    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 text-left">
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Logged In As</p>
      <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{user?.username || 'Client'}</p>
    </div>
    <button 
      onClick={() => {
        logout();
      }}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all text-xs font-bold"
    >
      <LogOut size={16} />
      <span>Log Out</span>
    </button>
  </div>
</div>

{/* Custom Confirmation Modal */}
<AnimatePresence>
  {confirmDialog && confirmDialog.isOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setConfirmDialog(null)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden"
      >
        {/* Top colored accent line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500" />
        
        <div className="mt-2 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 text-rose-600 mb-4">
            <Trash2 size={24} />
          </div>
          
          <h3 className="text-base font-bold text-slate-800 tracking-tight leading-tight mb-2">
            {confirmDialog.title}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed px-1">
            {confirmDialog.message}
          </p>
        </div>
        
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmDialog(null)}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-100 text-xs font-bold transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

{/* Custom Toast Alert */}
<AnimatePresence>
  {toast && toast.isOpen && (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className={cn(
          "p-4 rounded-2xl shadow-xl border flex items-center gap-3",
          toast.type === 'error' 
            ? "bg-rose-50 border-rose-100 text-rose-800" 
            : toast.type === 'info'
              ? "bg-blue-50 border-blue-100 text-blue-800"
              : "bg-emerald-50 border-emerald-100 text-emerald-800"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
          toast.type === 'error' 
            ? "bg-rose-100 text-rose-600" 
            : toast.type === 'info'
              ? "bg-blue-100 text-blue-600"
              : "bg-emerald-100 text-emerald-600"
        )}>
          {toast.type === 'error' ? (
            <X size={16} />
          ) : toast.type === 'info' ? (
            <FileText size={16} />
          ) : (
            <Check size={16} />
          )}
        </div>
        <div className="flex-1 text-xs font-bold leading-tight">
          {toast.message}
        </div>
        <button 
          onClick={() => setToast(null)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <X size={14} />
        </button>
      </motion.div>
    </div>
  )}
</AnimatePresence>
</div>
);
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3.5 transition-all duration-200 md:w-full md:px-4 md:py-3.5 md:rounded-2xl text-center md:text-left select-none",
        active 
          ? "text-emerald-600 md:text-emerald-700 md:bg-emerald-50/80 font-bold" 
          : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50/60"
      )}
    >
      <span className={cn("transition-transform duration-200", active && "scale-110 md:scale-100")}>
        {icon}
      </span>
      <span className="text-[9px] md:text-xs font-black md:font-bold uppercase md:capitalize tracking-widest md:tracking-normal">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-dot" 
          className="w-1 h-1 bg-emerald-600 md:bg-emerald-700 rounded-full mt-0.5 md:hidden" 
        />
      )}
    </button>
  );
}

function RecordForm({ record, onBack, onSuccess }: any) {
  const { fetchWithAuth } = useAuth();
  const [dealerCode, setDealerCode] = useState(record?.dealer_code || '');
  const [companyCode, setCompanyCode] = useState(record?.company_code || '');
  const [costPrice, setCostPrice] = useState(record?.cost_price?.toString() || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (dealerCode.length < 2 && companyCode.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const q = dealerCode || companyCode;
        const data = await fetchWithAuth(`/records/suggestions?q=${q}`);
        setSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [dealerCode, companyCode]);

  const handleSubmit = async (e: React.FormEvent, overwrite: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const method = record ? 'PUT' : 'POST';
      const url = record ? `/records/${record.id}` : '/records';
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ 
          dealerCode, 
          companyCode, 
          costPrice: parseFloat(costPrice) || 0,
          overwrite 
        })
      });

      if (response.duplicate) {
        if (window.confirm(`A record with company code "${companyCode}" already exists. Would you like to override it?`)) {
          handleSubmit(undefined as any, true);
          return;
        } else {
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-bold">{record ? 'Edit Record' : 'Add New Record'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-20">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealer Code</label>
          <input 
            required
            type="text" 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 focus:border-emerald-500 focus:ring-0 transition-colors"
            value={dealerCode}
            onChange={(e) => setDealerCode(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Code</label>
          <input 
            required
            type="text" 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 focus:border-emerald-500 focus:ring-0 transition-colors"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Price (CP)</label>
          <div className="relative">
             <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               required
               type="number" 
               step="0.01"
               className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:border-emerald-500 focus:ring-0 transition-colors"
               value={costPrice}
               onChange={(e) => setCostPrice(e.target.value)}
             />
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Suggestions</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  type="button"
                  onClick={() => { setDealerCode(s.dealer_code); setCompanyCode(s.company_code); setCostPrice(s.cost_price?.toString() || ''); setSuggestions([]); }}
                  className="w-full text-left text-sm py-1 border-b border-emerald-100 last:border-0"
                >
                  {s.dealer_code} / {s.company_code} (${s.cost_price})
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          disabled={loading}
          className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {record ? 'Update Record' : 'Save Record'}
        </button>
      </form>
    </motion.div>
  );
}

function RecordDetails({ record, pricing, onBack, onEdit, onShare, onDelete, isReadOnly }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
        <div className="flex gap-2">
          {!isReadOnly && <button onClick={onDelete} className="p-2 bg-red-50 text-red-600 rounded-full"><Trash2 size={20} /></button>}
          <button onClick={onShare} className="p-2 bg-emerald-50 text-emerald-600 rounded-full"><Share2 size={20} /></button>
          {!isReadOnly && <button onClick={onEdit} className="p-2 bg-blue-50 text-blue-600 rounded-full"><Edit2 size={20} /></button>}
        </div>
      </div>

      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-100 mb-4">
          <Store className="text-white" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">{record.dealer_code || '(No Code)'}</h2>
        <p className="text-slate-400 font-medium">Company Code: {record.company_code}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cost Price (CP)</p>
          <p className="text-lg font-bold text-slate-900">${pricing.cp.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-100">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Selling Price (SP)</p>
          <p className="text-lg font-bold">${pricing.sp.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Commission</span>
          <span className="text-sm font-bold text-emerald-600">{pricing.commission}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Source</span>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            record.source === 'Manual' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
          )}>{record.source || 'Manual'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Last Updated</span>
          <span className="text-sm font-semibold">{new Date(record.updated_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Record ID</span>
          <span className="text-sm font-mono font-bold text-slate-400">#{record.id.toString().padStart(4, '0')}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AccountView({ onRecordsUpdate }: { onRecordsUpdate: () => void }) {
  const { user, fetchWithAuth, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [editingMobile, setEditingMobile] = useState(false);
  
  // PIN Reset states
  const [showPinReset, setShowPinReset] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const handlePinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      alert("New PIN must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      await fetchWithAuth('/profile/pin', {
        method: 'PUT',
        body: JSON.stringify({ oldPin, newPin })
      });
      alert("PIN reset successfully");
      setShowPinReset(false);
      setOldPin('');
      setNewPin('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMobile = async () => {
    setLoading(true);
    try {
      await fetchWithAuth('/profile', {
        method: 'PUT',
        body: JSON.stringify({ 
          mobile, 
          dealerCommission: user.dealerCommission 
        })
      });
      updateUser({ mobile });
      setEditingMobile(false);
      alert("Mobile number updated successfully");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold">Account Details</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Role & Shop Access</p>
            <p className="font-bold text-slate-900">{user.userType === 'User' ? 'Staff (View-Only)' : 'Shop Owner (Full Access)'}</p>
            <p className="text-xs text-slate-400 font-medium">Shared Shop: {user.shopName || 'World'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</p>
            <p className="font-bold text-slate-900">{user.username}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
               <Store size={20} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shop & Email</p>
               <p className="text-sm font-bold text-slate-900 leading-tight">{user.shopName || 'N/A'}</p>
               <p className="text-xs text-slate-400 font-medium">{user.email || 'N/A'}</p>
             </div>
           </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</p>
                {editingMobile ? (
                  <input 
                    type="text"
                    maxLength={10}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 w-full mt-1"
                    value={mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobile(val);
                    }}
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900">{mobile || 'Not Set'}</p>
                )}
              </div>
            </div>
            {editingMobile ? (
              <div className="flex gap-2">
                <button onClick={handleUpdateMobile} disabled={loading} className="text-emerald-600 font-bold text-xs p-2">Save</button>
                <button onClick={() => { setEditingMobile(false); setMobile(user.mobile || ''); }} className="text-slate-400 font-bold text-xs p-2">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditingMobile(true)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="pt-4">
          {showPinReset ? (
            <form onSubmit={handlePinReset} className="space-y-4 bg-slate-50 p-4 rounded-2xl">
              <p className="text-sm font-bold text-slate-900 mb-2">Reset Security PIN</p>
              <div className="space-y-3">
                <input 
                  required
                  type="password" 
                  maxLength={6}
                  placeholder="Current 6-Digit PIN"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                />
                <input 
                  required
                  type="password" 
                  maxLength={6}
                  placeholder="New 6-Digit PIN"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">Update PIN</button>
                <button type="button" onClick={() => setShowPinReset(false)} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowPinReset(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="text-slate-400 group-hover:text-emerald-500" size={20} />
                <span className="font-medium">Reset Security PIN</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DealerSettings({ onUpdate }: { onUpdate: () => void }) {
  const { user, fetchWithAuth, updateUser } = useAuth();
  const [dealerCommission, setDealerCommission] = useState(user.dealerCommission?.toString() || '0');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const commissionVal = parseFloat(dealerCommission) || 0;
      await fetchWithAuth('/profile', {
        method: 'PUT',
        body: JSON.stringify({ 
          mobile: user.mobile, 
          dealerCommission: commissionVal 
        })
      });
      updateUser({ dealerCommission: commissionVal });
      onUpdate();
      setEditing(false);
      alert("Account updated successfully and all records persisted with new commission.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
       <div className="flex items-center gap-3 mb-4">
          <Calculator className="text-emerald-600" size={24} />
          <h3 className="font-bold text-emerald-900">Dealer Settings</h3>
       </div>
       
       <div className="space-y-4">
         <div className="space-y-1">
           <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Dealer Commission (%)</label>
           {editing ? (
             <div className="flex gap-2">
               <input 
                 type="number" 
                 className="flex-1 bg-white border-2 border-emerald-200 rounded-xl px-4 py-2 text-sm focus:ring-0 focus:border-emerald-500 outline-none"
                 value={dealerCommission}
                 onChange={(e) => setDealerCommission(e.target.value)}
               />
             </div>
           ) : (
             <p className="text-2xl font-black text-emerald-600">{dealerCommission}%</p>
           )}
         </div>

         <div className="pt-2">
           {editing ? (
             <div className="flex gap-2">
               <button onClick={handleUpdate} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100">Save Changes</button>
               <button onClick={() => setEditing(false)} className="px-6 py-3 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold">Cancel</button>
             </div>
           ) : (
             <button onClick={() => setEditing(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100">Update Settings</button>
           )}
         </div>
       </div>
    </div>
  );
}

function SettingsView({ onLogout, onManageServices, onShowFlyer }: any) {
  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="space-y-3">
        <button 
          onClick={onManageServices}
          className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:border-indigo-100 active:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
               <Activity size={24} />
            </div>
            <div className="text-left">
               <p className="font-bold text-slate-900 text-sm">Manage your services</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Custom Feature Requests</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        {onShowFlyer && (
          <button 
            onClick={onShowFlyer}
            className="w-full flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] shadow-sm hover:border-emerald-200 active:bg-emerald-100 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                 <Globe size={24} />
              </div>
              <div className="text-left">
                 <p className="font-bold text-slate-900 text-sm">System Capabilities & SLA</p>
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">✨ Interactive Cloud Flyer</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-emerald-400" />
          </button>
        )}

        <div className="pt-2">
           <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group active:bg-slate-100 transition-colors border border-slate-100">
             <div className="flex items-center gap-3">
               <ShieldCheck className="text-slate-400 group-hover:text-emerald-500" size={20} />
               <span className="font-medium text-slate-700">Security & Privacy</span>
             </div>
             <ChevronRight size={18} className="text-slate-300" />
           </button>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl active:bg-red-100 transition-colors mt-4 border border-red-100"
        >
          <LogOut size={22} />
          <span className="font-bold uppercase tracking-widest text-xs">Logout Securely</span>
        </button>
      </div>

      <div className="pt-8 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tessio Textile Portal v1.2</p>
      </div>
    </div>
  );
}

function ExcelImportView({ onBack, onSuccess, initialFile }: any) {
  const { fetchWithAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionRequired, setDecisionRequired] = useState<{ count: number; total: number; duplicates: string[] } | null>(null);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  
  // Mapping state
  const [companyCodeCols, setCompanyCodeCols] = useState<string[]>([]);
  const [priceCol, setPriceCol] = useState('');
  const [dealerCodeCol, setDealerCodeCol] = useState('');

  const parseFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const excelHeaders: any = json[0];
      const excelData: any = json.slice(1);
      
      setHeaders(excelHeaders);
      setData(excelData);
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    if (initialFile) {
      parseFile(initialFile);
    }
  }, [initialFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleImport = async (strategy?: 'overwrite' | 'skip', overwriteCodes?: string[]) => {
    if (companyCodeCols.length === 0 || !priceCol) {
      alert("Please map all required columns");
      return;
    }
    
    setLoading(true);
    try {
      const recordsToImport = data.map(row => {
        const dealer_code = dealerCodeCol ? (row[headers.indexOf(dealerCodeCol)]?.toString() || '') : '';
        const company_code = companyCodeCols
          .map(col => row[headers.indexOf(col)]?.toString() || '')
          .filter(val => val.trim().length > 0)
          .join(' - ');
        
        const cost_price = parseFloat(row[headers.indexOf(priceCol)]) || 0;
        
        return { dealer_code, company_code, cost_price };
      }).filter(r => r.company_code.length > 0);

      if (recordsToImport.length === 0) {
        alert("No valid records found after mapping.");
        setLoading(false);
        return;
      }

      const response = await fetchWithAuth('/records/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ records: recordsToImport, strategy, overwriteCodes, filename: fileName })
      });
      
      if (response.requiresDecision) {
        setDecisionRequired({ 
          count: response.duplicateCount, 
          total: response.totalCount,
          duplicates: response.duplicates || []
        });
        setSelectedDuplicates([]); // Default none selected
        setLoading(false);
        return;
      }

      const results = response;
      let msg = `Successfully imported ${results.imported} new records!`;
      if (results.updated > 0) msg += `\nUpdated ${results.updated} existing records.`;
      if (results.skipped > 0) msg += `\nSkipped ${results.skipped} duplicates.`;
      
      alert(msg);
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyCol = (col: string) => {
    setCompanyCodeCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full cursor-pointer"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-bold">Excel Bulk Import</h2>
      </div>

      {step === 1 && (
        <div className="text-center space-y-6 pt-10">
           <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
             <Upload size={48} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900">Upload Data File</h3>
             <p className="text-sm text-slate-400 mt-2 px-8">Upload your .xlsx or .xls file to begin mapping columns and prices.</p>
           </div>
           
           <label className="block px-8">
             <span className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
                Select Excel File
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
             </span>
           </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
           <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
             <div className="flex items-center gap-3">
               <FileText className="text-blue-600" size={20} />
               <span className="text-sm font-bold text-slate-700">{fileName}</span>
             </div>
             <button onClick={() => { setStep(1); setDecisionRequired(null); }} className="text-xs font-bold text-blue-600">Change</button>
           </div>

           {!decisionRequired ? (
             <>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">1. Select Dealer Code Column (Optional)</label>
                   <select 
                     className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500"
                     value={dealerCodeCol}
                     onChange={(e) => setDealerCodeCol(e.target.value)}
                   >
                     <option value="">Keep Blank (Pending)</option>
                     {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                   </select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">2. Company Code Columns (Selected: {companyCodeCols.length})</label>
                   <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                     {headers.map((h, i) => (
                       <button 
                         key={i}
                         onClick={() => toggleCompanyCol(h)}
                         className={cn(
                           "flex items-center justify-between p-3 rounded-xl border-2 text-xs font-bold transition-all",
                           companyCodeCols.includes(h) 
                            ? "bg-blue-50 border-blue-500 text-blue-600" 
                            : "bg-white border-slate-50 text-slate-400"
                         )}
                       >
                         {h}
                         {companyCodeCols.includes(h) && <Check size={14} />}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">3. Cost Price (CP) Column</label>
                   <select 
                     className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500"
                     value={priceCol}
                     onChange={(e) => setPriceCol(e.target.value)}
                     required
                   >
                     <option value="">Select Column...</option>
                     {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                   </select>
                 </div>
               </div>

               <button 
                 onClick={() => handleImport()}
                 disabled={loading}
                 className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-8 mb-20"
               >
                 {loading ? 'Processing Data...' : `Import ${data.length} Records`}
               </button>
             </>
           ) : (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 space-y-6"
             >
                <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-100">
                  <Activity size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-amber-900">Duplicates Detected</h3>
                  <p className="text-sm text-amber-700 mt-2">
                    We found <span className="font-black underline">{decisionRequired.count}</span> records that already exist. 
                    Choose which ones to update or skip.
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Duplicate Records</span>
                    <button 
                      onClick={() => setSelectedDuplicates(
                        selectedDuplicates.length === decisionRequired.duplicates.length 
                          ? [] 
                          : [...decisionRequired.duplicates]
                      )}
                      className="text-[10px] font-bold text-blue-600"
                    >
                      {selectedDuplicates.length === decisionRequired.duplicates.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {decisionRequired.duplicates.map((code, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedDuplicates(prev => 
                        prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                      )}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs text-left",
                        selectedDuplicates.includes(code)
                          ? "bg-amber-100 border-amber-500 text-amber-900"
                          : "bg-white border-amber-100 text-slate-500"
                      )}
                    >
                      <span className="truncate pr-4 font-bold">{code}</span>
                      {selectedDuplicates.includes(code) && <Check size={14} className="text-amber-500" />}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  {selectedDuplicates.length > 0 ? (
                    <button 
                      onClick={() => handleImport(undefined, selectedDuplicates)}
                      disabled={loading}
                      className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} /> Update {selectedDuplicates.length} Selected
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleImport('overwrite')}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} /> Update All {decisionRequired.count}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleImport('skip')}
                    disabled={loading}
                    className="w-full bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <X size={20} /> Skip Duplicates
                  </button>
                  
                  <button 
                    onClick={() => { setDecisionRequired(null); setStep(1); }}
                    className="text-amber-600 font-bold text-xs p-2 text-center w-full"
                  >
                    Go Back & Cancel
                  </button>
                </div>
             </motion.div>
           )}
        </div>
      )}
    </motion.div>
  );
}

function ActionQRGenerator({ onBack }: { onBack: () => void }) {
  const { fetchWithAuth, user } = useAuth();
  const historyKey = user?.id ? `qr_adjuster_history_${user.id}` : 'qr_adjuster_history';

  const adjustRowsPreservingFormat = (headers: string[] | undefined, rows: any[], commissionPercentage: number) => {
    if (!rows || rows.length === 0) {
      return { adjustedHeaders: headers || [], adjustedRows: [] };
    }

    const originalHeaders = headers && headers.length > 0 ? [...headers] : Object.keys(rows[0]);

    const allKeysSet = new Set<string>();
    originalHeaders.forEach(h => allKeysSet.add(h));
    rows.forEach(r => Object.keys(r).forEach(k => allKeysSet.add(k)));
    const allKeys = Array.from(allKeysSet);

    const rrpKey = allKeys.find(k => k === 'RRP (₹)' || k === 'RRP' || k === 'RRP(₹)' || k === 'RRP (Rs)') ||
                   allKeys.find(k => /rrp|mrp|base price|rate|price|cost/i.test(k) && !/gst|tax|code|sku|id|no|amount|total/i.test(k));

    const gstRateKey = allKeys.find(k => k === 'GST RATE %' || k === 'GST RATE(%)' || k === 'GST RATE') ||
                       allKeys.find(k => /gst rate|tax rate|gst %|gst_rate|gst\(%\)/i.test(k)) ||
                       allKeys.find(k => /^gst$/i.test(k.trim()));

    const gstAmountKey = allKeys.find(k => k === 'GST AMOUNT (₹)' || k === 'GST AMOUNT' || k === 'GST AMOUNT(₹)') ||
                         allKeys.find(k => /gst amount|tax amount|gst_amount|gst amt/i.test(k));

    const totalKey = allKeys.find(k => k === 'Total (₹)' || k === 'Total' || k === 'TOTAL (₹)' || k === 'TOTAL') ||
                     allKeys.find(k => /total|grand total|final amount|net total/i.test(k));

    const adjustedRows = rows.map((row: any) => {
      const rawRRPStr = rrpKey && row[rrpKey] !== undefined ? String(row[rrpKey]) : '0';
      const originalRRPValue = parseFloat(rawRRPStr.replace(/[^0-9.]/g, '')) || 0;
      const finalRRP = Math.round(originalRRPValue * (1 + commissionPercentage / 100));

      let gstRatePercent = 0;
      if (gstRateKey && row[gstRateKey] !== undefined && row[gstRateKey] !== null) {
        const rateStr = String(row[gstRateKey]).replace('%', '').trim();
        gstRatePercent = parseFloat(rateStr) || 0;
      } else if (row["GST"] && String(row["GST"]).includes('%')) {
        gstRatePercent = parseFloat(String(row["GST"]).replace('%', '')) || 0;
      } else if (row["GST RATE(%)"]) {
        gstRatePercent = parseFloat(String(row["GST RATE(%)"]).replace('%', '')) || 0;
      } else if (row["GST RATE %"]) {
        gstRatePercent = parseFloat(String(row["GST RATE %"]).replace('%', '')) || 0;
      } else if (row["GST"] && parseFloat(String(row["GST"])) <= 28 && parseFloat(String(row["GST"])) > 0) {
        gstRatePercent = parseFloat(String(row["GST"])) || 0;
      }

      const calculatedGSTAmount = Math.round(finalRRP * (gstRatePercent / 100));
      const calculatedTotal = Math.round(finalRRP + calculatedGSTAmount);

      const adjustedRow: any = {};

      originalHeaders.forEach((hKey: string) => {
        if (hKey === rrpKey) {
          adjustedRow[hKey] = finalRRP.toFixed(0);
        } else if (hKey === gstRateKey) {
          const origVal = String(row[hKey] || '');
          adjustedRow[hKey] = origVal.includes('%') ? `${gstRatePercent}%` : gstRatePercent.toString();
        } else if (hKey === gstAmountKey) {
          adjustedRow[hKey] = calculatedGSTAmount.toFixed(0);
        } else if (hKey === totalKey) {
          adjustedRow[hKey] = calculatedTotal.toFixed(0);
        } else {
          adjustedRow[hKey] = row[hKey] !== undefined ? row[hKey] : "-";
        }
      });

      Object.keys(row).forEach((k: string) => {
        if (!(k in adjustedRow)) {
          if (k === rrpKey) adjustedRow[k] = finalRRP.toFixed(0);
          else if (k === gstRateKey) adjustedRow[k] = `${gstRatePercent}%`;
          else if (k === gstAmountKey) adjustedRow[k] = calculatedGSTAmount.toFixed(0);
          else if (k === totalKey) adjustedRow[k] = calculatedTotal.toFixed(0);
          else adjustedRow[k] = row[k];
        }
      });

      return adjustedRow;
    });

    const finalHeaders = originalHeaders.length > 0 ? [...originalHeaders] : Object.keys(adjustedRows[0] || {});
    if (adjustedRows.length > 0) {
      Object.keys(adjustedRows[0]).forEach(k => {
        if (!finalHeaders.includes(k)) {
          finalHeaders.push(k);
        }
      });
    }

    return { adjustedHeaders: finalHeaders, adjustedRows };
  };

  const detectIsQuality = (rows: any[], key: string) => {
    if (!rows || rows.length === 0 || !key) return false;
    let textCount = 0;
    let totalCount = 0;
    for (const row of rows) {
      const val = String(row[key] || '').trim();
      if (!val || val === '-') continue;
      totalCount++;
      const hasLetters = /[A-Z]/i.test(val);
      const hasManyNumbers = (val.match(/\d/g) || []).length > 4;
      if (hasLetters && !hasManyNumbers) {
        textCount++;
      }
      if (totalCount >= 10) break;
    }
    return totalCount > 0 && (textCount / totalCount) > 0.7;
  };

  const getDisplayHeader = (h: string) => {
    const upper = h.toUpperCase().trim();
    if (upper === 'SKU' || upper === 'PRICE CODE') {
      const isQuality = detectIsQuality(adjustedData, h) || extractedData?.headers?.some(orig => /quality/i.test(orig));
      if (isQuality) return 'QUALITY';
      return 'PRICE CODE';
    }
    if (upper === 'HSN' || upper === 'HSN CODE') return 'HSN CODE';
    if (upper === 'GST RATE(%)' || upper === 'GST RATE %' || upper === 'GST RATE' || upper === 'GST RATE( %)') return 'GST RATE %';
    if (upper === 'RRP' || upper === 'RRP (₹)') return 'RRP (₹)';
    if (upper === 'GST AMOUNT' || upper === 'GST AMOUNT (₹)') return 'GST AMOUNT (₹)';
    if (upper === 'TOTAL' || upper === 'TOTAL (₹)') return 'Total (₹)';
    return h;
  };

  const getDisplayValue = (h: string, val: any) => {
    const upper = h.toUpperCase().trim();
    if (upper === 'GST RATE(%)' || upper === 'GST RATE %' || upper === 'GST RATE' || upper === 'GST RATE( %)') {
      return String(val).replace('%', '');
    }
    return val;
  };

  const [step, setStep] = useState<'input' | 'scanning' | 'extracting' | 'adjusting' | 'published'>('input');
  const [url, setUrl] = useState('');
  const [extractedData, setExtractedData] = useState<{ id?: string, title: string, headers: string[], rows: any[] } | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [adjustedData, setAdjustedData] = useState<any[]>([]);
  const [commission, setCommission] = useState(user?.dealerCommission || 0);
  const [loading, setLoading] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // States for history panel, search and updates checking
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [checkingUpdateId, setCheckingUpdateId] = useState<string | null>(null);
  const [updateNotification, setUpdateNotification] = useState<{ id: string, type: 'success' | 'info' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (extractedData) {
      const title = extractedData.title || '';
      const underscoreIndex = title.indexOf('_');
      if (underscoreIndex !== -1) {
        setCompanyName(title.slice(0, underscoreIndex));
        setCollectionName(title.slice(underscoreIndex + 1));
      } else {
        setCompanyName(title);
        setCollectionName('');
      }
    } else {
      setCompanyName('');
      setCollectionName('');
    }
  }, [extractedData?.title, extractedData?.id]);

  const updateTitle = (company: string, collection: string) => {
    const combined = collection ? `${company}_${collection}` : company;
    setExtractedData(prev => {
      if (!prev) return null;
      const updated = { ...prev, title: combined };
      if (activeEntryId) {
        const updatedHistory = history.map(h => {
          if (h.id === activeEntryId) {
            return {
              ...h,
              title: combined,
              companyName: company,
              collectionName: collection,
              extractedData: { ...h.extractedData, title: combined }
            };
          }
          return h;
        });
        setHistory(updatedHistory);
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      }
      return updated;
    });
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error("Failed to parse history", err);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [historyKey]);

  const saveToHistory = (data: { id?: string, title: string, headers: string[], rows: any[] }, currentUrl: string = url) => {
    const entryId = activeEntryId || data.id || Date.now().toString();
    setActiveEntryId(entryId);
    
    const parsedCompanyName = data.title ? data.title.split('_')[0] : '';
    const parsedCollectionName = data.title && data.title.includes('_') ? data.title.split('_').slice(1).join('_') : '';

    const newEntry = {
      id: entryId,
      title: data.title,
      companyName: parsedCompanyName || companyName,
      collectionName: parsedCollectionName || collectionName,
      existingQrUrl: currentUrl || "Uploaded File/Input",
      newQrUrl: shareId ? `${window.location.origin}/shared/${shareId}` : undefined,
      shareId: shareId || undefined,
      extractedData: data,
      adjustedData: adjustedData.length > 0 ? adjustedData : undefined,
      commission: commission,
      timestamp: new Date().toISOString()
    };
    
    const filtered = history.filter(h => h.id !== entryId && h.existingQrUrl !== currentUrl);
    const updatedHistory = [newEntry, ...filtered];
    setHistory(updatedHistory);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    return newEntry;
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = history.filter(h => h.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    if (activeEntryId === id) {
      setActiveEntryId(null);
    }
  };

  const checkRecordUpdate = async (entry: any) => {
    if (!entry.existingQrUrl || entry.existingQrUrl.startsWith("Uploaded File:")) {
      alert("This record was uploaded via file and cannot be dynamically re-scraped.");
      return;
    }
    setCheckingUpdateId(entry.id);
    setError(null);
    setUpdateNotification(null);
    try {
      const result = await fetchWithAuth('/qr/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: entry.existingQrUrl })
      });

      if (!result.extracted || result.extracted.rows.length === 0) {
        throw new Error(result.extracted?.message || "No structured data could be extracted from this URL.");
      }

      const newExtracted = result.extracted;
      
      const isChanged = JSON.stringify(newExtracted.rows) !== JSON.stringify(entry.extractedData.rows);

      if (isChanged) {
        const { adjustedHeaders, adjustedRows } = adjustRowsPreservingFormat(
          newExtracted.headers,
          newExtracted.rows,
          entry.commission
        );

        if (entry.shareId) {
          await fetchWithAuth('/publish', {
            method: 'POST',
            body: JSON.stringify({
              title: entry.title,
              data: {
                headers: adjustedHeaders,
                rows: adjustedRows
              },
              shareId: entry.shareId
            })
          });
        }

        const updatedHistory = history.map(h => {
          if (h.id === entry.id) {
            return {
              ...h,
              extractedData: {
                ...newExtracted,
                headers: adjustedHeaders
              },
              adjustedData: adjustedRows,
              timestamp: new Date().toISOString()
            };
          }
          return h;
        });

        setHistory(updatedHistory);
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        setUpdateNotification({
          id: entry.id,
          type: 'success',
          message: `Update detected! Original URL data changed, so the live QR Code data link (${entry.shareId}) was updated successfully.`
        });
      } else {
        setUpdateNotification({
          id: entry.id,
          type: 'info',
          message: "The original QR code data is completely up to date with the generated link."
        });
      }
    } catch (err: any) {
      console.error("Error checking updates:", err);
      setUpdateNotification({
        id: entry.id,
        type: 'error',
        message: "Failed to check update: " + err.message
      });
    } finally {
      setCheckingUpdateId(null);
    }
  };

  const startScanning = async () => {
    setStep('scanning');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await scanner.stop();
            setUrl(decodedText);
            handleUrlSubmit(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setError(err.message || "Failed to access camera");
        setStep('input');
      }
    }, 100);
  };

  const handleUrlSubmit = async (targetUrl: string = url, retryCount = 0) => {
    if (!targetUrl) return;
    setLoading(true);
    setStep('extracting');
    setError(null);
    try {
      // Scrape and Extract via Backend (Heuristic)
      const result = await fetchWithAuth('/qr/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: targetUrl })
      });

      if (!result.extracted || !result.extracted.rows || result.extracted.rows.length === 0) {
        throw new Error(result.extracted?.message || "No structured data could be extracted from this URL.");
      }

      const saved = saveToHistory(result.extracted, targetUrl);
      setExtractedData(saved.extractedData);
      setStep('adjusting');
      setLoading(false);
    } catch (err: any) {
      console.error("Extraction error:", err);
      const errMsg = err.message || "Failed to process URL";

      if ((errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("limiting requests")) && retryCount < 1) {
        // Keep loading true and retry after delay
        setTimeout(() => {
          handleUrlSubmit(targetUrl, retryCount + 1);
        }, 2500);
        return;
      }

      setError(errMsg);
      setStep('input');
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate maximum file size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB limit. Please upload a smaller file.");
      e.target.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(fileName);
    const isExcel = /\.(xlsx|xls|csv)$/.test(fileName) || file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv');

    if (!isImage && !isExcel) {
      setError("Unsupported file format. Please upload a valid Excel file (.xlsx, .xls, .csv) or image file.");
      e.target.value = '';
      return;
    }

    // Handle Images (QR Scan)
    if (isImage) {
      setError(null);
      setLoading(true);
      try {
        const html5QrCode = new Html5Qrcode("qr-reader-hidden");
        const decodedText = await html5QrCode.scanFile(file, true);
        setUrl(decodedText);
        await handleUrlSubmit(decodedText);
      } catch (err: any) {
        setError("No QR code detected in this image. Please ensure the QR is clear.");
        console.error("QR Scan Error:", err);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
      return;
    }

    // Handle Excel
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse as 2D array first to handle top headers / banners / empty rows gracefully
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (rawRows.length === 0) throw new Error("File is empty");

        // Limit row count to 10,000 to prevent browser memory exhaustion
        if (rawRows.length > 10000) {
          throw new Error("File contains over 10,000 rows. Please split into smaller batches.");
        }

        // Find the best header row candidate by scanning the first 10 rows
        let bestHeaderIndex = 0;
        let maxCellsCount = 0;
        let maxMatches = -1;
        let bestHeaders: string[] = [];

        const scanLimit = Math.min(rawRows.length, 10);
        for (let i = 0; i < scanLimit; i++) {
          const rowCells = rawRows[i];
          if (!rowCells || rowCells.length < 2) continue;

          let matches = 0;
          const candidateHeaders: string[] = [];
          
          rowCells.forEach((cellVal) => {
            const text = String(cellVal || "").trim();
            candidateHeaders.push(text);
            if (/sku|item|code|price|rate|total|rrp|hsn|mrp|design|quality|cost/i.test(text)) {
              matches++;
            }
          });

          if (rowCells.length > maxCellsCount || (rowCells.length === maxCellsCount && matches > maxMatches)) {
            maxCellsCount = rowCells.length;
            maxMatches = matches;
            bestHeaderIndex = i;
            bestHeaders = candidateHeaders;
          }
        }

        // If we didn't find any good header, default to the first row that has cells
        if (bestHeaders.length === 0) {
          for (let i = 0; i < rawRows.length; i++) {
            if (rawRows[i] && rawRows[i].length > 0) {
              bestHeaderIndex = i;
              bestHeaders = rawRows[i].map((c, idx) => String(c || "").trim() || `Col${idx}`);
              break;
            }
          }
        }

        const headers = bestHeaders.map((h, i) => h || `Col${i}`);
        const finalRows: any[] = [];

        for (let i = bestHeaderIndex + 1; i < rawRows.length; i++) {
          const rowCells = rawRows[i];
          if (!rowCells || rowCells.length === 0) continue;

          const rowData: any = {};
          let hasValue = false;
          
          headers.forEach((header, cellIndex) => {
            if (header === '__proto__' || header === 'constructor' || header === 'prototype') return;
            const cellVal = rowCells[cellIndex];
            const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : "";
            if (valStr) hasValue = true;
            rowData[header] = valStr;
          });

          if (hasValue) {
            finalRows.push(rowData);
          }
        }

        if (finalRows.length === 0) throw new Error("No data rows found in the sheet.");

        const result = {
          title: file.name.replace(/\.[^/.]+$/, ""),
          headers,
          rows: finalRows
        };
        const saved = saveToHistory(result, `Uploaded File: ${file.name}`);
        setExtractedData(saved.extractedData);
        setStep('adjusting');
      } catch (err: any) {
        setError("Failed to parse Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    if (extractedData && extractedData.rows && extractedData.rows.length > 0) {
      const { adjustedRows } = adjustRowsPreservingFormat(
        extractedData.headers,
        extractedData.rows,
        commission
      );
      setAdjustedData(adjustedRows);
    } else {
      setAdjustedData([]);
    }
  }, [extractedData, commission]);

  const handlePublish = async () => {
    if (!extractedData) return;
    setLoading(true);
    setError(null);
    try {
      const existingShareId = activeEntryId ? history.find(h => h.id === activeEntryId)?.shareId : undefined;
      const combinedTitle = collectionName ? `${companyName}_${collectionName}` : companyName;

      const headersToPublish = (adjustedData.length > 0 && Object.keys(adjustedData[0]).length > 0)
        ? Object.keys(adjustedData[0])
        : (extractedData.headers || []);

      const result = await fetchWithAuth('/publish', {
        method: 'POST',
        body: JSON.stringify({
          title: combinedTitle || extractedData.title,
          data: {
            headers: headersToPublish,
            rows: adjustedData
          },
          shareId: existingShareId
        })
      });

      const publishedShareId = result.shareId;
      setShareId(publishedShareId);

      const currentEntryId = activeEntryId || Date.now().toString();
      const updatedEntry = {
        id: currentEntryId,
        title: combinedTitle || extractedData.title,
        companyName,
        collectionName,
        existingQrUrl: url || "Uploaded File/Input",
        newQrUrl: `${window.location.origin}/shared/${publishedShareId}`,
        shareId: publishedShareId,
        extractedData: {
          ...extractedData,
          headers: headersToPublish
        },
        adjustedData,
        commission,
        timestamp: new Date().toISOString()
      };

      const filtered = history.filter(h => h.id !== currentEntryId);
      const newHistory = [updatedEntry, ...filtered];
      setHistory(newHistory);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));

      setStep('published');
    } catch (err: any) {
      setError("Publishing failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (adjustedData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(adjustedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Adjusted Prices");
    XLSX.writeFile(workbook, `${extractedData?.title || 'Data'}_Adjusted.xlsx`);
  };

  const comp = (companyName || '').trim();
  const coll = (collectionName || '').trim();
  
  const isSansaar = comp.toUpperCase().includes('SANSAAR');
  
  const brandTitle = isSansaar ? "SANSAAR" : comp;
  const brandSubtitle = isSansaar ? "A D'DECOR BRAND" : "";
  const brandTagline = isSansaar ? "LIVE CONSCIOUSLY" : "LIVE BEAUTIFUL";
  
  const collectionTitle = coll || comp;
  const collectionSubtitle = (collectionTitle.toUpperCase().includes('SERENE') || collectionTitle.toUpperCase().includes('KENDLER') || collectionTitle.toUpperCase().includes('KIELDER')) 
    ? "Timeless Weaves" 
    : "Exclusive Weaves";

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-800">Action QR Generator</h2>
        </div>
        <button 
          onClick={() => {
            setShowHistoryView(!showHistoryView);
            if (showHistoryView && !extractedData) {
              setStep('input');
            }
          }}
          className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <History size={13} />
          {showHistoryView ? "Generator" : "History"}
        </button>
      </div>

      <div id="qr-reader-hidden" className="hidden" />

      {showHistoryView ? (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          {/* Header & Search */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Action QR History</h3>
                <p className="text-[10px] text-slate-400 font-medium">Search and synchronize your published catalogs on-demand.</p>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear your entire QR generator history?")) {
                      setHistory([]);
                      localStorage.removeItem(historyKey);
                    }
                  }}
                  className="text-[9px] font-black text-red-500 hover:text-red-600 px-2.5 py-1 bg-red-50 rounded-lg tracking-wider uppercase active:scale-95 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Search inputs */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Search by Company or Collection Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 py-3 px-10 rounded-xl text-xs font-bold shadow-inner outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* History Cards List */}
          {history.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-12 rounded-[2rem] text-center space-y-3">
              <div className="p-3 bg-white w-max mx-auto rounded-xl shadow-sm text-slate-300">
                <History size={28} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">No History Records</h4>
              <p className="text-xs text-slate-400 px-6 leading-relaxed">
                Scan or upload a catalog QR to begin compiling history entries.
              </p>
            </div>
          ) : (() => {
            const filtered = history.filter(item => {
              const query = searchQuery.toLowerCase().trim();
              if (!query) return true;
              return (
                (item.companyName || '').toLowerCase().includes(query) ||
                (item.collectionName || '').toLowerCase().includes(query) ||
                (item.title || '').toLowerCase().includes(query)
              );
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-100">
                  No records match your search criteria.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filtered.map((item) => {
                  const hasOriginalUrl = item.existingQrUrl && !item.existingQrUrl.startsWith("Uploaded File:");
                  
                  return (
                    <div 
                      key={item.id}
                      className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm space-y-4 hover:border-amber-200 transition-colors"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[8.5px] uppercase tracking-widest rounded border border-amber-100">
                            {item.commission}% Margin
                          </span>
                          <h4 className="text-xs font-black text-slate-800 mt-1 uppercase tracking-wider">
                            {item.companyName || 'Unknown Dealer'}
                          </h4>
                          {item.collectionName && (
                            <p className="text-[11px] font-semibold text-slate-500">
                              {item.collectionName}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            if (window.confirm("Delete this history record?")) {
                              deleteFromHistory(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* URL Display */}
                      <div className="bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500 font-medium space-y-1.5 border border-slate-100/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Source Data</span>
                          {hasOriginalUrl && (
                            <a 
                              href={item.existingQrUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-amber-600 hover:underline flex items-center gap-0.5 font-bold"
                            >
                              Visit <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <p className="font-mono truncate max-w-[280px] text-slate-700">{item.existingQrUrl}</p>
                        
                        {item.newQrUrl && (
                          <div className="pt-2 border-t border-slate-200 space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Live Shared Link</span>
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-slate-700 truncate max-w-[200px]">{item.newQrUrl}</p>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(item.newQrUrl);
                                  alert("Copied to clipboard!");
                                }}
                                className="text-slate-400 hover:text-slate-600 font-bold active:scale-95 transition-all text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 rounded"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Side-by-side QRs Display */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Existing QR */}
                        <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100 text-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Original QR</span>
                          {hasOriginalUrl ? (
                            <div className="p-1 bg-white rounded border border-slate-100">
                              <QRCodeCanvas 
                                value={item.existingQrUrl}
                                size={75}
                                level="M"
                              />
                            </div>
                          ) : (
                            <div className="w-[83px] h-[83px] bg-slate-100 rounded flex items-center justify-center text-[9px] font-bold text-slate-400 px-1 leading-relaxed">
                              Uploaded File
                            </div>
                          )}
                        </div>

                        {/* Generated QR */}
                        <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100 text-center">
                          <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Generated QR</span>
                          {item.newQrUrl ? (
                            <div className="p-1 bg-white rounded border border-slate-100">
                              <QRCodeCanvas 
                                value={item.newQrUrl}
                                size={75}
                                level="M"
                              />
                            </div>
                          ) : (
                            <div className="w-[83px] h-[83px] bg-slate-100 rounded flex items-center justify-center text-[9px] font-bold text-slate-400 px-1 leading-relaxed">
                              Not Published
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notification alerts */}
                      {updateNotification && updateNotification.id === item.id && (
                        <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-[10px] font-semibold leading-normal animate-in fade-in slide-in-from-top-1 ${
                          updateNotification.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : updateNotification.type === 'error'
                            ? 'bg-red-50 border-red-100 text-red-800'
                            : 'bg-blue-50 border-blue-100 text-blue-800'
                        }`}>
                          <p>{updateNotification.message}</p>
                        </div>
                      )}

                      {/* Card Actions Bar */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onClick={() => {
                            setExtractedData(item.extractedData);
                            setCompanyName(item.companyName);
                            setCollectionName(item.collectionName);
                            setCommission(item.commission);
                            setAdjustedData(item.adjustedData || item.extractedData.rows);
                            setActiveEntryId(item.id);
                            setShareId(item.shareId || null);
                            setUrl(item.existingQrUrl && !item.existingQrUrl.startsWith("Uploaded File:") ? item.existingQrUrl : "");
                            setStep('adjusting');
                            setShowHistoryView(false);
                          }}
                          className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95"
                        >
                          Select & Edit
                        </button>
                        <button 
                          disabled={checkingUpdateId !== null || !hasOriginalUrl}
                          onClick={() => checkRecordUpdate(item)}
                          className="py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          {checkingUpdateId === item.id ? (
                            <>
                              <Loader2 size={10} className="animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={10} />
                              Check Update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {step === 'input' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-amber-200/50">
                 <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto ring-1 ring-white/30">
                    <QrCode size={40} className="text-white" />
                 </div>
                 <div className="text-center">
                    <h3 className="font-black text-2xl tracking-tight">Action QR Generator</h3>
                    <p className="text-amber-100 text-xs mt-2 font-medium opacity-90">Auto-extract & recalculate RRP margins</p>
                 </div>
                 
                 <div className="space-y-3">
                   <div className="relative">
                     <input 
                      type="text" 
                      placeholder="Paste Catalog URL..."
                      className="w-full bg-white text-slate-900 py-4 px-6 rounded-2xl text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-white/50"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                     />
                     <button 
                      onClick={() => handleUrlSubmit()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                     >
                       <ArrowLeft className="rotate-180" size={18} />
                     </button>
                   </div>

                   <div className="flex gap-3">
                     <button 
                      onClick={startScanning}
                      className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                     >
                       <Scan size={20} /> Scan QR
                     </button>
                     <label className="flex-1 bg-orange-700/30 text-white border-2 border-white/20 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all backdrop-blur-sm">
                       <Upload size={20} /> Upload
                       <input type="file" className="hidden" accept=".xlsx,.xls,image/*" onChange={handleFileUpload} />
                     </label>
                   </div>
                 </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col gap-3 text-red-600">
                   <div className="flex items-start gap-3">
                     <X size={18} className="shrink-0 mt-0.5" />
                     <p className="text-xs font-bold leading-relaxed">{error}</p>
                   </div>
                   {(error.includes("429") || error.includes("limiting requests") || error.includes("Too Many Requests")) && (
                     <div className="flex items-center gap-2 pt-2 border-t border-red-100">
                       <button
                         onClick={() => handleUrlSubmit(url)}
                         className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm active:scale-95"
                       >
                         Retry Request
                       </button>
                       <label className="px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-red-50 transition-colors shadow-sm active:scale-95">
                         Upload Excel File
                         <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                       </label>
                     </div>
                   )}
                </div>
              )}

              <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-[2rem] text-center space-y-2">
                 <div className="p-3 bg-white w-max mx-auto rounded-xl shadow-sm text-slate-400 mb-2">
                    <TableIcon size={24} />
                 </div>
                 <h4 className="font-bold text-slate-700">Supported Formats</h4>
                 <p className="text-[10px] text-slate-400 font-medium px-8 italic">Excel spreadsheets and Web catalogs identifying SKUs, RRP, and GST.</p>
              </div>

              {history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h4>
                     <button 
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem(historyKey);
                      }}
                      className="text-[9px] font-black text-amber-600 hover:text-amber-700 active:scale-95 transition-all"
                     >
                       CLEAR ALL
                     </button>
                  </div>
                  <div className="space-y-3">
                     {history.map((item) => (
                       <div 
                        key={item.id}
                        className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group"
                       >
                         <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => {
                            setExtractedData(item.extractedData);
                            setCompanyName(item.companyName);
                            setCollectionName(item.collectionName);
                            setCommission(item.commission);
                            setAdjustedData(item.adjustedData || item.extractedData.rows);
                            setActiveEntryId(item.id);
                            setShareId(item.shareId || null);
                            setUrl(item.existingQrUrl && !item.existingQrUrl.startsWith("Uploaded File:") ? item.existingQrUrl : "");
                            setStep('adjusting');
                          }}
                         >
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                             <History size={18} />
                           </div>
                           <div>
                             <h5 className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{item.title}</h5>
                             <p className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                                <Clock size={8} /> {new Date(item.timestamp).toLocaleDateString()} • {item.extractedData?.rows?.length || item.rows?.length || 0} items
                             </p>
                           </div>
                         </div>
                         <button 
                          onClick={() => deleteFromHistory(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </div>
          )}

      {step === 'scanning' && (
        <div className="space-y-6">
           <div id="qr-reader" className="w-full aspect-square rounded-[3rem] overflow-hidden border-4 border-amber-500 shadow-2xl bg-black" />
           <button 
            onClick={() => setStep('input')}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
           >
            Cancel Scanning
           </button>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-24 space-y-8 bg-white rounded-[3rem] shadow-inner">
           <div className="relative">
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center animate-pulse">
                 <Loader2 size={40} className="text-amber-500 animate-spin" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <RefreshCw size={20} className="text-amber-600 opacity-50" />
              </div>
           </div>
           <div className="text-center space-y-3 px-10">
              <h3 className="font-black text-xl text-slate-900 italic">Processing Data...</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Extracting structured attributes via AI Analysis, mapping pricing columns, and preparing adjustment buffers.
              </p>
           </div>
        </div>
       )}

       {step === 'adjusting' && extractedData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
           <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-100 rounded-3xl md:flex-row md:items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        const newCompany = e.target.value;
                        setCompanyName(newCompany);
                        updateTitle(newCompany, collectionName);
                      }}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-4 py-2.5 text-sm font-black text-slate-900 transition-all outline-none"
                      placeholder="Enter Company Name..."
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Collection Name</label>
                    <input
                      type="text"
                      value={collectionName}
                      onChange={(e) => {
                        const newCollection = e.target.value;
                        setCollectionName(newCollection);
                        updateTitle(companyName, newCollection);
                      }}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-4 py-2.5 text-sm font-black text-slate-900 transition-all outline-none"
                      placeholder="Enter Collection Name..."
                    />
                 </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-slate-200/60 md:border-t-0">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dealer Commission</span>
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-2xl border border-amber-100 mt-1">
                     <input 
                      type="number" 
                      value={commission}
                      onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
                      className="w-10 bg-transparent text-xs font-black text-amber-950 border-none outline-none focus:ring-0 p-0 text-center"
                     />
                     <span className="text-[10px] font-black text-amber-700">%</span>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1e2329]">
                      {(adjustedData.length > 0 ? Object.keys(adjustedData[0]) : extractedData.headers).map((h, i) => (
                        <th 
                          key={i} 
                          className="px-4 py-4.5 text-[10px] font-bold uppercase tracking-wider text-white border-0"
                        >
                          {getDisplayHeader(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adjustedData.slice(0, 8).map((row, i) => {
                      return (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors">
                          {(adjustedData.length > 0 ? Object.keys(adjustedData[0]) : extractedData.headers).map((h, j) => (
                            <td 
                              key={j} 
                              className="px-4 py-4 text-xs font-semibold text-slate-800"
                            >
                              {getDisplayValue(h, row[h])}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {adjustedData.length > 8 && (
                <div className="p-3 bg-slate-50 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Showing 8 of {adjustedData.length} records</p>
                </div>
              )}
           </div>

           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handlePublish}
                disabled={loading}
                className="bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} 
                Publish Link
              </button>
              <button 
                onClick={downloadExcel}
                className="bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200/50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} /> Export XLSX
              </button>
           </div>
        </div>
      )}

      {step === 'published' && shareId && (
        <div className="space-y-6 py-8 animate-in zoom-in-95 duration-500">
           <div className="bg-emerald-500 p-8 rounded-[3rem] text-white text-center space-y-6 shadow-2xl shadow-emerald-100">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto ring-4 ring-white/30">
                 <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <div className="space-y-2">
                 <h3 className="font-black text-2xl">Successfully Published!</h3>
                 <p className="text-emerald-50 text-xs font-medium">Your adjusted price table is now live and shareable.</p>
              </div>

              <div className="bg-emerald-600 rounded-3xl p-4 flex items-center justify-between border border-emerald-400/30">
                 <p className="text-[10px] font-mono truncate max-w-[150px] opacity-70">/shared/{shareId}</p>
                 <button 
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/shared/${shareId}`;
                    navigator.clipboard.writeText(fullUrl);
                    alert("Link copied to clipboard!");
                  }}
                  className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all flex items-center gap-2"
                 >
                    <Copy size={12} /> COPY
                 </button>
              </div>
           </div>

           {/* QR Code Section */}
           <div className="bg-[#faf8f5] p-10 rounded-[3rem] border border-[#eadecf] text-center space-y-8 shadow-sm max-w-sm mx-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
              `}</style>
              
              {/* Brand Section */}
              <div className="space-y-1">
                <h1 className="text-2xl font-medium tracking-[0.18em] text-[#5c4040] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>
                  {brandTitle}
                </h1>
                {brandSubtitle && (
                  <div className="text-[9px] font-bold tracking-[0.22em] text-[#8c7373] uppercase mt-2">
                    {brandSubtitle}
                  </div>
                )}
              </div>

              {/* Collection Section */}
              <div>
                <h2 className="text-xl font-semibold tracking-[0.15em] text-[#6e4f4f] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>
                  {collectionTitle}
                </h2>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center">
                <div className="p-2 bg-transparent">
                  <QRCodeCanvas 
                    id="published-qr-code"
                    value={`${window.location.origin}/shared/${shareId}`} 
                    size={180}
                    level="H"
                    includeMargin={true}
                    fgColor="#6e4f4f"
                    bgColor="#faf8f5"
                  />
                </div>
                <p className="text-[8.5px] font-semibold tracking-[0.05em] text-[#8c7373] mt-2 uppercase">
                  For updated price list scan the QR Code
                </p>
              </div>

              <div className="pt-6 border-t border-[#eadecf]/60 space-y-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Share this QR Code</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const canvas = document.getElementById('published-qr-code') as HTMLCanvasElement;
                      if (!canvas) return;
                      
                      const comp = (companyName || '').trim();
                      const coll = (collectionName || '').trim();
                      
                      const isSansaar = comp.toUpperCase().includes('SANSAAR');
                      
                      const brandTitle = isSansaar ? "SANSAAR" : comp;
                      const brandSubtitle = isSansaar ? "A D'DECOR BRAND" : "";
                      const brandTagline = isSansaar ? "LIVE CONSCIOUSLY" : "LIVE BEAUTIFUL";
                      
                      const collectionTitle = coll || comp;
                      const collectionSubtitle = (collectionTitle.toUpperCase().includes('SERENE') || collectionTitle.toUpperCase().includes('KENDLER') || collectionTitle.toUpperCase().includes('KIELDER')) 
                        ? "Timeless Weaves" 
                        : "Exclusive Weaves";

                      const win = window.open('', '_blank');
                      if (win) {
                        win.document.write(`
                          <html>
                            <head>
                              <title>Print QR Code</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
                                
                                body {
                                  margin: 0;
                                  padding: 0;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                  min-height: 100vh;
                                  background-color: #ffffff;
                                  font-family: 'Montserrat', sans-serif;
                                  -webkit-print-color-adjust: exact;
                                  print-color-adjust: exact;
                                }

                                .card {
                                  width: 420px;
                                  padding: 55px 40px;
                                  background-color: #faf8f5 !important;
                                  border-radius: 8px;
                                  text-align: center;
                                  box-sizing: border-box;
                                  border: 1px solid #eadecf;
                                  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                                }

                                .brand-section {
                                  margin-bottom: 35px;
                                }

                                .brand-title {
                                  font-family: 'Cinzel', serif;
                                  font-size: 28px;
                                  font-weight: 500;
                                  letter-spacing: 0.18em;
                                  color: #5c4040;
                                  margin: 0;
                                  text-transform: uppercase;
                                }

                                .brand-subtitle {
                                  font-size: 9px;
                                  font-weight: 700;
                                  letter-spacing: 0.22em;
                                  color: #8c7373;
                                  margin: 8px 0 4px 0;
                                  text-transform: uppercase;
                                }

                                .brand-tagline {
                                  font-size: 8.5px;
                                  font-weight: 600;
                                  letter-spacing: 0.28em;
                                  color: #a69292;
                                  margin: 4px 0 0 0;
                                  text-transform: uppercase;
                                }

                                .collection-section {
                                  margin-bottom: 35px;
                                }

                                .collection-title {
                                  font-family: 'Cinzel', serif;
                                  font-size: 22px;
                                  font-weight: 600;
                                  letter-spacing: 0.15em;
                                  color: #6e4f4f;
                                  margin: 0;
                                  text-transform: uppercase;
                                }

                                .collection-subtitle {
                                  font-family: 'Playfair Display', serif;
                                  font-size: 13.5px;
                                  font-style: italic;
                                  color: #8c7373;
                                  margin: 6px 0 0 0;
                                }

                                .qr-outer-container {
                                  margin: 0 auto;
                                  display: inline-block;
                                }

                                .qr-container {
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  padding: 18px 18px 12px 18px;
                                  background-color: transparent;
                                  border: none;
                                  border-radius: 2px;
                                }

                                .qr-image {
                                  width: 220px;
                                  height: 220px;
                                  display: block;
                                  margin-bottom: 12px;
                                }

                                .qr-footer {
                                  font-size: 8.5px;
                                  font-weight: 600;
                                  letter-spacing: 0.05em;
                                  color: #8c7373;
                                  margin: 0;
                                  font-family: 'Montserrat', sans-serif;
                                }

                                @media print {
                                  body {
                                    background: none;
                                    display: block;
                                  }
                                  .card {
                                    box-shadow: none;
                                    border: none;
                                    background-color: #faf8f5 !important;
                                    width: 100%;
                                    max-width: 420px;
                                    margin: 40px auto;
                                  }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="card">
                                <div class="brand-section">
                                  <h1 class="brand-title">${brandTitle}</h1>
                                  ${brandSubtitle ? `<div class="brand-subtitle">${brandSubtitle}</div>` : ''}
                                </div>

                                <div class="collection-section">
                                  <h2 class="collection-title">${collectionTitle}</h2>
                                </div>

                                <div class="qr-outer-container">
                                  <div class="qr-container">
                                    <img class="qr-image" src="${canvas.toDataURL()}" />
                                    <p class="qr-footer">For updated price list scan the QR Code</p>
                                  </div>
                                </div>
                              </div>
                              <script>
                                window.onload = () => {
                                  setTimeout(() => {
                                    window.print();
                                    window.close();
                                  }, 300);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        win.document.close();
                      }
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button 
                    onClick={async () => {
                      const canvas = document.getElementById('published-qr-code') as HTMLCanvasElement;
                      if (!canvas) return;
                      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
                      if (blob && navigator.share) {
                        try {
                          const file = new File([blob], "qr_code.png", { type: "image/png" });
                          await navigator.share({
                            files: [file],
                            title: 'Share QR Code',
                            text: `Scan this QR to view: ${extractedData?.title}`
                          });
                        } catch (err) {
                          console.error("Share failed", err);
                          // Fallback to download
                          const link = document.createElement('a');
                          link.download = 'qr_code.png';
                          link.href = canvas.toDataURL();
                          link.click();
                        }
                      } else {
                        // Fallback download
                        const link = document.createElement('a');
                        link.download = 'qr_code.png';
                        link.href = canvas.toDataURL();
                        link.click();
                      }
                    }}
                    className="flex-1 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>
           </div>

           <div className="space-y-3">
              <button 
                onClick={() => window.open(`/shared/${shareId}`, '_blank')}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-50 transition-all shadow-sm"
              >
                 <ExternalLink size={18} /> View Live Table
              </button>
              <button 
                onClick={() => setStep('input')}
                className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] active:text-amber-600 transition-colors"
              >
                 Create New Adjustment
              </button>
           </div>
        </div>
      )}
        </>
      )}
    </motion.div>
  );
}

function ServiceRequestView({ onBack }: { onBack: () => void }) {
  const { fetchWithAuth, updateUser } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      const [servicesData, profileData] = await Promise.all([
        fetchWithAuth('/user/services'),
        fetchWithAuth('/user/profile')
      ]);
      setServices(servicesData);
      if (profileData && profileData.user) {
        updateUser(profileData.user);
      }
    } catch (err: any) {
      if (err.message !== "Session expired" && !err.message?.includes("Session expired")) {
        console.error("Failed to load services:", err);
      } else {
        console.warn("Services load skipped: Session expired");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleRequest = async (serviceName: string) => {
    setRequesting(serviceName);
    try {
      await fetchWithAuth('/user/services/request', {
        method: 'POST',
        body: JSON.stringify({ serviceName })
      });
      alert(`Request sent for ${serviceName}. Admin will review and enable it.`);
      await loadServices();
      // Also refresh profile just in case
      const profileData = await fetchWithAuth('/user/profile');
      updateUser(profileData.user);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequesting(null);
    }
  };

  const handleDisable = async (serviceName: string) => {
    setRequesting(serviceName);
    try {
      await fetchWithAuth('/user/services/disable', {
        method: 'POST',
        body: JSON.stringify({ serviceName })
      });
      // Refresh local view
      await loadServices();
      // Refresh global user state to update the rest of the app
      const profileData = await fetchWithAuth('/user/profile');
      updateUser(profileData.user);
      alert(`${serviceName} has been disabled.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequesting(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center p-2 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">Manage your services</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Available Features</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  s.status === 1 ? "bg-emerald-50 text-emerald-600" : 
                  s.status === 2 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
                )}>
                  {s.name === 'QR Generator' && <QrCode size={24} />}
                  {s.name === 'Client Management' && <Users size={24} />}
                  {s.name === 'Invoice Management' && <FileText size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      s.status === 1 ? "bg-emerald-500" : 
                      s.status === 2 ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      s.status === 1 ? "text-emerald-600" : 
                      s.status === 2 ? "text-amber-600" : "text-slate-400"
                    )}>
                      {s.status === 1 ? 'Enabled' : s.status === 2 ? 'Pending Review' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {s.status === 0 && (
                <button 
                  onClick={() => handleRequest(s.name)}
                  disabled={requesting === s.name}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {requesting === s.name ? '...' : 'Request'}
                </button>
              )}

              {s.status === 1 && (
                <button 
                  onClick={() => handleDisable(s.name)}
                  disabled={requesting === s.name}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={14} />
                  {requesting === s.name ? '...' : 'Disable'}
                </button>
              )}

              {s.status === 2 && (
                <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-8 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-2">How it works?</h4>
            <p className="text-xs text-indigo-700/70 leading-relaxed font-medium">
              New accounts start with premium services disabled. Click <strong>Request</strong> to notify our administrators. Features are usually enabled within 24 hours after review.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}







