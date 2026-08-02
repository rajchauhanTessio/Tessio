import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  ShieldCheck,
  Settings as SettingsIcon,
  Search,
  RefreshCw,
  History,
  X,
  Edit2,
  Trash2,
  Download,
  Upload,
  Share2,
  LayoutGrid,
  Check,
  X as XIcon,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Menu,
  Database,
  Terminal,
  FileText,
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import tessioFlyer from '../assets/images/tessio_updated_flyer_1784292746593.jpg';
import FlyerView from './FlyerView';

export default function AdminDashboard({ onShowFlyer }: { onShowFlyer?: () => void }) {
  const { fetchWithAuth, logout, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [globalServices, setGlobalServices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'settings' | 'services' | 'publish' | 'database' | 'flyer'>('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Database tab states
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Flyer tab states
  const [copiedFlyerText, setCopiedFlyerText] = useState(false);
  const [qrColor, setQrColor] = useState('#10b981'); // Emerald default to match theme
  const [flyerTitle, setFlyerTitle] = useState('Tessio Textile Portal');

  const [editForm, setEditForm] = useState({ 
    username: '', 
    mobile: '', 
    email: '', 
    shop_name: '',
    dealer_commission: 0,
    user_type: 'Owner'
  });

  // Admin Profile states
  const [adminProfile, setAdminProfile] = useState({ 
    username: user?.username || '', 
    email: user?.email || '', 
    pin: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData, servicesData, pendingData, globalData] = await Promise.all([
        fetchWithAuth('/admin/users'),
        fetchWithAuth('/admin/logs'),
        fetchWithAuth('/admin/user-services'),
        fetchWithAuth('/admin/services/pending'),
        fetchWithAuth('/admin/global-services')
      ]);
      setUsers(usersData);
      setLogs(logsData);
      setUserServices(servicesData);
      setPendingRequests(pendingData);
      setGlobalServices(globalData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveService = async (userId: number, serviceName: string) => {
    try {
      await fetchWithAuth('/admin/user-services/toggle', {
        method: 'POST',
        body: JSON.stringify({ userId, serviceName, isEnabled: true })
      });
      loadData();
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
    }
  };

  const handleRejectService = async (userId: number, serviceName: string) => {
    try {
      await fetchWithAuth('/admin/user-services/toggle', {
        method: 'POST',
        body: JSON.stringify({ userId, serviceName, isEnabled: false })
      });
      loadData();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    }
  };

  const handleToggleGlobalService = async (name: string, isPublished: boolean) => {
    try {
      await fetchWithAuth('/admin/global-services/toggle', {
        method: 'POST',
        body: JSON.stringify({ name, isPublished: !isPublished })
      });
      loadData();
    } catch (err: any) {
      alert("Failed to toggle service: " + err.message);
    }
  };

  const fetchDbTables = async () => {
    try {
      const data = await fetchWithAuth('/admin/db/tables');
      setDbTables(data.tables || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExecuteQuery = async (queryStr?: string) => {
    const activeQuery = queryStr || sqlQuery;
    if (!activeQuery.trim()) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const response = await fetchWithAuth('/admin/db/query', {
        method: 'POST',
        body: JSON.stringify({ query: activeQuery })
      });
      setQueryResult(response);
    } catch (err: any) {
      setQueryError(err.message || 'An error occurred during query execution.');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    const query = `SELECT * FROM ${tableName} LIMIT 50;`;
    setSqlQuery(query);
    handleExecuteQuery(query);
  };

  const handleDownloadBackup = () => {
    // Standard fetch with auth can't easily download files directly as attachment, 
    // so we can obtain a temporary token or use standard download since we are logged in.
    // However, since we have the token, we can do it via a direct window open / blob.
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // We can fetch the blob with Auth header, and create Object URL to trigger download safely!
    // This perfectly bypasses authorization without exposing token in URL parameters.
    fetch('/api/admin/db/backup', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error("Backup failed");
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system_backup.db';
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      alert("Failed to download backup: " + err.message);
    });
  };

  const handlePrintFlyer = () => {
    const printWindow = window.open('', '', 'width=800,height=1000');
    if (!printWindow) return;
    
    const qrCanvas = document.getElementById('flyer-qr-code') as HTMLCanvasElement;
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL() : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Tessio Portal Flyer</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-white p-12 text-slate-800">
          <div class="max-w-xl mx-auto border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 relative shadow-2xl">
            <div class="text-center mb-6">
              <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight">TESSIO</h1>
              <p class="text-emerald-600 font-extrabold tracking-widest text-xs uppercase mt-1">Textile Dealer & Seller Portal</p>
            </div>
            
            <div class="flex justify-center mb-6">
              <img src="${tessioFlyer}" class="max-h-80 rounded-2xl shadow-lg border border-slate-200" style="max-width: 100%; object-fit: contain;" />
            </div>

            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
              <h2 class="text-xl font-bold text-slate-900 mb-4 text-center">Simplify Your Textile Operations</h2>
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="space-y-2">
                  <p class="font-semibold text-slate-700">✓ Dealer Commissions</p>
                  <p class="text-slate-500">Track and calculate seller commission rates dynamically in real-time.</p>
                </div>
                <div class="space-y-2">
                  <p class="font-semibold text-slate-700">✓ Real-time Ledgers</p>
                  <p class="text-slate-500">Comprehensive transparency for dealer operations and earnings tracking.</p>
                </div>
                <div class="space-y-2">
                  <p class="font-semibold text-slate-700">✓ Secure 6-Digit PINs</p>
                  <p class="text-slate-500">Fast, hassle-free authentication for absolute security and trust.</p>
                </div>
                <div class="space-y-2">
                  <p class="font-semibold text-slate-700">✓ Service Management</p>
                  <p class="text-slate-500">Instant access to global service publications, updates, and support.</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center pt-4 border-t border-slate-200">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Scan Code to Connect Instantly</p>
              \${qrDataUrl ? \`<img src="\${qrDataUrl}" class="w-36 h-36 border border-slate-100 p-2 bg-white rounded-xl" />\` : ''}
              <p class="text-xs text-emerald-600 font-semibold mt-3 break-all text-center">\${window.location.origin}</p>
            </div>

            <p class="text-center text-[10px] text-slate-400 mt-8">Tessio Textile Solutions © 2026. Empowering Dealers Everywhere.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('flyer-qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tessio_portal_qr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDbTables();
    }
  }, [activeTab]);

  const handleStatusUpdate = async (userId: number, status: string) => {
    try {
      await fetchWithAuth(`/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const fetchUserLogs = async (user: any) => {
    setSelectedUser(user);
    setLogsLoading(true);
    try {
      const data = await fetchWithAuth(`/admin/users/${user.id}/logs`);
      setSelectedUserLogs(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch user logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({ 
      username: user.username, 
      mobile: user.mobile, 
      email: user.email || '', 
      shop_name: user.shop_name || '',
      dealer_commission: user.dealer_commission || 0,
      user_type: user.user_type || 'Owner'
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await fetchWithAuth(`/admin/users/${id}`, {
        method: 'DELETE'
      });
      setShowDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportUserRecords = async (u: any) => {
    try {
      const records = await fetchWithAuth(`/admin/users/${u.id}/records`);
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `records_${u.username}.json`;
      link.click();
    } catch (err: any) {
      alert("Failed to export records");
    }
  };

  const handleImportUserRecords = async (u: any, e: React.ChangeEvent<HTMLInputElement>, strategy?: 'overwrite' | 'skip', cachedRecords?: any[]) => {
    let importedRecords = cachedRecords;
    if (!importedRecords) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            handleImportUserRecords(u, undefined as any, undefined, data);
          }
        } catch (err) {
          alert("Invalid file format");
        }
      };
      reader.readAsText(file);
      return;
    }

    try {
      const response = await fetchWithAuth(`/admin/users/${u.id}/records/import`, {
        method: 'POST',
        body: JSON.stringify({ records: importedRecords, strategy })
      });

      if (response.requiresDecision) {
        if (window.confirm(`Found ${response.duplicateCount} duplicate records for ${u.username}. Would you like to OVERWRITE them?\n\nClick OK to Overwrite, Cancel to Skip duplicates.`)) {
          handleImportUserRecords(u, undefined as any, 'overwrite', importedRecords);
        } else {
          handleImportUserRecords(u, undefined as any, 'skip', importedRecords);
        }
        return;
      }

      let msg = `Import complete for ${u.username}.`;
      if (response.imported > 0) msg += `\n- ${response.imported} New`;
      if (response.updated > 0) msg += `\n- ${response.updated} Updated`;
      if (response.skipped > 0) msg += `\n- ${response.skipped} Skipped`;
      
      alert(msg);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleShareUserRecords = async (u: any) => {
    try {
      const records = await fetchWithAuth(`/admin/users/${u.id}/records`);
      if (records.length === 0) {
        alert("No records to share");
        return;
      }
      const header = `Records Summary for ${u.username} (${records.length} total):\n\n`;
      const body = records.map((r: any, i: number) => {
        const commission = u.dealer_commission || 0;
        const cp = r.cost_price || 0;
        const sp = cp + (cp * commission / 100);
        return `${i + 1}. ${r.dealer_code} / ${r.company_code}\n   CP: $${cp.toFixed(2)} | SP: $${sp.toFixed(2)} (${commission}%)`;
      }).join('\n\n');
      window.open(`https://wa.me/?text=${encodeURIComponent(header + body)}`, '_blank');
    } catch (err) {
      alert("Failed to share records");
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(adminProfile)
      });
      alert("Profile updated successfully. Please re-login if you changed your username.");
      if (adminProfile.username !== user.username) {
        logout();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleService = async (userId: number, serviceName: string, currentlyEnabled: boolean) => {
    try {
      await fetchWithAuth('/admin/user-services/toggle', {
        method: 'POST',
        body: JSON.stringify({ userId, serviceName, isEnabled: !currentlyEnabled })
      });
      loadData();
    } catch (err: any) {
      alert("Failed to toggle service: " + err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.mobile && u.mobile.includes(searchTerm)) ||
    (u.shop_name && u.shop_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-[70] transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" size={28} />
            <span className="font-bold text-xl tracking-tight text-white">Admin Console</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Users size={20} />
            <span className="font-medium">User Management</span>
          </button>
          <button 
            onClick={() => { setActiveTab('logs'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Activity size={20} />
            <span className="font-medium">System Logs</span>
          </button>
          <button 
            onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'services' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <LayoutGrid size={20} />
            <span className="font-medium">User Services</span>
          </button>
          <button 
            onClick={() => { setActiveTab('publish'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'publish' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Globe size={20} />
            <span className="font-medium">Publish Services</span>
          </button>
          <button 
            onClick={() => { setActiveTab('database'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'database' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Database size={20} />
            <span className="font-medium">Database Access</span>
          </button>
          <button 
            onClick={() => { setActiveTab('flyer'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'flyer' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Promotional Flyer</span>
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <SettingsIcon size={20} />
            <span className="font-medium">Admin Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h1 className="text-sm md:text-lg font-semibold text-slate-800 truncate">
              {activeTab === 'users' ? 'User Management' : activeTab === 'logs' ? 'System Activity Logs' : activeTab === 'services' ? 'User Services Management' : activeTab === 'publish' ? 'Publish Global Services' : activeTab === 'database' ? 'Database Manager' : activeTab === 'flyer' ? 'Promotional Marketing Flyer' : 'Admin Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-emerald-500 transition-colors relative"
                title="Notifications"
              >
                <Bell size={20} />
                {pendingRequests.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[8px] text-white font-bold">
                      {pendingRequests.length}
                    </span>
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingRequests.length} Pending</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {pendingRequests.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50/50">
                            <Clock className="mx-auto text-slate-200 mb-2" size={32} />
                            <p className="text-sm text-slate-400 font-medium">No pending requests</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {pendingRequests.map((req, i) => (
                              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{req.shopName || 'Individual'}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Requested: <span className="text-indigo-600 font-bold">{req.serviceName}</span></p>
                                    <div className="flex items-center gap-2 mt-3">
                                      <button 
                                        onClick={() => handleApproveService(req.userId, req.serviceName)}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleRejectService(req.userId, req.serviceName)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'users' ? (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <Search className="text-slate-400 flex-shrink-0" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search users..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm min-w-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-bottom border-slate-200">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User Info</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shop Details</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered At</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                {u.username}
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                  (u.user_type === 'User' || u.user_type === 'user')
                                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                  {u.user_type || 'Owner'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 line-clamp-1">{u.mobile} • {u.email}</div>
                              <div className="mt-1">
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                                  {u.dealer_commission || 0}% Commission
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]">{u.shop_name || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                                u.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                u.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {u.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                              {format(new Date(u.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                              <button 
                                onClick={() => fetchUserLogs(u)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="View User Logs"
                              >
                                <History size={16} />
                              </button>
                              <button 
                                onClick={() => handleEditUser(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(u.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleExportUserRecords(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Export User Records"
                              >
                                <Download size={16} />
                              </button>
                              <label className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer inline-block" title="Import User Records">
                                <Upload size={16} />
                                <input type="file" className="hidden" accept=".json" onChange={(e) => handleImportUserRecords(u, e)} />
                              </label>
                              <button 
                                onClick={() => handleShareUserRecords(u)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Share User Records via WhatsApp"
                              >
                                <Share2 size={16} />
                              </button>
                              {u.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleStatusUpdate(u.id, 'approved')}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleStatusUpdate(u.id, 'rejected')}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                              {u.status !== 'pending' && (
                                <button 
                                  onClick={() => handleStatusUpdate(u.id, 'pending')}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                                >
                                  Reset
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900">{u.username}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                u.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                u.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {u.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{u.mobile || 'No Mobile'} • {u.email || 'No Email'}</p>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            {format(new Date(u.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Shop Name</span>
                            <span className="font-bold text-slate-700 truncate block">{u.shop_name || 'N/A'}</span>
                          </div>
                          <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5">Commission</span>
                            <span className="font-black text-emerald-600">{u.dealer_commission || 0}%</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <button onClick={() => fetchUserLogs(u)} className="flex-1 bg-slate-50 p-2 rounded-xl text-slate-600 flex items-center justify-center gap-2 active:bg-slate-100 transition-colors">
                            <History size={14} /> <span className="text-[10px] font-bold">Logs</span>
                          </button>
                          <button onClick={() => handleEditUser(u)} className="flex-1 bg-slate-50 p-2 rounded-xl text-blue-600 flex items-center justify-center gap-2 active:bg-slate-100 transition-colors">
                            <Edit2 size={14} /> <span className="text-[10px] font-bold">Edit</span>
                          </button>
                          <button onClick={() => setShowDeleteConfirm(u.id)} className="flex-1 bg-red-50 p-2 rounded-xl text-red-600 flex items-center justify-center gap-2 active:bg-red-100 transition-colors">
                            <Trash2 size={14} /> <span className="text-[10px] font-bold">Delete</span>
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => handleExportUserRecords(u)} className="flex-1 bg-slate-50 p-2 rounded-xl text-slate-600 flex items-center justify-center gap-2">
                            <Download size={14} /> <span className="text-[10px] font-bold">Export</span>
                          </button>
                          <button onClick={() => handleShareUserRecords(u)} className="flex-1 bg-emerald-500 p-2 rounded-xl text-white flex items-center justify-center gap-2">
                            <Share2 size={14} /> <span className="text-[10px] font-bold">WhatsApp</span>
                          </button>
                        </div>
                        
                        {u.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatusUpdate(u.id, 'approved')} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Approve User</button>
                            <button onClick={() => handleStatusUpdate(u.id, 'rejected')} className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'services' ? (
              <motion.div 
                key="services"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Manage User Access to Features</h2>
                      <p className="text-xs text-slate-500">Toggle specific services on or off for each user account.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">User Information</th>
                          {globalServices.map((gs, idx) => (
                            <th key={idx} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">{gs.name}</th>
                          ))}
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {userServices.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{u.username}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[150px]">{u.shop_name || 'No Shop Name'}</div>
                            </td>
                            {globalServices.map((gs, idx) => (
                              <td key={idx} className="px-6 py-4 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={u.services?.[gs.name] === 1}
                                      onChange={() => toggleService(u.id, gs.name, u.services?.[gs.name] === 1)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                  </label>
                                  {u.services?.[gs.name] === 2 && (
                                    <span className="flex h-1.5 w-1.5 relative">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            ))}
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {Object.entries(u.services || {}).map(([sName, status]: [string, any], idx) => (
                                  <span key={idx} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    status === 1 
                                      ? "bg-emerald-50 text-emerald-600" 
                                      : status === 2
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-red-50 text-red-600"
                                  }`}>
                                    {status === 1 ? <Check size={8} /> : status === 2 ? <RefreshCw size={8} className="animate-spin" /> : <XIcon size={8} />}
                                    {sName}: {status === 1 ? "ON" : status === 2 ? "REQ" : "OFF"}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'publish' ? (
              <motion.div 
                key="publish"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {globalServices.map((service, i) => {
                    const isPublished = service.isPublished === 1;
                    return (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isPublished ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Globe size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{service.name}</h3>
                            <p className="text-xs text-slate-500">
                              Status: <span className={isPublished ? 'text-emerald-500 font-bold uppercase' : 'text-slate-400 font-bold uppercase'}>
                                {isPublished ? 'Published' : 'Hidden'}
                              </span>
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleToggleGlobalService(service.name, isPublished)}
                          className={`p-2 rounded-lg transition-all ${isPublished ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                          title={isPublished ? 'Unpublish Service' : 'Publish Service'}
                        >
                          {isPublished ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="text-indigo-600 mt-1" size={24} />
                    <div>
                      <h3 className="font-bold text-indigo-900">Global Visibility Control</h3>
                      <p className="text-sm text-indigo-700 mt-1 leading-relaxed">
                        Services published here will appear in the <strong>"Manage your services"</strong> option within the Settings tab for all users. 
                        If you unpublish a service, it will only remain visible to users who already have it active or pending. 
                        New users will not be able to see or request unpublished services.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'database' ? (
              <motion.div 
                key="database"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)]"
              >
                {/* Left side: Tables panel */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Database size={18} className="text-emerald-500" />
                      <span>DB Tables</span>
                    </div>
                    <button 
                      onClick={fetchDbTables} 
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-500 transition-colors"
                      title="Refresh tables schema"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {dbTables.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-medium">No tables found</div>
                    ) : (
                      dbTables.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => handleSelectTable(t.name)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                            selectedTable === t.name 
                              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 shadow-sm' 
                              : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-sm tracking-tight truncate">{t.name}</span>
                            <span className="text-[10px] font-bold bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-full">
                              {t.rowCount} rows
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.columns.map((col: any) => (
                              <span 
                                key={col.name} 
                                className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                                  col.pk ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-slate-100 text-slate-400'
                                }`}
                                title={`${col.name} (${col.type})`}
                              >
                                {col.name}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 shrink-0">
                    <button
                      onClick={handleDownloadBackup}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download Backup (.db)</span>
                    </button>
                  </div>
                </div>

                {/* Right side: SQL Terminal / Query Runner */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Terminal size={18} className="text-indigo-500" />
                      <span>SQL Query Terminal</span>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Cloud SQL Sandbox
                    </span>
                  </div>

                  {/* Code Editor TextArea */}
                  <div className="space-y-3 shrink-0">
                    <div className="relative">
                      <textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT * FROM users LIMIT 10;"
                        className="w-full h-32 bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                      />
                      <button
                        onClick={() => setSqlQuery('')}
                        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 rounded"
                        title="Clear"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-medium">
                        💡 Click a table on the left to auto-load rows, or type a custom SQL query above.
                      </span>
                      <button
                        onClick={() => handleExecuteQuery()}
                        disabled={queryLoading || !sqlQuery.trim()}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-wider shrink-0"
                      >
                        {queryLoading ? <RefreshCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                        <span>Run SQL Query</span>
                      </button>
                    </div>
                  </div>

                  {/* Results Display Pane */}
                  <div className="flex-1 mt-4 overflow-hidden flex flex-col border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Query Execution Results</span>
                      {queryResult && queryResult.isSelect && (
                        <span className="text-[10px] font-bold text-slate-500">
                          Returned {queryResult.rows?.length || 0} rows
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                      {queryLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                          <RefreshCw className="animate-spin text-indigo-500 mb-2" size={24} />
                          <span className="text-xs font-semibold">Running database query...</span>
                        </div>
                      ) : queryError ? (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs font-mono text-red-600 max-w-full overflow-x-auto whitespace-pre-wrap">
                          ❌ SQL Error: {queryError}
                        </div>
                      ) : queryResult ? (
                        queryResult.isSelect ? (
                          queryResult.rows && queryResult.rows.length > 0 ? (
                            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white">
                              <table className="w-full text-left text-xs border-collapse font-mono">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                  <tr>
                                    {queryResult.headers.map((h: string) => (
                                      <th key={h} className="px-4 py-2 text-[10px] font-bold text-slate-600 border-r border-slate-200 last:border-0 bg-slate-50 select-all">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {queryResult.rows.map((row: any, rIdx: number) => (
                                    <tr key={rIdx} className="hover:bg-slate-50/80">
                                      {queryResult.headers.map((h: string) => (
                                        <td key={h} className="px-4 py-2 text-slate-700 border-r border-slate-100 last:border-0 select-all truncate max-w-xs">
                                          {row[h] === null ? <span className="text-slate-300 italic">null</span> : String(row[h])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                              No rows returned (Empty result set)
                            </div>
                          )
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-6 text-xs flex flex-col gap-2 font-mono">
                            <span className="font-bold text-sm">✅ Query completed successfully!</span>
                            <div>• Changes made: <span className="font-bold">{queryResult.changes}</span></div>
                            <div>• Last Insert Row ID: <span className="font-bold">{queryResult.lastInsertRowid || 'N/A'}</span></div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-300">
                          <Terminal size={32} className="opacity-20 mb-2" />
                          <span className="text-xs font-medium">Terminal idle. Execute a query to view results.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Recent System Events</span>
                  <span className="text-xs text-slate-400">Showing last 100 entries</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`mt-1 p-2 rounded-lg ${
                        log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-600' :
                        log.action.includes('REGISTER') ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{log.action}</span>
                          <span className="text-xs text-slate-400">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{log.details}</p>
                        <p className="text-xs text-slate-400 mt-1">User: {log.username || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Admin Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="fixed inset-0 z-10 md:ml-64 mt-16 p-4 md:p-8 bg-slate-50 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Admin Profile Settings</h2>
              <form onSubmit={handleUpdateAdminProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                      value={adminProfile.username}
                      onChange={(e) => setAdminProfile({ ...adminProfile, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Security PIN (Leave blank to keep current)</label>
                  <input 
                    type="password" 
                    maxLength={6}
                    placeholder="Enter new 6-digit PIN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                    value={adminProfile.pin}
                    onChange={(e) => setAdminProfile({ ...adminProfile, pin: e.target.value })}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all text-sm uppercase tracking-wide"
                  >
                    Update Admin Profile
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="text-amber-600 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-amber-900">Security Note</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Updating your username will require you to log in again. Ensure you remember your new PIN if you choose to update it.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Promotional Flyer Tab Content */}
      {activeTab === 'flyer' && (
        <div className="fixed inset-0 z-10 md:ml-64 mt-16 bg-slate-50 overflow-y-auto">
          <FlyerView onBack={() => setActiveTab('users')} />
        </div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Edit User Details</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</label>
                  <input 
                    required
                    type="text" 
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditForm({ ...editForm, mobile: val });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shop Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.shop_name}
                    onChange={(e) => setEditForm({ ...editForm, shop_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealer Commission (%)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.dealer_commission}
                    onChange={(e) => setEditForm({ ...editForm, dealer_commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Type / Access Level</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-slate-800"
                    value={editForm.user_type}
                    onChange={(e) => setEditForm({ ...editForm, user_type: e.target.value })}
                  >
                    <option value="Owner">Shop Owner (Full Authority)</option>
                    <option value="Staff">Staff (View-Only Access)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete User?</h3>
              <p className="text-slate-500 text-sm mb-6">This will permanently remove the user and all their associated records and logs. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                <button onClick={() => handleDeleteUser(showDeleteConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Logs Modal */}
      <AnimatePresence>
        {selectedUserLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Activity Logs: {selectedUser?.username}</h3>
                  <p className="text-sm text-slate-500">{selectedUser?.shop_name}</p>
                </div>
                <button 
                  onClick={() => { setSelectedUserLogs(null); setSelectedUser(null); }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin text-emerald-500" size={32} />
                  </div>
                ) : selectedUserLogs.length > 0 ? (
                  selectedUserLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`mt-1 p-2 rounded-lg ${
                        log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-600' :
                        log.action.includes('REGISTER') ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{log.action}</span>
                          <span className="text-xs text-slate-400">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{log.details}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    No activity logs found for this user.
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button 
                  onClick={() => { setSelectedUserLogs(null); setSelectedUser(null); }}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
