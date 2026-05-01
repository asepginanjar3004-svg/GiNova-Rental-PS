import React, { useState } from 'react';
import { Search, Plus, Minus, CupSoap, Coffee, Wine, Candy, Utensils, X, LayoutDashboard, Receipt, Package, Users } from 'lucide-react';

const GuestOrderPage = () => {
  const [guestName, setGuestName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});

  const menuItems = [
    { id: 1, name: 'Mie Gelas', category: 'Makanan', price: 5000, stock: 24, icon: <Utensils className="w-6 h-6" /> },
    { id: 2, name: 'Kopi', category: 'Minuman', price: 4000, stock: 15, icon: <Coffee className="w-6 h-6" /> },
    { id: 3, name: 'Air Mineral', category: 'Minuman', price: 3000, stock: 50, icon: <Wine className="w-6 h-6" /> },
    { id: 4, name: 'Permen', category: 'Makanan', price: 500, stock: 100, icon: <Candy className="w-6 h-6" /> },
    { id: 5, name: 'Teh Manis', category: 'Minuman', price: 5000, stock: 30, icon: <CupSoap className="w-6 h-6" /> },
    { id: 6, name: 'Nasi Goreng', category: 'Makanan', price: 15000, stock: 10, icon: <Utensils className="w-6 h-6" /> },
  ];

  const updateQty = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      {/* --- DASHBOARD BACKGROUND (Blurred) --- */}
      <div className="p-6 filter blur-sm">
        {/* Navbar */}
        <nav className="flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="font-bold text-white text-xl">GN</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">GiNova <span className="text-emerald-500 text-sm font-medium">Rental PS</span></h1>
          </div>
          <div className="flex gap-4">
            <LayoutDashboard className="text-emerald-500" />
            <Receipt className="text-slate-400" />
            <Package className="text-slate-400" />
            <Users className="text-slate-400" />
          </div>
        </nav>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <p className="text-slate-400 text-sm uppercase font-semibold">Total Unit PS</p>
            <h2 className="text-4xl font-bold text-white mt-1">6 Unit</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl border-l-4 border-l-emerald-500">
            <p className="text-slate-400 text-sm uppercase font-semibold">Omset Hari Ini</p>
            <h2 className="text-4xl font-bold text-emerald-500 mt-1">Rp 0</h2>
          </div>
        </div>

        {/* Unit List Placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                <span className="text-slate-500 font-bold">PS{i}</span>
              </div>
              <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Tersedia</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL OVERLAY --- */}
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Order Tamu</h2>
                <p className="text-slate-500 text-sm">(Makanan & Minuman)</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Tamu</label>
                <input 
                  type="text" 
                  placeholder="Masukkan nama tamu..."
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Cari menu makanan atau minuman..."
                  className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Body - Menu List */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
            {['Makanan', 'Minuman'].map((category) => (
              <div key={category} className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                    {category}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.filter(i => i.category === category).map((item) => (
                      <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-900 truncate tracking-tight text-base">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-emerald-600 font-bold text-sm">Rp {item.price.toLocaleString()}</span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">Stok: {item.stock}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                          <button 
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                            disabled={!quantities[item.id]}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-slate-900 w-4 text-center">{quantities[item.id] || 0}</span>
                          <button 
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 shadow-sm flex items-center justify-center text-white hover:bg-emerald-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase">Total Estimasi</p>
              <p className="text-2xl font-black text-slate-900">
                Rp {menuItems.reduce((acc, item) => acc + (item.price * (quantities[item.id] || 0)), 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                Batal
              </button>
              <button className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95">
                Konfirmasi Order
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Custom Styles for Animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        .animate-in {
          animation-delay: 0s;
          animation-duration: 300ms;
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default GuestOrderPage;