import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Table as TableIcon, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SharedTableView({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const isQuality = detectIsQuality(data?.data?.rows || [], h);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/shared/${id}`);
        if (!res.ok) throw new Error("Link not found or expired");
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data.headers) && Array.isArray(json.data.rows)) {
          const isEmptyValue = (val: any) => {
            if (val == null) return true;
            const s = String(val).trim();
            return s === '' || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'na' || s.toLowerCase() === 'n.a.';
          };

          const headers = json.data.headers as string[];
          const rows = json.data.rows as any[];

          const priceCodeHeader = headers.find(h => {
            const u = h.toUpperCase().trim();
            return u === 'SKU' || u === 'PRICE CODE' || /price code|sku/i.test(h);
          });
          const qualityHeader = headers.find(h => /quality/i.test(h));

          const isPriceCodeEmpty = priceCodeHeader ? rows.every((row: any) => isEmptyValue(row[priceCodeHeader])) : true;
          const isQualityEmpty = qualityHeader ? rows.every((row: any) => isEmptyValue(row[qualityHeader])) : true;

          let filteredHeaders = headers.filter((h: string) => {
            if (priceCodeHeader && h === priceCodeHeader && isPriceCodeEmpty) return false;
            if (qualityHeader && h === qualityHeader && isQualityEmpty) return false;
            return true;
          });

          const activeQualityHeader = filteredHeaders.find(h => /quality/i.test(h));
          if (activeQualityHeader && filteredHeaders.length > 1) {
            filteredHeaders = filteredHeaders.filter((h: string) => h !== activeQualityHeader);
            filteredHeaders.splice(1, 0, activeQualityHeader);
          }

          const processedRows = rows.map((row: any) => {
            const newRow: any = {};
            filteredHeaders.forEach((h: string) => {
              newRow[h] = row[h];
            });
            return newRow;
          });

          json.data.headers = filteredHeaders;
          json.data.rows = processedRows;
        }
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const downloadExcel = () => {
    if (!data) return;
    const worksheet = XLSX.utils.json_to_sheet(data.data.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Adjusted Prices");
    XLSX.writeFile(workbook, `${data.title}_Adjusted.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="text-amber-500 animate-spin" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Shared Catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
         <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <ArrowLeft size={40} />
         </div>
         <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Access Denied</h2>
            <p className="text-slate-400 text-sm font-medium">{error}</p>
         </div>
         <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest">
            Back to Home
         </button>
      </div>
    );
  }

  const parts = (data?.title || '').split('_');
  const companyName = parts[0] || '';
  const collectionName = parts.slice(1).join('_') || parts[0] || '';

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-wider text-slate-900 uppercase">
              {companyName}
            </span>
          </div>
        </div>

        <div className="text-center py-6">
           <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-[0.2em] uppercase font-sans">
              {collectionName}
           </h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-slate-200 overflow-hidden rounded-sm"
        >
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#1e2329]">
                       {data.data.headers.map((h: string, i: number) => (
                          <th 
                            key={i} 
                            className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-white border-0"
                          >
                            {getDisplayHeader(h)}
                          </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {data.data.rows.map((row: any, i: number) => (
                       <tr key={i} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50 transition-colors">
                          {data.data.headers.map((h: string, j: number) => (
                             <td 
                                key={j} 
                                className="px-6 py-4 text-sm font-semibold text-slate-800"
                             >
                                {getDisplayValue(h, row[h])}
                             </td>
                          ))}
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </motion.div>

      </div>
    </div>
  );
}
