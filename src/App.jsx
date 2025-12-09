import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import { Trash2 } from 'lucide-react'; // Import icon tempat sampah

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

  // --- STATE FORM INPUT (Admin) ---
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [imageFile, setImageFile] = useState(null); // State untuk file gambar
  const [uploading, setUploading] = useState(false); // Loading upload gambar

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

  // --- LOGIKA TAMBAH PENGELUARAN (+ GAMBAR) ---
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) return alert("Nominal harus > 0!");
    if (!newTitle.trim()) return alert("Judul wajib diisi!");
    if (role !== 'admin') return alert("Akses ditolak!");

    try {
      setUploading(true);
      let uploadedImageUrl = null;

      // 1. Proses Upload Gambar (Jika ada)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; // Nama file unik pakai timestamp
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts') // Nama bucket yang kita buat tadi
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Dapatkan URL publik gambar
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        
        uploadedImageUrl = urlData.publicUrl;
      }

      // 2. Simpan Data ke Database
      const { error: insertError } = await supabase
        .from('expenses')
        .insert([{ 
          title: newTitle, 
          amount: amount,
          image_url: uploadedImageUrl // Masukkan URL gambar
        }]);
      
      if (insertError) throw insertError;

      alert("Berhasil disimpan!");
      // Reset Form
      setNewTitle(''); setNewAmount(''); setImageFile(null);
      // Refresh Data
      fetchWallet(); fetchExpenses();

    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- LOGIKA HAPUS PENGELUARAN (BARU) ---
  const handleDeleteExpense = async (id) => {
    if (role !== 'admin') return;
    if (!window.confirm("Yakin ingin menghapus? Saldo akan dikembalikan.")) return;

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      // Trigger SQL di Supabase akan otomatis mengembalikan saldo.
      // Kita hanya perlu refresh tampilan di sini.
      fetchWallet(); 
      fetchExpenses();
    }
  };

  // --- HELPER: Format Tanggal ---
  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // --- TAMPILAN LOGIN ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">BudgetPWA</h1>
          <p className="text-gray-500 mb-6">{isSignUp ? "Daftar Akun Baru" : "Masuk ke Aplikasi"}</p>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border p-3 rounded-lg" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border p-3 rounded-lg" required />
            <button disabled={loading} className="bg-emerald-600 text-white p-3 rounded-lg font-bold hover:bg-emerald-700 transition">
              {loading ? 'Memproses...' : (isSignUp ? 'Daftar Sekarang' : 'Masuk / Login')}
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600">
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
            {/* Kartu Saldo */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-3xl text-white shadow-lg mb-8">
              <p className="opacity-90 font-medium">Sisa Uang Tunai</p>
              <h2 className="text-4xl md:text-5xl font-bold mt-2">Rp {parseInt(balance).toLocaleString('id-ID')}</h2>
              <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                Status: {role === 'admin' ? '👑 Administrator' : '👤 User Viewer'}
              </div>
            </div>

            {/* Form Input Khusus Admin (+ Upload Gambar) */}
            {role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Tambah Pengeluaran</h3>
                <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" placeholder="Untuk apa?" className="border p-3 rounded-xl bg-gray-50" 
                      value={newTitle} onChange={e => setNewTitle(e.target.value)} required 
                    />
                    <input 
                      type="number" placeholder="Nominal (Rp)" className="border p-3 rounded-xl bg-gray-50" 
                      value={newAmount} onChange={e => setNewAmount(e.target.value)} min="1" required 
                    />
                  </div>
                  {/* Input File Gambar */}
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setImageFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                  <button disabled={uploading} className="bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg disabled:opacity-50">
                    {uploading ? 'Mengupload...' : 'Simpan Pengeluaran'}
                  </button>
                </form>
              </div>
            )}

            {/* List Pengeluaran (Update Tampilan) */}
            <h3 className="font-bold text-gray-700 mb-4 text-lg">Riwayat Pengeluaran</h3>
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-start border-l-4 border-red-400">
                  
                  {/* Bagian Kiri: Gambar & Info */}
                  <div className="flex gap-3 items-start">
                    {/* Thumbnail Gambar (Jika ada) */}
                    {exp.image_url ? (
                      <a href={exp.image_url} target="_blank" rel="noreferrer">
                        <img src={exp.image_url} alt="struk" className="w-16 h-16 object-cover rounded-lg border hover:opacity-80 transition" />
                      </a>
                    ) : (
                       <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                    
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{exp.title}</p>
                      {/* Menampilkan Tanggal dengan Format Rapi */}
                      <p className="text-xs text-gray-500 mt-1">{formatDate(exp.created_at)}</p>
                      {role === 'user' && <button onClick={() => setActiveTab('comments')} className="text-xs text-emerald-600 font-semibold mt-1">Beri Komentar</button>}
                    </div>
                  </div>

                  {/* Bagian Kanan: Nominal & Tombol Hapus */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-red-500 font-bold text-lg">- Rp {parseInt(exp.amount).toLocaleString('id-ID')}</span>
                    
                    {/* Tombol Hapus (Khusus Admin) */}
                    {role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

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