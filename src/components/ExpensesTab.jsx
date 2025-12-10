import React, { useState } from 'react';
import ExpenseDetailModal from './ExpenseDetailModal'; // Import Modal

export default function ExpensesTab({ expenses }) {
  const [selectedExp, setSelectedExp] = useState(null); // State Lokal untuk modal

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Daftar Semua Pengeluaran</h2>
      
      <div className="space-y-3">
        {expenses.length === 0 && <p className="text-gray-400">Belum ada data.</p>}
        
        {expenses.map((exp) => (
          <div 
            key={exp.id} 
            onClick={() => setSelectedExp(exp)} // Tambahkan OnClick
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border flex justify-between items-center dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex gap-3 items-center">
               {exp.image_url ? (
                  <img src={exp.image_url} className="w-10 h-10 rounded object-cover" alt="img"/>
               ) : <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs">No Img</div>}
               <div>
                 <p className="font-bold dark:text-white">{exp.title}</p>
                 <p className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleString()}</p>
               </div>
            </div>
            <span className="text-red-500 font-bold">- Rp {parseInt(exp.amount).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>

      {/* Render Modal */}
      <ExpenseDetailModal 
        isOpen={!!selectedExp} 
        onClose={() => setSelectedExp(null)} 
        expense={selectedExp} 
      />
    </div>
  );
}