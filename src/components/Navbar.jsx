import React from 'react';
import { Home, Wallet, List, MessageSquare, Settings, LogOut } from 'lucide-react';

const Navbar = ({ role, onLogout, activeTab, setActiveTab }) => {
  // 5 Menu Items
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <Home size={20} /> },
    { id: 'wallet', name: 'Wallet', icon: <Wallet size={20} /> },
    { id: 'expenses', name: 'Expenses', icon: <List size={20} /> },
    { id: 'comments', name: 'Comments', icon: <MessageSquare size={20} /> },
    { id: 'settings', name: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* === DESKTOP VIEW (SIDEBAR KIRI) === */}
      <div className="hidden md:flex flex-col w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 p-4">
        <h1 className="text-2xl font-bold mb-8 text-emerald-400 px-2">BudgetApp</h1>
        <div className="flex flex-col gap-2 flex-1">
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${activeTab === item.id ? 'bg-emerald-600' : 'hover:bg-slate-800'}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2 px-2">Role: {role?.toUpperCase()}</p>
            <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 px-2">
                <LogOut size={16}/> Logout
            </button>
        </div>
      </div>

      {/* === MOBILE VIEW (BOTTOM BAR) === */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center px-6 py-3">
            {menuItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center ${activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                    {item.icon}
                    {/* Tampilkan label hanya jika aktif agar rapi di HP */}
                    {activeTab === item.id && <span className="text-[10px] mt-1 font-bold">{item.name}</span>}
                </button>
            ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;