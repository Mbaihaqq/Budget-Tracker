import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, Wallet } from 'lucide-react';

// [UBAH] Tambahkan 'balance' di sini agar bisa diterima dari App.jsx
export default function WalletTab({ role, fetchWallet, balance }) {
  const [incomes, setIncomes] = useState([]);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    const { data } = await supabase.from('incomes').select('*').order('created_at', { ascending: false });
    if (data) setIncomes(data);
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (role !== 'admin') return alert("Hanya Admin yang bisa tambah saldo!");
    
    setLoading(true);
    const { error } = await supabase.from('incomes').insert([{ source, amount: parseInt(amount) }]);
    if (error) {
      alert(error.message);
    } else {
      setSource(''); setAmount('');
      fetchIncomes();
      fetchWallet(); // Update saldo di App.jsx
      alert("Saldo berhasil ditambahkan!");
    }
    setLoading(false);
  };

  const handleDeleteIncome = async (id) => {
    if (role !== 'admin') return;
    if (!confirm("Hapus riwayat pemasukkan ini? Saldo akan otomatis berkurang.")) return;

    const { error } = await supabase.from('incomes').delete().eq('id', id);
    
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      fetchIncomes();
      fetchWallet();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* [BARU] Header: Tampilkan Saldo Total */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Wallet className="text-emerald-500"/> Dompet & Pemasukkan
          </h2>
          <p className="text-gray-500 text-sm mt-1">Ini Adalah Total Saldo Saat Ini</p>
        </div>
        <div className="text-right bg-emerald-50 dark:bg-slate-900 px-6 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Saldo Aktif</p>
          <p className="text-3xl font-extrabold text-emerald-600">
            Rp {parseInt(balance).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Form Tambah Saldo (Admin Only) */}
      {role === 'admin' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
          <h3 className="font-bold mb-4 dark:text-white">Tambah Pemasukkan (Top Up)</h3>
          <form onSubmit={handleAddIncome} className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" placeholder="Sumber Dana (Gaji, Bonus)" 
              value={source} onChange={e => setSource(e.target.value)}
              className="flex-1 p-3 border rounded-xl dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-emerald-500" required 
            />
            <div className="flex gap-2">
              <input 
                type="number" placeholder="Nominal" 
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full md:w-48 p-3 border rounded-xl dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-emerald-500" required min="1"
              />
              <button disabled={loading} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition">
                {loading ? '...' : '+ Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Pemasukkan */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 dark:text-gray-300">Riwayat Pemasukkan</h3>
        {incomes.length === 0 && <p className="text-gray-400 italic">Belum ada data pemasukkan.</p>}
        
        {incomes.map((inc) => (
          <div key={inc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 flex justify-between items-center transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <div>
              <p className="font-bold dark:text-white">{inc.source}</p>
              <p className="text-xs text-gray-400">{new Date(inc.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 font-bold text-lg">+ Rp {parseInt(inc.amount).toLocaleString('id-ID')}</span>
              
              {role === 'admin' && (
                <button 
                  onClick={() => handleDeleteIncome(inc.id)}
                  className="text-gray-400 hover:text-red-500 transition p-2 bg-gray-100 dark:bg-slate-700 rounded-full"
                  title="Hapus Pemasukkan"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}