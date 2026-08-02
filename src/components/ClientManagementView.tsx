import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Bell, 
  Calendar, 
  History, 
  Clock, 
  Plus, 
  Settings as SettingsIcon, 
  X, 
  Phone, 
  Save, 
  Edit2, 
  Trash2, 
  Loader2,
  Check,
  Search,
  ShieldAlert
} from 'lucide-react';

export default function ClientManagementView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const { user } = useAuth();
  const isReadOnly = user?.userType === 'Staff' || user?.userType === 'staff' || user?.userType === 'User' || user?.userType === 'user';
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [reminderDays, setReminderDays] = useState(7);
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    contact_number: '',
    address: '',
    interested_dealer_code: '', // We'll keep it as a string but manage it as an array in UI
    enquiry_date: new Date().toISOString().split('T')[0],
    bought_dealer_code: '',
    bought_date: '',
    notes: ''
  });

  const [interestedItems, setInterestedItems] = useState<string[]>([]);
  const [suggestionInput, setSuggestionInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);

  const fetchSuggestions = async (val: string, field: string) => {
    if (!val || val.length < 1) {
      setSuggestions([]);
      setActiveSuggestionField(null);
      return;
    }
    try {
      const data = await fetchWithAuth(`/records/suggestions?q=${encodeURIComponent(val)}`);
      setSuggestions(data);
      setActiveSuggestionField(field);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsData, settingsData] = await Promise.all([
        fetchWithAuth('/clients'),
        fetchWithAuth('/user/settings')
      ]);
      setClients(clientsData || []);
      if (settingsData && settingsData.reminder_days) {
        setReminderDays(settingsData.reminder_days);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleTriggerAdd = () => {
      setIsAdding(true);
      setEditingClient(null);
    };
    window.addEventListener('trigger-add-client', handleTriggerAdd);
    return () => window.removeEventListener('trigger-add-client', handleTriggerAdd);
  }, []);

  const [purchaseData, setPurchaseData] = useState({
    item_details: '',
    amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    dealer_code: ''
  });
  const [showPurchaseFormFor, setShowPurchaseFormFor] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<{[key: number]: any[]}>({});
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  const loadPurchases = async (clientId: number) => {
    try {
      const data = await fetchWithAuth(`/clients/${clientId}/purchases`);
      setPurchases(prev => ({ ...prev, [clientId]: data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPurchase = async (clientId: number) => {
    if (!purchaseData.item_details.trim()) {
      alert("Please enter item details");
      return;
    }
    setIsSavingPurchase(true);
    try {
      await fetchWithAuth(`/clients/${clientId}/purchases`, {
        method: 'POST',
        body: JSON.stringify(purchaseData)
      });
      setPurchaseData({
        item_details: '',
        amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        dealer_code: ''
      });
      setShowPurchaseFormFor(null);
      loadPurchases(clientId);
    } catch (err) {
      alert("Failed to add purchase record");
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const handleDeletePurchase = async (purchaseId: number, clientId: number) => {
    if (!confirm("Delete this purchase record?")) return;
    try {
      await fetchWithAuth(`/purchases/${purchaseId}`, { method: 'DELETE' });
      loadPurchases(clientId);
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const validatePhone = (number: string) => {
    if (!number) return true; // Optional field
    const regex = /^[6-9]\d{9}$/;
    return regex.test(number.replace(/\D/g, '').slice(-10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.contact_number && !validatePhone(formData.contact_number)) {
      setPhoneError("Please enter a valid 10-digit phone number");
      return;
    }
    setPhoneError(null);

    try {
      if (editingClient) {
        await fetchWithAuth(`/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            interested_dealer_code: interestedItems.join(', ')
          })
        });
      } else {
        await fetchWithAuth('/clients', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            interested_dealer_code: interestedItems.join(', ')
          })
        });
      }
      setIsAdding(false);
      setEditingClient(null);
      setFormData({
        name: '',
        contact_number: '',
        address: '',
        interested_dealer_code: '',
        enquiry_date: new Date().toISOString().split('T')[0],
        bought_dealer_code: '',
        bought_date: '',
        notes: ''
      });
      setInterestedItems([]);
      setSuggestionInput('');
      loadData();
    } catch (err) {
      alert("Failed to save client");
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    const items = client.interested_dealer_code ? client.interested_dealer_code.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setInterestedItems(items);
    setSuggestionInput('');
    setFormData({
      name: client.name,
      contact_number: client.contact_number || '',
      address: client.address || '',
      interested_dealer_code: client.interested_dealer_code || '',
      enquiry_date: client.enquiry_date || '',
      bought_dealer_code: client.bought_dealer_code || '',
      bought_date: client.bought_date || '',
      notes: client.notes || ''
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this client?")) return;
    try {
      await fetchWithAuth(`/clients/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const saveSettings = async () => {
    try {
      await fetchWithAuth('/user/settings', {
        method: 'POST',
        body: JSON.stringify({ reminder_days: reminderDays })
      });
      setShowSettings(false);
      alert("Settings saved");
    } catch (err) {
      alert("Failed to save settings");
    }
  };

  const getReminders = () => {
    const today = new Date();
    return (clients || []).filter(c => {
      if (c.bought_date || !c.enquiry_date) return false;
      const enqDate = new Date(c.enquiry_date);
      const diffTime = today.getTime() - enqDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= reminderDays;
    });
  };

  const reminders = getReminders();

  if (loading) return (
    <div className="flex items-center justify-center p-12 py-32">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center p-8 py-24 bg-white rounded-3xl border border-slate-100">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <X size={32} />
      </div>
      <h3 className="font-bold text-slate-900 mb-2">Error Loading Clients</h3>
      <p className="text-slate-500 text-xs mb-6 px-4 text-center">{error}</p>
      <button 
        onClick={loadData}
        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6 text-left">
      {/* Read Only Staff Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-600 shrink-0" />
          <span>Staff Account Mode: View-only access for shop records.</span>
        </div>
      )}

      {/* Reminder Banner */}
      {reminders.length > 0 && !isAdding && (
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Action Required</h3>
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-0.5">
              You have {reminders.length} clients waiting for follow-up since their enquiry.
            </p>
          </div>
        </div>
      )}

      {/* Settings & Add Button */}
      {!isAdding && !isReadOnly && (
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
          >
            <Plus size={18} /> Add New Client
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-14 h-14 bg-white border border-slate-100 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      )}

      {/* Reminder Settings */}
      {showSettings && !isAdding && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Follow-up Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-left">
                Remind me after (days)
              </label>
              <input 
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button 
              onClick={saveSettings}
              className="w-full bg-slate-900 text-white rounded-xl py-3 text-xs font-bold"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-base">{editingClient ? 'Edit Client' : 'New Client'}</h3>
            <button type="button" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">Client Name *</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium" placeholder="Full Name" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">Contact Number</label>
              <input 
                value={formData.contact_number} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({...formData, contact_number: val});
                  if (phoneError) setPhoneError(null);
                }} 
                maxLength={10}
                className={`w-full bg-slate-50 border-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${phoneError ? 'border-red-100 bg-red-50/30' : 'border-transparent focus:border-indigo-50/50 focus:bg-white'}`} 
                placeholder="10-digit number" 
              />
              {phoneError && <p className="text-[9px] font-bold text-red-500 mt-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                <span className="w-1 h-1 bg-red-500 rounded-full" /> {phoneError}
              </p>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">Address</label>
              <textarea 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium min-h-[80px]" 
                placeholder="Client Address" 
              />
            </div>
            
              <div className="md:col-span-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">Interested Item(s)</label>
                
                {/* Selected Items Tags */}
                {interestedItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {interestedItems.map((item, idx) => (
                      <div key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-indigo-100">
                        {item}
                        <button 
                          type="button" 
                          onClick={() => setInterestedItems(interestedItems.filter((_, i) => i !== idx))}
                          className="hover:text-indigo-900"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                    <Search size={14} />
                  </div>
                  <input 
                    value={suggestionInput} 
                    onChange={e => {
                      setSuggestionInput(e.target.value);
                      fetchSuggestions(e.target.value, 'interested');
                    }} 
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-50/50 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm font-bold uppercase transition-all placeholder:text-slate-300" 
                    placeholder="Search or Type Items" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && suggestionInput.trim()) {
                        e.preventDefault();
                        if (!interestedItems.includes(suggestionInput.trim().toUpperCase())) {
                          setInterestedItems([...interestedItems, suggestionInput.trim().toUpperCase()]);
                        }
                        setSuggestionInput('');
                      }
                    }}
                  />
                </div>
                  {activeSuggestionField === 'interested' && (suggestionInput.trim() !== '' || suggestions.length > 0) && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-indigo-100/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {suggestionInput.trim() !== '' && !interestedItems.includes(suggestionInput.trim().toUpperCase()) && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          // Prevent input onBlur from firing before onClick by using onMouseDown
                          e.preventDefault();
                          const val = suggestionInput.trim().toUpperCase();
                          if (!interestedItems.includes(val)) {
                            setInterestedItems([...interestedItems, val]);
                          }
                          setSuggestionInput('');
                          setSuggestions([]);
                          setActiveSuggestionField(null);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-colors border-b border-slate-100 flex items-center justify-between bg-indigo-50/20"
                      >
                        <span>Add Custom: "{suggestionInput.trim().toUpperCase()}"</span>
                        <Plus size={10} className="text-indigo-600" />
                      </button>
                    )}
                    {suggestions.length > 0 && (
                      <>
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Matched Saved Codes</span>
                        </div>
                        {suggestions.map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (!interestedItems.includes(s.dealer_code)) {
                                setInterestedItems([...interestedItems, s.dealer_code]);
                              }
                              setSuggestionInput('');
                              setSuggestions([]);
                              setActiveSuggestionField(null);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span>{s.dealer_code}</span>
                              <span className="text-[9px] text-slate-400 font-medium">Model: {s.company_code} • ${s.cost_price}</span>
                            </div>
                            <Plus size={10} className="text-slate-300" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">Enquiry Date</label>
                <input type="date" value={formData.enquiry_date} onChange={e => setFormData({...formData, enquiry_date: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-50/50 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all" />
              </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-left">History / Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium min-h-[100px]" placeholder="Add context or previous buying history..." />
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-2">
              <Save size={18} /> {editingClient ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {!isAdding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Managed Clients ({clients.length})</h3>
            {reminders.length > 0 && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{reminders.length} Due</span>}
          </div>
          
          {clients.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
               <Users className="mx-auto text-slate-200 mb-3" size={48} />
               <p className="text-slate-400 font-medium text-xs px-12 leading-relaxed">No client records found. Start adding clients to manage your relationship pipeline.</p>
            </div>
          ) : (
            clients.map(client => {
              const overdue = reminders.some(r => r.id === client.id);
              const converted = !!client.bought_date;

              return (
                <div key={client.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.99] transition-transform text-left">
                  {overdue && <div className="absolute top-0 right-0 w-14 h-14 bg-amber-500/10 flex items-center justify-center rounded-bl-3xl text-amber-600"><Bell size={18} /></div>}
                  {converted && <div className="absolute top-0 right-0 w-14 h-14 bg-emerald-500/10 flex items-center justify-center rounded-bl-3xl text-emerald-600"><Check size={18} /></div>}
                  
                  <div className="flex items-start justify-between mb-3 pr-8">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{client.name}</h4>
                      {client.contact_number && (
                        <a href={`tel:${client.contact_number}`} className="text-xs text-indigo-600 font-bold flex items-center gap-1.5 mt-1 bg-indigo-50 w-fit px-2 py-1 rounded-lg">
                          <Phone size={12} /> {client.contact_number}
                        </a>
                      )}
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  {client.address && (
                    <div className="mt-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Address</span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{client.address}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">Enquiry Pipeline</span>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {client.interested_dealer_code ? (
                          client.interested_dealer_code.split(',').map((item: string, i: number) => (
                            <span key={i} className="text-[9px] font-black bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wider">
                              {item.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300">---</span>
                        )}
                      </div>
                      <span className="block text-[9px] text-slate-400 font-medium leading-none">
                        {client.enquiry_date ? new Date(client.enquiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Conversion Status</span>
                      <div className={`text-[11px] font-bold ${converted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {converted ? client.bought_dealer_code : 'Not Converted'}
                        {converted && (
                          <span className="block text-[9px] text-emerald-500 font-medium">
                            {new Date(client.bought_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {client.notes && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <History size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Notes</span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">"{client.notes}"</p>
                    </div>
                  )}

                  {/* Buying History Section */}
                  <div className="mt-6 border-t border-slate-50 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center">
                            <History size={12} />
                         </div>
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Buying History</span>
                      </div>
                      <button 
                        onClick={() => {
                          setShowPurchaseFormFor(showPurchaseFormFor === client.id ? null : client.id);
                          if (!purchases[client.id]) loadPurchases(client.id);
                        }}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-transform"
                      >
                        <Plus size={10} /> Add Record
                      </button>
                    </div>

                    {showPurchaseFormFor === client.id && (
                      <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Item Details</label>
                          <input 
                            value={purchaseData.item_details} 
                            onChange={e => setPurchaseData({...purchaseData, item_details: e.target.value})} 
                            className="w-full bg-white border-0 rounded-xl px-3 py-2 text-xs font-bold" 
                            placeholder="Product name/SKU"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Purchase Amount</label>
                            <input 
                              type="number"
                              value={purchaseData.amount} 
                              onChange={e => setPurchaseData({...purchaseData, amount: e.target.value})} 
                              className="w-full bg-white border-0 rounded-xl px-3 py-2 text-xs font-bold" 
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Purchase Date</label>
                            <input 
                              type="date"
                              value={purchaseData.purchase_date} 
                              onChange={e => setPurchaseData({...purchaseData, purchase_date: e.target.value})} 
                              className="w-full bg-white border-0 rounded-xl px-3 py-2 text-xs font-bold" 
                            />
                          </div>
                        </div>

                        <div className="relative">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dealer Code</label>
                          <div className="relative group">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                              <Search size={10} />
                            </div>
                            <input 
                              value={purchaseData.dealer_code} 
                              onChange={e => {
                                setPurchaseData({...purchaseData, dealer_code: e.target.value});
                                fetchSuggestions(e.target.value, 'purchase');
                              }} 
                              onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                              className="w-full bg-white border-2 border-transparent focus:border-indigo-50/50 rounded-xl pl-8 pr-3 py-2 text-xs font-bold uppercase transition-all placeholder:text-slate-300" 
                              placeholder="Search dealer code"
                            />
                          </div>
                          {activeSuggestionField === 'purchase' && suggestions.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-indigo-100/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                              {suggestions.map((s: any) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setPurchaseData({
                                      ...purchaseData, 
                                      dealer_code: s.dealer_code,
                                      item_details: s.company_code,
                                      amount: s.cost_price.toString()
                                    });
                                    setSuggestions([]);
                                    setActiveSuggestionField(null);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                                >
                                  <div className="flex flex-col">
                                    <span>{s.dealer_code}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">{s.company_code} • ${s.cost_price}</span>
                                  </div>
                                  <Plus size={8} className="text-slate-300" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => handleAddPurchase(client.id)}
                          disabled={isSavingPurchase}
                          className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSavingPurchase ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save Record
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                       {!purchases[client.id] && client.bought_date && !showPurchaseFormFor && (
                          <button 
                            onClick={() => loadPurchases(client.id)}
                            className="w-full py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                             <Clock size={10} /> View All Records
                          </button>
                       )}
                       
                       {purchases[client.id]?.map((p: any) => (
                         <div key={p.id} className="bg-slate-50/50 rounded-2xl p-3 flex items-center justify-between group">
                            <div className="flex gap-3 items-center">
                               <div className="w-8 h-8 bg-white border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                                  <Clock size={14} />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-slate-900">{p.item_details}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                     <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{p.dealer_code}</span>
                                     <span className="text-[8px] font-medium text-slate-400">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</span>
                                     {p.amount > 0 && <span className="text-[8px] font-bold text-emerald-600 ml-1">₹{p.amount.toFixed(2)}</span>}
                                  </div>
                               </div>
                            </div>
                            <button 
                              onClick={() => handleDeletePurchase(p.id, client.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                               <Trash2 size={12} />
                            </button>
                         </div>
                       ))}
                       
                       {purchases[client.id]?.length === 0 && (
                          <p className="text-[10px] text-slate-400 font-medium text-center py-2">No additional records recorded.</p>
                       )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
