import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import { Trash2, Send } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [balance, setBalance] = useState(0);
  const [expenses, setExpenses] = useState([]);
  
  // State Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // State Form Input (Admin)
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- STATE BARU UNTUK KOMENTAR ---
  const [selectedExpense, setSelectedExpense] = useState(null); // Pengeluaran mana yang lagi dikomentari
  const [comments, setComments] = useState([]); // List komentar
  const [newComment, setNewComment] = useState(''); // Text input komentar

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

  // 2. Fetch Data Utama
  useEffect(() => {
    if (session) {
      fetchWallet();
      fetchExpenses();
    }
  }, [session, activeTab]); // Refresh saat tab ganti

  // 3. Fetch Komentar (Jalan otomatis saat selectedExpense berubah)
  useEffect(() => {
    if (selectedExpense) {
      fetchComments(selectedExpense.id);
    }
  }, [selectedExpense]);

  // --- FUNGSI API ---
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

  const fetchComments = async (expenseId) => {
    // Ambil komentar beserta email pengirimnya (Join tabel profiles)
    // Pastikan tabel profiles dan foreign key sudah benar. Jika error, kita ambil basic dulu.
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles ( email )
      `)
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });
    
    if (error) console.error("Error fetch comments:", error);
    else setComments(data || []);
  };

  // --- LOGIKA AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else { alert("Berhasil! Silakan Login."); setIsSignUp(false); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  // --- LOGIKA UTAMA ---
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) return alert("Nominal harus > 0!");
    if (!newTitle.trim()) return alert("Judul wajib diisi!");
    if (role !== 'admin') return alert("Akses ditolak!");

    try {
      setUploading(true);
      let uploadedImageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        uploadedImageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('expenses').insert([{ title: newTitle, amount: amount, image_url: uploadedImageUrl }]);
      if (error) throw error;

      alert("Disimpan!");
      setNewTitle(''); setNewAmount(''); setImageFile(null);
      fetchWallet(); fetchExpenses();
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (role !== 'admin') return;
    if (!window.confirm("Hapus data ini?")) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchWallet(); fetchExpenses();
  };

  // --- LOGIKA KOMENTAR ---
  const openCommentSection = (expense) => {
    setSelectedExpense(expense); // Set pengeluaran yang dipilih
    setActiveTab('comments'); // Pindah ke tab komentar
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const { error } = await supabase.from('comments').insert([{
      expense_id: selectedExpense.id,
      user_id: session.user.id,
      content: newComment
    }]);

    if (error) {
      alert("Gagal kirim komentar: " + error.message);
    } else {
      setNewComment('');
      fetchComments(selectedExpense.id); // Refresh chat
    }
  };

  // --- HELPER ---
  const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'});

  // --- LOGIN PAGE ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">BudgetPWA</h1>
          <form onSubmit={handleAuth} className="flex flex-col gap-4 mt-6">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border p-3 rounded-lg" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border p-3 rounded-lg" required />
            <button disabled={loading} className="bg-emerald-600 text-white p-3 rounded-lg font-bold">{loading ? '...' : (isSignUp ? 'Daftar' : 'Login')}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-600 text-sm mt-4 font-bold">{isSignUp ? "Login disini" : "Daftar disini"}</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800">
      <Navbar role={role} onLogout={() => supabase.auth.signOut()} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 mb-20 md:mb-0 overflow-y-auto">
        
        {/* === TAB DASHBOARD === */}
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-3xl text-white shadow-lg mb-8">
              <p className="opacity-90">Sisa Uang Tunai</p>
              <h2 className="text-4xl font-bold mt-2">Rp {parseInt(balance).toLocaleString('id-ID')}</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs mt-4 inline-block">{role === 'admin' ? '👑 Admin' : '👤 User'}</span>
            </div>

            {role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
                <h3 className="font-bold mb-4">Tambah Pengeluaran</h3>
                <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Judul" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="border p-2 rounded-lg" required />
                    <input type="number" placeholder="Rp" value={newAmount} onChange={e => setNewAmount(e.target.value)} min="1" className="border p-2 rounded-lg" required />
                  </div>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="text-sm text-slate-500" />
                  <button disabled={uploading} className="bg-slate-900 text-white py-2 rounded-lg font-bold">{uploading ? 'Upload...' : 'Simpan'}</button>
                </form>
              </div>
            )}

            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-start border-l-4 border-emerald-400">
                  <div className="flex gap-3">
                    {exp.image_url ? (
                      <img src={exp.image_url} className="w-12 h-12 rounded object-cover border" alt="struk" />
                    ) : <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No img</div>}
                    <div>
                      <p className="font-bold">{exp.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(exp.created_at)}</p>
                      {/* TOMBOL UNTUK BUKA KOMENTAR */}
                      <button onClick={() => openCommentSection(exp)} className="text-xs text-emerald-600 font-bold mt-1 hover:underline">
                        💬 Lihat / Balas Komentar
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-500 font-bold">- Rp {parseInt(exp.amount).toLocaleString('id-ID')}</p>
                    {role === 'admin' && <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500 mt-1"><Trash2 size={16}/></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === TAB COMMENTS (FITUR BARU) === */}
        {activeTab === 'comments' && (
          <div className="max-w-md mx-auto h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border">
            {/* Header Chat */}
            <div className="bg-slate-100 p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700">Komentar</h3>
                {selectedExpense ? (
                   <p className="text-xs text-emerald-600 font-semibold">Topik: {selectedExpense.title}</p>
                ) : (
                   <p className="text-xs text-red-500">Silakan pilih pengeluaran di Dashboard dulu</p>
                )}
              </div>
              <button onClick={() => setActiveTab('dashboard')} className="text-xs text-blue-500 underline">Kembali</button>
            </div>

            {/* Isi Chat */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
              {!selectedExpense && <div className="text-center text-gray-400 mt-10">Pilih "Lihat Komentar" pada salah satu pengeluaran di Dashboard.</div>}
              
              {selectedExpense && comments.length === 0 && (
                <div className="text-center text-gray-400 mt-10 text-sm">Belum ada komentar. Mulailah percakapan!</div>
              )}

              {comments.map((chat) => (
                <div key={chat.id} className={`flex flex-col ${chat.user_id === session.user.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${chat.user_id === session.user.id ? 'bg-emerald-100 text-emerald-900 rounded-tr-none' : 'bg-white border text-gray-700 rounded-tl-none'}`}>
                    <p>{chat.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {chat.profiles?.email?.split('@')[0] || 'User'} • {new Date(chat.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Chat */}
            {selectedExpense && (
              <form onSubmit={handleSendComment} className="p-3 border-t bg-white flex gap-2">
                <input 
                  type="text" 
                  placeholder="Tulis komentar..." 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-emerald-500"
                />
                <button className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition">
                  <Send size={18} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* === TAB WALLET / SETTINGS (Placeholder agar Navbar terasa hidup) === */}
        {(activeTab === 'wallet' || activeTab === 'settings') && (
           <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-10">
             <div className="text-6xl mb-4">{activeTab === 'wallet' ? '💰' : '⚙️'}</div>
             <p className="text-xl font-bold capitalize">{activeTab}</p>
             <p className="text-sm">Fitur ini belum diimplementasikan sepenuhnya.</p>
             <button onClick={() => setActiveTab('dashboard')} className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">Kembali ke Dashboard</button>
           </div>
        )}

      </main>
    </div>
  );
}