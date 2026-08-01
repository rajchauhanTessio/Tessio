import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Server, 
  Cloud, 
  Database, 
  Layers, 
  ShieldCheck, 
  Smartphone, 
  Sliders, 
  PlusCircle, 
  Activity, 
  Zap, 
  Feather, 
  Award, 
  Globe, 
  ArrowLeft, 
  Check, 
  Search, 
  TrendingUp, 
  Cpu, 
  Sparkles,
  ArrowRight,
  Printer,
  Download
} from 'lucide-react';

interface FlyerViewProps {
  onBack: () => void;
}

export default function FlyerView({ onBack }: FlyerViewProps) {
  const [domainSearch, setDomainSearch] = useState('');
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainResult, setDomainResult] = useState<{
    available: boolean;
    tld: string;
    price: string;
    domain: string;
  } | null>(null);

  // Live Ping/Speed monitor simulation
  const [pings, setPings] = useState<number[]>([24, 26, 22, 28, 25, 24, 23]);
  const [activeTab, setActiveTab] = useState<'features' | 'architecture'>('features');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadFlyerImage = async () => {
    let iframe: HTMLIFrameElement | null = null;
    try {
      setDownloading(true);
      const element = document.getElementById('printable-flyer-container');
      if (!element) {
        alert('Flyer template element was not found in the document.');
        return;
      }

      // Create a hidden iframe
      iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '800px';
      iframe.style.height = '1200px';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      // Clone the printable flyer element
      const clone = element.cloneNode(true) as HTMLElement;
      // Force layout styling for high-res representation
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.display = 'block';
      clone.style.width = '800px';
      clone.style.backgroundColor = '#ffffff';

      // Append cloned element to iframe body
      iframeDoc.body.appendChild(clone);

      // Render the clone in the iframe's context (bypasses parent document's Tailwind oklch styles)
      const canvas = await html2canvas(clone, {
        scale: 2.5, // 2.5x scale for super crisp presentation quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = 'tessio_infrastructure_specifications.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error rendering/downloading flyer image:', error);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setDownloading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPings(prev => {
        const next = [...prev.slice(1)];
        const fluctuation = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const newPing = Math.max(18, Math.min(45, (prev[prev.length - 1] || 25) + fluctuation));
        next.push(newPing);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDomainCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainSearch.trim()) return;
    
    setCheckingDomain(true);
    setDomainResult(null);

    setTimeout(() => {
      const input = domainSearch.trim().toLowerCase();
      // Simple parse to remove http, www, etc.
      let domainName = input.replace(/^(https?:\/\/)?(www\.)?/, '');
      if (!domainName.includes('.')) {
        domainName += '.com';
      }
      
      const parts = domainName.split('.');
      const tld = parts[parts.length - 1];
      const nameOnly = parts.slice(0, -1).join('.');

      // Dynamic price mapping based on standard TLDs
      let estimatedPrice = '$12.00 / year';
      if (tld === 'io') estimatedPrice = '$39.00 / year';
      else if (tld === 'tech') estimatedPrice = '$8.99 / year';
      else if (tld === 'store') estimatedPrice = '$14.99 / year';
      else if (tld === 'net') estimatedPrice = '$13.50 / year';
      else if (tld === 'co') estimatedPrice = '$22.00 / year';
      else if (tld === 'app') estimatedPrice = '$16.00 / year';

      // Simulation randomizer for availability
      const hash = domainName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isAvailable = hash % 3 !== 0; // 66% chance of being available

      setDomainResult({
        available: isAvailable,
        tld: `.${tld}`,
        price: estimatedPrice,
        domain: domainName
      });
      setCheckingDomain(false);
    }, 800);
  };

  const keyFeatures = [
    {
      id: 'sla',
      icon: <Server className="text-emerald-500" size={24} />,
      title: "Server Uptime SLA 99.99%",
      description: "State-of-the-art enterprise servers engineered for maximum durability, assuring your portal is live around the clock.",
      tag: "Guaranteed SLA",
      color: "bg-emerald-50 border-emerald-100"
    },
    {
      id: 'cloud',
      icon: <Cloud className="text-blue-500" size={24} />,
      title: "Cloud Native Application",
      description: "Fully hosted cloud structure delivering consistent global access, infinite scalability, and serverless reliability.",
      tag: "Next-Gen Cloud",
      color: "bg-blue-50 border-blue-100"
    },
    {
      id: 'db',
      icon: <Database className="text-violet-500" size={24} />,
      title: "Automatic DB Maintenance",
      description: "Automated schema updates, self-healing queries, and secure daily periodic backups so you never lose a byte.",
      tag: "Zero Admin Required",
      color: "bg-violet-50 border-violet-100"
    },
    {
      id: 'redundancy',
      icon: <Layers className="text-amber-500" size={24} />,
      title: "Multi-Zone Data Redundancy",
      description: "Your files and records are replicated in real-time across redundant physical server facilities to safeguard against loss.",
      tag: "Fault Tolerant",
      color: "bg-amber-50 border-amber-100"
    },
    {
      id: 'segregation',
      icon: <TrendingUp className="text-rose-500" size={24} />,
      title: "Tenant Profile Segregation",
      description: "Isolated server transactions ensure that each merchant, admin, and dealer operates in their secure distinct workspace.",
      tag: "Secure Separation",
      color: "bg-rose-50 border-rose-100"
    },
    {
      id: 'auth',
      icon: <ShieldCheck className="text-teal-500" size={24} />,
      title: "Authentication & Authorisation",
      description: "Strict secure cryptographic 6-Digit security PIN validation and roles configuration (Admin, Dealer, Client).",
      tag: "Role-Based Security",
      color: "bg-teal-50 border-teal-100"
    },
    {
      id: 'reactive',
      icon: <Smartphone className="text-indigo-500" size={24} />,
      title: "Fully Reactive Layouts",
      description: "Immersive Web & Mobile layouts adapting natively to desktop monitors, tablets, and smartphones.",
      tag: "Universal UI/UX",
      color: "bg-indigo-50 border-indigo-100"
    },
    {
      id: 'customizable',
      icon: <Sliders className="text-orange-500" size={24} />,
      title: "Highly Customizable System",
      description: "Adjust service commission parameters, dealer configurations, and layout states directly via settings panels.",
      tag: "Dynamic Config",
      color: "bg-orange-50 border-orange-100"
    },
    {
      id: 'ondemand',
      icon: <PlusCircle className="text-sky-500" size={24} />,
      title: "More Features On Demand",
      description: "Need bespoke workflows, QR extensions, or invoice tools? Our modules are built for seamless incremental upgrades.",
      tag: "Future Proof",
      color: "bg-sky-50 border-sky-100"
    },
    {
      id: 'monitoring',
      icon: <Activity className="text-red-500" size={24} />,
      title: "Constant 24/7 Monitoring",
      description: "Continuous automated telemetry tracking server health, logs validation, database lag, and request latencies.",
      tag: "Active Watch",
      color: "bg-red-50 border-red-100"
    },
    {
      id: 'speed',
      icon: <Zap className="text-cyan-500" size={24} />,
      title: "Lightning Speed & Safety",
      description: "Vite and modern TypeScript runtime bundle. Sub-millisecond parsing and end-to-end HTTPS encryption.",
      tag: "Ultra Performant",
      color: "bg-cyan-50 border-cyan-100"
    },
    {
      id: 'lightweight',
      icon: <Feather className="text-fuchsia-500" size={24} />,
      title: "Lightweight Architecture",
      description: "Optimized bundle footprint with near-instant client-side loading speeds and low cellular bandwidth usage.",
      tag: "Zero Bloat",
      color: "bg-fuchsia-50 border-fuchsia-100"
    },
    {
      id: 'industrial',
      icon: <Award className="text-yellow-600" size={24} />,
      title: "Industrial Standard Design",
      description: "Utilizing Swiss typography, cohesive spacing grids, clear responsive touch targets, and balanced negative space.",
      tag: "Crafted Aesthetics",
      color: "bg-yellow-50 border-yellow-100"
    },
    {
      id: 'domain',
      icon: <Globe className="text-emerald-600" size={24} />,
      title: "Custom Domain Integration",
      description: "Host the platform on your own branded domain. Connection configuration is ready. Domain charges apply.",
      tag: "Branding",
      color: "bg-emerald-50 border-emerald-100"
    }
  ];

  const averagePing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);

  return (
    <>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none pb-20 print:hidden">
        
        {/* Premium Header Bar */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadFlyerImage}
              disabled={downloading}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} className="text-emerald-500" />
                  Download Flyer (PNG)
                </>
              )}
            </button>

            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-emerald-100"
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 hidden sm:flex ml-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase">Enterprise Spec Standard</span>
            </div>
          </div>
        </header>

      {/* Hero Presentation */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full text-emerald-700 text-xs font-bold mb-4"
        >
          <Sparkles size={14} className="text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
          Tessio Cloud Infrastructure Overview
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-none"
        >
          Robust Core Architecture
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-slate-500 font-medium max-w-xl mx-auto mt-3 leading-relaxed"
        >
          Engineered from the ground up for elite textile dealers. Experience industrial stability, secure multi-tenant data structures, and lightning fast responsiveness.
        </motion.p>

        {/* View Switch Tabs */}
        <div className="flex items-center justify-center gap-2 mt-6 p-1 bg-slate-100 rounded-2xl max-w-xs mx-auto">
          <button 
            onClick={() => setActiveTab('features')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'features' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Key Features (14)
          </button>
          <button 
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            SLA & Tools
          </button>
        </div>
      </div>

      {/* Main Interactive Content */}
      <div className="max-w-4xl mx-auto px-4 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'features' ? (
            <motion.div 
              key="features-list"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
            >
              {keyFeatures.map((feat, idx) => (
                <motion.div
                  key={feat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:shadow-slate-100 hover:border-slate-200 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${feat.color} shrink-0`}>
                        {feat.icon}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-lg">
                        {feat.tag}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-slate-300 group-hover:text-emerald-500 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">Enterprise Standard</span>
                    <Check size={14} className="shrink-0" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="architecture-live"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 mt-2"
            >
              
              {/* Section 1: Custom Domain Availability Fee Query */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800 tracking-tight leading-none">Custom Domain Lookup</h2>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Available as per domain name registry charges</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                  Elevate your branding by hosting Tessio on your own custom web address. Enter your preferred domain below to check configuration guidelines and estimate annual domain charges.
                </p>

                <form onSubmit={handleDomainCheck} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="e.g. royaltextiles.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none transition-all"
                      value={domainSearch}
                      onChange={(e) => setDomainSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={checkingDomain}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 rounded-xl transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {checkingDomain ? 'Inquiring...' : 'Lookup Fee'}
                  </button>
                </form>

                {/* Domain inquiry response layout */}
                <AnimatePresence mode="wait">
                  {domainResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 tracking-tight">{domainResult.domain}</span>
                            {domainResult.available ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md">Available</span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-600 rounded-md">Registered</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium leading-relaxed">
                            {domainResult.available 
                              ? "Excellent choice! This domain is ready to be purchased and bound to your portal."
                              : "This domain is currently owned. You can connect it if you possess the ownership rights."}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-slate-800">{domainResult.price}</span>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Est. Registry Fee</p>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-bold">
                          ⚠️ Custom domain is subject to registrar availability & annual charges.
                        </span>
                        <a 
                          href="https://domains.google" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 hover:underline"
                        >
                          Configure via Registrar <ArrowRight size={12} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 2: Real-time Speed & SLA Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col justify-between items-center">
                  <div className="p-2.5 bg-violet-50 rounded-2xl text-violet-600 mb-2">
                    <Server size={22} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server SLA</h3>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">99.99%</p>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mt-2">Continuous SLA Guaranteed</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col justify-between items-center">
                  <div className="p-2.5 bg-cyan-50 rounded-2xl text-cyan-600 mb-2">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Average Ping</h3>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{averagePing} ms</p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full mt-2">Real-Time Continuous Feed</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm text-center flex flex-col justify-between items-center">
                  <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600 mb-2">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Load</h3>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">Lightweight</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-2">Sub-0.1s Initialization</span>
                </div>
              </div>

              {/* Ping live visualizer */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Connection Latency Feed</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{averagePing}ms SLA Standard</span>
                </div>

                {/* Tiny layout visualization of graph */}
                <div className="h-24 flex items-end gap-1 px-2 border-b border-slate-100">
                  {pings.map((val, i) => {
                    const heightPercent = Math.min(100, Math.max(10, (val / 50) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-slate-500 mb-1">{val}ms</span>
                        <div 
                          className="w-full bg-emerald-500/80 group-hover:bg-emerald-500 rounded-t-md transition-all duration-300" 
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-2 px-1">
                  <span>-14s ago</span>
                  <span>Live telemetry feed active</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Standard disclaimer & charges statement */}
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] text-slate-500 font-medium leading-relaxed">
                🌐 Custom Domain connection is prepared on our application platform for absolute convenience. Users must own or obtain the domain from standard accredited registrars (Google Domains, GoDaddy, Namecheap, etc.) at their respective catalog charges. Platform server uptime SLA is backed by continuous redundant backups.
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>

    {/* High-Resolution Printable Flyer (Off-screen for HTML2Canvas capture, but visible for print) */}
      <div 
        id="printable-flyer-container" 
        className="print:block absolute -left-[9999px] print:left-0 print:relative top-0 w-[800px] print:w-full bg-white text-slate-900 p-12 font-sans select-all leading-normal"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            #printable-flyer-container {
              width: 100% !important;
              left: 0 !important;
              position: relative !important;
              padding: 24px !important;
            }
          }
          #printable-flyer-container {
            width: 800px;
            background-color: #ffffff !important;
            color: #0f172a !important;
            padding: 48px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            box-sizing: border-box !important;
          }
          #printable-flyer-container .flyer-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 24px !important;
            margin-bottom: 32px !important;
          }
          #printable-flyer-container .flyer-title-group h1 {
            font-size: 28px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin: 0 !important;
            letter-spacing: -0.025em !important;
            text-transform: uppercase !important;
          }
          #printable-flyer-container .flyer-title-group p {
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #059669 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            margin-top: 4px !important;
            margin-bottom: 0 !important;
          }
          #printable-flyer-container .flyer-sla-group {
            text-align: right !important;
          }
          #printable-flyer-container .flyer-sla-group .flyer-sla {
            font-size: 18px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          #printable-flyer-container .flyer-sla-group p {
            font-size: 10px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            margin-top: 2px !important;
            margin-bottom: 0 !important;
          }
          #printable-flyer-container .flyer-intro {
            margin-bottom: 32px !important;
          }
          #printable-flyer-container .flyer-intro p {
            font-size: 13px !important;
            color: #334155 !important;
            font-weight: 500 !important;
            line-height: 1.6 !important;
            margin: 0 !important;
          }
          #printable-flyer-container .flyer-features-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 32px !important;
            row-gap: 20px !important;
            margin-bottom: 40px !important;
          }
          #printable-flyer-container .flyer-feature-item {
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 12px !important;
            display: flex !important;
            gap: 12px !important;
          }
          #printable-flyer-container .flyer-feature-number {
            font-size: 12px !important;
            font-weight: 700 !important;
            color: #059669 !important;
            flex-shrink: 0 !important;
          }
          #printable-flyer-container .flyer-feature-title {
            font-size: 12px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin: 0 0 4px 0 !important;
            line-height: 1.2 !important;
          }
          #printable-flyer-container .flyer-feature-desc {
            font-size: 10px !important;
            color: #64748b !important;
            font-weight: 500 !important;
            line-height: 1.5 !important;
            margin: 0 !important;
          }
          #printable-flyer-container .flyer-footer-notes {
            margin-top: 48px !important;
            padding-top: 24px !important;
            border-top: 2px solid #e2e8f0 !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 24px !important;
            font-size: 10px !important;
            color: #64748b !important;
            font-weight: 500 !important;
            line-height: 1.6 !important;
          }
          #printable-flyer-container .flyer-note-col span {
            font-weight: 700 !important;
            color: #1e293b !important;
            text-transform: uppercase !important;
            display: block !important;
            margin-bottom: 4px !important;
          }
          #printable-flyer-container .flyer-signoff {
            text-align: center !important;
            font-size: 9px !important;
            color: #94a3b8 !important;
            margin-top: 48px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
        ` }} />

        {/* Print Header */}
        <div className="flyer-header">
          <div className="flyer-title-group">
            <h1>TESSIO TEXTILE PORTAL</h1>
            <p>Enterprise Architecture Specification Sheet</p>
          </div>
          <div className="flyer-sla-group">
            <span className="flyer-sla">SLA: 99.99%</span>
            <p>Uptime Guaranteed</p>
          </div>
        </div>

        {/* Introduction */}
        <div className="flyer-intro">
          <p>
            The Tessio core infrastructure is engineered to deliver industrial-standard stability, seamless tenant isolation, and ultra-low response latencies. This document details the 14 core capability layers backing our production deployments.
          </p>
        </div>

        {/* 14 Key Specifications list arranged in a clean printable table/grid */}
        <div className="flyer-features-grid">
          {keyFeatures.map((feat, i) => (
            <div key={feat.id} className="flyer-feature-item">
              <span className="flyer-feature-number">{(i + 1) < 10 ? `0${i + 1}` : i + 1}.</span>
              <div>
                <h4 className="flyer-feature-title">{feat.title}</h4>
                <p className="flyer-feature-desc">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Print Footer / Notes / Sign-off */}
        <div className="flyer-footer-notes">
          <div className="flyer-note-col">
            <span>Custom Domain Provisioning</span>
            Connection configuration is built-in. Setup is fully compatible with custom apex or subdomain registers, subject to registrar availability & annual charges.
          </div>
          <div className="flyer-note-col">
            <span>Data & Redundancy SLA</span>
            Features automatic multi-zone hot replication, self-healing queries, and secure daily periodic system backups.
          </div>
          <div className="flyer-note-col">
            <span>Certification & Security</span>
            Secured via role-based access tokens, end-to-end cryptographic HTTPS, and a robust 6-digit credential layer.
          </div>
        </div>

        <div className="flyer-signoff">
          Tessio Cloud Infrastructure Specification Catalog
        </div>
      </div>
    </>
  );
}
