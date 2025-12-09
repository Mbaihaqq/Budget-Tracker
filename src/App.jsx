import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [balance, setBalance] = useState(0);
  const [expenses, setExpenses] = useState([]);
  
  // --- STATE AUTH ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Input Data (Admin)
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // 1. Cek Session Login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if(session) fetchProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (session) {
      fetchWallet();
      fetchExpenses();
    }
  }, [session, activeTab]);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if(data) setRole(data.role);
  };

  const fetchWallet = async () => {
    const { data } = await supabase.from('wallet').select('current_balance').single();
    if (data) setBalance(data?.current_balance || 0);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
  };

  // --- LOGIKA LOGIN & DAFTAR BARU ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) {
        alert("Gagal Daftar: " + error.message);
      } else {
        alert("Pendaftaran Berhasil! Silakan Login.");
        setIsSignUp(false);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) alert("Gagal Login: " + error.message);
    }
    setLoading(false);
  };

  // --- LOGIKA TAMBAH PENGELUARAN (DENGAN VALIDASI) ---
  const handleAddExpense = async (e) => {
    e.preventDefault();

    // 1. Validasi Input
    const amount = parseInt(newAmount); // Ubah text jadi angka
    if (!amount || amount <= 0) {
      return alert("Nominal harus lebih besar dari 0!");
    }
    if (!newTitle.trim()) {
      return alert("Judul pengeluaran tidak boleh kosong!");
    }

    // 2. Cek Role
    if (role !== 'admin') return alert("Hanya Admin yang boleh!");

    // 3. Simpan ke Database
    const { error } = await supabase.from('expenses').insert([{ title: newTitle, amount: amount }]);
    if (!error) {
      alert("Berhasil disimpan!");
      setNewTitle(''); setNewAmount('');
      fetchWallet(); fetchExpenses();
    } else {
      alert(error.message);
    }
  };

  // --- HALAMAN AUTH (LOGIN / REGISTER) ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">BudgetPWA</h1>
          <p className="text-gray-500 mb-6">
            {isSignUp ? "Daftar Akun Baru" : "Masuk ke Aplikasi"}
          </p>
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input 
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border p-3 rounded-lg focus:outline-emerald-500" required 
            />
            <input 
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg focus:outline-emerald-500" required 
            />
            <button disabled={loading} className="bg-emerald-600 text-white p-3 rounded-lg font-bold hover:bg-emerald-700 transition">
              {loading ? 'Memproses...' : (isSignUp ? 'Daftar Sekarang' : 'Masuk / Login')}
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600">
            {isSignUp ? "Sudah punya akun? " : "Belum punya akun? "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-600 font-bold hover:underline">
              {isSignUp ? "Login disini" : "Daftar disini"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800">
      <Navbar role={role} onLogout={() => supabase.auth.signOut()} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 mb-20 md:mb-0 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-3xl text-white shadow-lg mb-8">
              <p className="opacity-90 font-medium">Sisa Uang Tunai</p>
              <h2 className="text-4xl md:text-5xl font-bold mt-2">Rp {parseInt(balance).toLocaleString('id-ID')}</h2>
              <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                Status: {role === 'admin' ? '👑 Administrator' : '👤 User Viewer'}
              </div>
            </div>

            {role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Tambah Pengeluaran</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    type="text" placeholder="Untuk apa?" className="border p-3 rounded-xl bg-gray-50" 
                    value={newTitle} onChange={e => setNewTitle(e.target.value)} required 
                  />
                  <input 
                    type="number" 
                    placeholder="Nominal (Rp)" 
                    className="border p-3 rounded-xl bg-gray-50" 
                    value={newAmount} 
                    onChange={e => setNewAmount(e.target.value)} 
                    min="1" // Mencegah input negatif di UI
                    required 
                  />
                  <button className="bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg">
                    Simpan
                  </button>
                </form>
              </div>
            )}

            <h3 className="font-bold text-gray-700 mb-4 text-lg">Riwayat Pengeluaran</h3>
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-red-400">
                  <div>
                    <p className="font-bold text-gray-800">{exp.title}</p>
                    <p className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleDateString('id-ID')}</p>
                    {role === 'user' && <button onClick={() => setActiveTab('comments')} className="text-xs text-emerald-600 font-semibold mt-1">Beri Komentar</button>}
                  </div>
                  <span className="text-red-500 font-bold text-lg">- Rp {parseInt(exp.amount).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab !== 'dashboard' && (
           <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-20">
             <p className="text-xl font-bold">Halaman {activeTab.toUpperCase()}</p>
             <p>Fitur {activeTab} akan muncul di sini.</p>
           </div>
        )}
      </main>
    </div>
  );
}