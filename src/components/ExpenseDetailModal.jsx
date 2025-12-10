import React from 'react';
import { X, Calendar, User, DollarSign, Image as ImageIcon } from 'lucide-react';

export default function ExpenseDetailModal({ isOpen, onClose, expense }) {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Kartu Modal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-700 transform transition-all scale-100">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Detail Pengeluaran</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition">
            <X size={20} className="text-slate-500 dark:text-white" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-6 space-y-6">
          
          {/* Judul & Nominal */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{expense.title}</h2>
            <p className="text-3xl font-extrabold text-red-500">- Rp {parseInt(expense.amount).toLocaleString('id-ID')}</p>
          </div>

          {/* Grid Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex items-center gap-3">
              <Calendar className="text-emerald-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">Tanggal</p>
                <p className="text-sm font-semibold dark:text-gray-200">
                  {new Date(expense.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex items-center gap-3">
              <User className="text-blue-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">Jam Input</p>
                <p className="text-sm font-semibold dark:text-gray-200">
                  {new Date(expense.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              </div>
            </div>
          </div>

          {/* Bagian Gambar (Struk) */}
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
              <ImageIcon size={16}/> Bukti Struk / Foto
            </p>
            {expense.image_url ? (
              <div className="relative group rounded-xl overflow-hidden border dark:border-slate-600">
                <img 
                  src={expense.image_url} 
                  alt="Bukti Struk" 
                  className="w-full h-64 object-cover"
                />
                {/* Overlay Klik untuk Memperbesar */}
                <a 
                  href={expense.image_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer"
                >
                  <span className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg transform scale-95 group-hover:scale-100 transition">
                    🔍 Buka Gambar Full
                  </span>
                </a>
              </div>
            ) : (
              <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Tidak ada gambar dilampirkan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}