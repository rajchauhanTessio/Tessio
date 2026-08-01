import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Save, 
  X, 
  ChevronRight, 
  Printer, 
  Loader2,
  Calendar,
  User,
  Phone,
  Hash,
  Download,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_mobile: string;
  date: string;
  total_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  notes?: string;
  items?: InvoiceItem[];
}

export default function InvoiceManagementView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const { user } = useAuth();
  const isReadOnly = user?.userType === 'User' || user?.userType === 'user';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as const,
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }] as InvoiceItem[]
  });

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/invoices');
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      item.amount = (item.quantity || 0) * (item.unit_price || 0);
    }
    
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingInvoice ? `/invoices/${editingInvoice.id}` : '/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';
      
      await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      setIsAdding(false);
      setEditingInvoice(null);
      loadInvoices();
      setFormData({
        customer_name: '',
        customer_mobile: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
        items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]
      });
    } catch (err) {
      alert("Failed to save invoice");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await fetchWithAuth(`/invoices/${id}`, { method: 'DELETE' });
      loadInvoices();
    } catch (err) {
      alert("Failed to delete invoice");
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const data = await fetchWithAuth(`/invoices/${invoice.id}`);
      setViewingInvoice(data);
    } catch (err) {
      alert("Failed to load invoice details");
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_mobile && inv.customer_mobile.includes(searchTerm))
  );

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const fetchItemSuggestions = async (q: string) => {
    if (q.length < 2) {
      setItemSuggestions([]);
      return;
    }
    try {
      const data = await fetchWithAuth(`/items/suggestions?q=${encodeURIComponent(q)}`);
      setItemSuggestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !isAdding && !editingInvoice) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-12">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>Staff Account Mode: View-only access for shop invoices.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Service Invoices</h2>
          <p className="text-xs text-slate-500 font-medium">Manage and generate invoices for your customers</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Plus size={16} /> Create Invoice
          </button>
        )}
      </div>

      {!isAdding && !editingInvoice ? (
        <>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search invoices by number or customer..."
              className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInvoices.map((inv) => (
              <motion.div 
                key={inv.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{inv.invoice_number}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(inv.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    inv.status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                    'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">{inv.customer_name}</span>
                  </div>
                  {inv.customer_mobile && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">{inv.customer_mobile}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="text-lg font-black text-slate-900">₹{inv.total_amount.toFixed(2)}</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleViewInvoice(inv)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingInvoice(inv);
                        setFormData({
                          customer_name: inv.customer_name,
                          customer_mobile: inv.customer_mobile,
                          date: inv.date,
                          status: inv.status,
                          notes: inv.notes || '',
                          items: inv.items || []
                        });
                        // Items will be loaded when edit starts if needed, 
                        // but better to fetch detailed info first if not already present
                        fetchWithAuth(`/invoices/${inv.id}`).then((fullInv: Invoice) => {
                          setFormData({
                             customer_name: fullInv.customer_name,
                             customer_mobile: fullInv.customer_mobile,
                             date: fullInv.date,
                             status: fullInv.status,
                             notes: fullInv.notes || '',
                             items: fullInv.items || []
                          });
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <Printer size={18} />
                    </button>
                    {!isReadOnly && (
                      <button 
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredInvoices.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500 text-sm font-medium">No invoices found</p>
                <button onClick={() => setIsAdding(true)} className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline">Create your first invoice</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900">{editingInvoice ? 'Edit' : 'Create'} Service Invoice</h3>
            <button onClick={() => { setIsAdding(false); setEditingInvoice(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="John Doe"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="tel" 
                    maxLength={10}
                    className="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="10-digit number"
                    value={formData.customer_mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, customer_mobile: val });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Invoice Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    required
                    type="date" 
                    className="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Payment Status</label>
                <div className="flex gap-2">
                  {['pending', 'paid', 'cancelled'].map((s) => (
                    <button 
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        formData.status === s 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Items</label>
                <button 
                  type="button" 
                  onClick={handleAddItem}
                  className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50 relative">
                    <div className="col-span-12 md:col-span-6 relative">
                      <input 
                        required
                        className="w-full bg-white border-0 rounded-xl px-4 py-2 text-xs font-bold"
                        placeholder="Search Service/Dealer Code"
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value);
                          setActiveItemIndex(index);
                          fetchItemSuggestions(e.target.value);
                        }}
                        onBlur={() => setTimeout(() => setActiveItemIndex(null), 200)}
                      />
                      {activeItemIndex === index && itemSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left block">Common Items & Prices</span>
                          </div>
                          {itemSuggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                handleItemChange(index, 'description', suggestion.name);
                                handleItemChange(index, 'unit_price', suggestion.price || 0);
                                setItemSuggestions([]);
                                setActiveItemIndex(null);
                              }}
                              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                            >
                              <span>{suggestion.name}</span>
                              <span className="text-emerald-500">₹{suggestion.price?.toFixed(2) || '0.00'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input 
                        type="number"
                        className="w-full bg-white border-0 rounded-xl px-4 py-2 text-xs font-bold text-center"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
                        <input 
                          type="number"
                          className="w-full bg-white border-0 rounded-xl pl-6 pr-4 py-2 text-xs font-bold"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-1 flex justify-end">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                        className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</span>
                  <span className="text-xl font-black">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Additional Notes</label>
              <textarea 
                className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3.5 text-sm font-medium min-h-[100px] focus:ring-2 focus:ring-indigo-500/20 outline-none"
                placeholder="Internal notes or terms..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingInvoice(null); }}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Discard
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Save & Generate
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* View/Print Modal */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <h3 className="font-black text-slate-900">Invoice #{viewingInvoice.invoice_number}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewingInvoice(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8" id="printable-invoice">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">INVOICE</h2>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{viewingInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-xs font-bold text-slate-700">{format(new Date(viewingInvoice.date), 'MMMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing To</p>
                    <h4 className="text-sm font-black text-slate-900 mb-1">{viewingInvoice.customer_name}</h4>
                    <p className="text-xs font-medium text-slate-500">{viewingInvoice.customer_mobile}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      viewingInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                      viewingInvoice.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {viewingInvoice.status}
                    </span>
                  </div>
                </div>

                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                      <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                      <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingInvoice.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-4">
                          <p className="text-xs font-bold text-slate-900">{item.description}</p>
                        </td>
                        <td className="py-4 text-center text-xs font-medium text-slate-600">{item.quantity}</td>
                        <td className="py-4 text-right text-xs font-medium text-slate-600">₹{item.unit_price.toFixed(2)}</td>
                        <td className="py-4 text-right text-xs font-black text-slate-900">₹{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900">
                      <td colSpan={3} className="py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</td>
                      <td className="py-6 text-right text-xl font-black text-slate-900">₹{viewingInvoice.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {viewingInvoice.notes && (
                  <div className="bg-slate-50 p-6 rounded-2xl italic">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 not-italic">Notes</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{viewingInvoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                >
                  <Printer size={16} /> Print Invoice
                </button>
                <button 
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(viewingInvoice));
                    const dlAnchorElem = document.createElement('a');
                    dlAnchorElem.setAttribute("href", dataStr);
                    dlAnchorElem.setAttribute("download", `invoice_${viewingInvoice.invoice_number}.json`);
                    dlAnchorElem.click();
                  }}
                  className="flex-1 py-3 bg-white text-slate-900 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download JSON
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
