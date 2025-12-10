import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import WalletTab from './components/WalletTab';
import ExpensesTab from './components/ExpensesTab';
import SettingsTab from './components/SettingsTab';
import ExpenseDetailModal from './components/ExpenseDetailModal';
// [UPDATE] Import icon panah untuk indikator masuk/keluar
import { Trash2, Send, Eye, EyeOff, User, Lock, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [usernameDisplay, setUsernameDisplay] = useState(''); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [balance, setBalance] = useState(0);
  
  // Data Lists
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]); // [BARU] State untuk Pemasukkan di Dashboard
  
  // State Auth
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State Form Input
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // State Komentar & Modal
  const [selectedExpense, setSelectedExpense] = useState(null); 
  const [detailExpense, setDetailExpense] = useState(null);
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState(''); 

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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

  // [UPDATE] Fetch Incomes juga saat dashboard dimuat
  useEffect(() => {
    if (session) {
      fetchWallet();
      fetchExpenses();
      fetchIncomes(); // <--- Panggil ini
    }
  }, [session, activeTab]); 

  useEffect(() => {
    if (selectedExpense) fetchComments(selectedExpense.id);
  }, [selectedExpense]);

  // --- FUNGSI API ---
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('role, username, email').eq('id', userId).single();
    if(data) {
      setRole(data.role);
      setUsernameDisplay(data.username || data.email.split('@')[0]);
    }
  };
  const fetchWallet = async () => {
    const { data } = await supabase.from('wallet').select('current_balance').single();
    if (data) setBalance(data?.current_balance || 0);
  };
  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
  };
  // [BARU] Fungsi Fetch Incomes
  const fetchIncomes = async () => {
    const { data } = await supabase.from('incomes').select('*').order('created_at', { ascending: false });
    if (data) setIncomes(data);
  };
  
  const fetchComments = async (expenseId) => {
    const { data } = await supabase
      .from('comments')
      .select(`*, profiles ( username, email, avatar_url )`) 
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  // --- LOGIKA AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const emailToUse = `${usernameInput}@budget.app`; 

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: emailToUse,
          password: password,
          options: { data: { username: usernameInput } }
        });
        if (error) throw error;
        alert("Pendaftaran Berhasil! Silakan Login.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA TRANSAKSI ---
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) return alert("Nominal harus > 0!");
    if (!newTitle.trim()) return alert("Judul wajib diisi!");
    
    if (amount > balance) {
      return alert("Saldo tidak cukup! Transaksi dibatalkan.");
    }

    if (role !== 'admin') return alert("Akses ditolak!");

    try {
      setUploading(true);
      let uploadedImageUrl = null;
      if (imageFile) {
        const fileName = `${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from('receipts').upload(fileName, imageFile);
        const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
        uploadedImageUrl = data.publicUrl;
      }
      await supabase.from('expenses').insert([{ title: newTitle, amount: amount, image_url: uploadedImageUrl }]);
      
      alert("Disimpan!"); 
      setNewTitle(''); setNewAmount(''); setImageFile(null); 
      fetchWallet(); fetchExpenses();
    } catch (err) { 
      alert(err.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleDeleteExpense = async (id, e) => {
    e.stopPropagation();
    if (role !== 'admin' || !confirm("Hapus data ini?")) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchWallet(); fetchExpenses();
  };

  // [BARU] Hapus Income dari Dashboard (Khusus Admin)
  const handleDeleteIncome = async (id) => {
    if (role !== 'admin') return;
    if (!confirm("Hapus pemasukkan ini? Saldo akan berkurang.")) return;
    await supabase.from('incomes').delete().eq('id', id);
    fetchWallet(); fetchIncomes();
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await supabase.from('comments').insert([{ expense_id: selectedExpense.id, user_id: session.user.id, content: newComment }]);
    setNewComment(''); fetchComments(selectedExpense.id);
  };

  // --- HALAMAN LOGIN ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-600 to-teal-900">
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner"><Wallet size={32} /></div>
            <h1 className="text-3xl font-bold text-slate-800">Budget Tracker</h1>
            <p className="text-slate-500 text-sm mt-2">Total Pemasukkan & Pengeluaran Baihaqi</p>
          </div>
          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><User size={20} /></div>
              <input type="text" placeholder="Username" value={usernameInput} onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" required />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={20} /></div>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            <button disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition transform active:scale-95 disabled:opacity-70">{loading ? 'Memproses...' : (isSignUp ? 'Daftar Akun Baru' : 'Masuk Sekarang')}</button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">{isSignUp ? "Sudah punya akun? " : "Belum punya akun? "}
              <button onClick={() => { setIsSignUp(!isSignUp); setUsernameInput(''); setPassword(''); }} className="text-emerald-600 font-bold hover:underline ml-1">{isSignUp ? "Login disini" : "Daftar disini"}</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- TAMPILAN UTAMA ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-slate-800 dark:text-gray-200 transition-colors duration-300">
      <Navbar role={role} onLogout={() => supabase.auth.signOut()} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 mb-20 md:mb-0 overflow-y-auto">
        
        {/* === TAB DASHBOARD === */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            
            {/* Header Saldo */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-3xl text-white shadow-lg mb-8 relative overflow-hidden">
              <div className="relative z-10">
                <p className="opacity-90">Halo, <span className="font-bold text-yellow-300">{usernameDisplay}</span></p>
                <h2 className="text-4xl font-bold mt-2">Rp {parseInt(balance).toLocaleString('id-ID')}</h2>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs mt-4 inline-block">{role === 'admin' ? '👑 Admin' : '👤 User'}</span>
              </div>
            </div>

            {/* Form Input Expense (Admin Only) */}
            {role === 'admin' && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm mb-8 dark:border-slate-700">
                <h3 className="font-bold mb-4 dark:text-white">Tambah Pengeluaran</h3>
                <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Judul" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="border p-2 rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600" required />
                    <input type="number" placeholder="Rp" value={newAmount} onChange={e => setNewAmount(e.target.value)} min="1" className="border p-2 rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600" required />
                  </div>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="text-sm text-slate-500 dark:text-slate-400" />
                  <button disabled={uploading} className="bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg font-bold">{uploading ? 'Upload...' : 'Simpan'}</button>
                </form>
              </div>
            )}

            {/* --- GRID LAYOUT: KIRI (PENGELUARAN) & KANAN (PEMASUKKAN) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Kolom 1: Pengeluaran Terbaru */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                  <ArrowUpRight className="text-red-500" /> Pengeluaran Terbaru
                </h3>
                <div className="space-y-3">
                  {expenses.length === 0 && <p className="text-gray-400 text-sm italic">Belum ada pengeluaran.</p>}
                  {expenses.slice(0, 5).map((exp) => (
                    <div 
                      key={exp.id} 
                      onClick={() => setDetailExpense(exp)} 
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex justify-between items-start border-l-4 border-red-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <div className="flex gap-3">
                        {exp.image_url ? <img src={exp.image_url} className="w-10 h-10 rounded object-cover border" alt="struk" /> : <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center text-xs text-gray-400">No img</div>}
                        <div>
                          <p className="font-bold dark:text-white text-sm">{exp.title}</p>
                          <p className="text-[10px] text-gray-400">{new Date(exp.created_at).toLocaleDateString()}</p>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedExpense(exp); setActiveTab('comments');}} className="text-[10px] text-emerald-500 font-bold mt-1 hover:underline">💬 Komentar</button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold text-sm">- Rp {parseInt(exp.amount).toLocaleString('id-ID')}</p>
                        {role === 'admin' && <button onClick={(e) => handleDeleteExpense(exp.id, e)} className="text-gray-400 hover:text-red-500 mt-1 p-1"><Trash2 size={14}/></button>}
                      </div>
                    </div>
                  ))}
                  {/* Tombol Lihat Semua jika data banyak */}
                  {expenses.length > 5 && (
                    <button onClick={() => setActiveTab('expenses')} className="w-full py-2 text-xs text-center text-gray-500 hover:text-emerald-600 bg-gray-100 dark:bg-slate-800 rounded-lg">Lihat Semua Pengeluaran</button>
                  )}
                </div>
              </div>

              {/* Kolom 2: Pemasukkan Terbaru (BARU) */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                  <ArrowDownLeft className="text-emerald-500" /> Pemasukkan Terbaru
                </h3>
                <div className="space-y-3">
                  {incomes.length === 0 && <p className="text-gray-400 text-sm italic">Belum ada pemasukkan.</p>}
                  {incomes.slice(0, 5).map((inc) => (
                    <div 
                      key={inc.id} 
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <div>
                        <p className="font-bold dark:text-white text-sm">{inc.source}</p>
                        <p className="text-[10px] text-gray-400">{new Date(inc.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold text-sm">+ Rp {parseInt(inc.amount).toLocaleString('id-ID')}</span>
                        {role === 'admin' && (
                          <button onClick={() => handleDeleteIncome(inc.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Tombol Lihat Semua ke Wallet Tab */}
                  {incomes.length > 5 && (
                    <button onClick={() => setActiveTab('wallet')} className="w-full py-2 text-xs text-center text-gray-500 hover:text-emerald-600 bg-gray-100 dark:bg-slate-800 rounded-lg">Lihat Semua Pemasukkan</button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'wallet' && <WalletTab role={role} fetchWallet={fetchWallet} balance={balance} />}
        {activeTab === 'expenses' && <ExpensesTab expenses={expenses} />}
        {activeTab === 'settings' && <SettingsTab session={session} role={role} darkMode={darkMode} setDarkMode={setDarkMode} />}

        {/* --- COMMENTS TAB --- */}
        {activeTab === 'comments' && (
          <div className="max-w-md mx-auto h-[80vh] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border dark:border-slate-700">
            <div className="bg-slate-100 dark:bg-slate-900 p-4 border-b flex justify-between items-center dark:border-slate-700">
              <div>
                <h3 className="font-bold dark:text-white text-sm">Komentar</h3>
                <p className="text-xs text-emerald-600 font-medium truncate w-40">{selectedExpense?.title}</p>
              </div>
              <button onClick={() => setActiveTab('dashboard')} className="text-xs text-blue-500 hover:underline">Kembali</button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-slate-900">
              {comments.map((chat) => {
                const isMe = chat.user_id === session.user.id;
                return (
                  <div key={chat.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-slate-200 shadow-sm mt-1">
                        {chat.profiles?.avatar_url ? (
                          <img src={chat.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 font-bold bg-emerald-100">
                            {chat.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                          isMe 
                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-700 dark:text-white border border-slate-100 rounded-tl-none'
                        }`}>
                          <p>{chat.content}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {chat.profiles?.username || 'User'} • {new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedExpense && (
              <form onSubmit={handleSendComment} className="p-3 border-t bg-white dark:bg-slate-800 dark:border-slate-700 flex gap-2">
                <input type="text" placeholder="Tulis..." value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1 border rounded-full px-4 py-2 text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-emerald-500" />
                <button className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition shadow-md"><Send size={18} /></button>
              </form>
            )}
          </div>
        )}

        <ExpenseDetailModal isOpen={!!detailExpense} onClose={() => setDetailExpense(null)} expense={detailExpense} />
      </main>
    </div>
  );
}