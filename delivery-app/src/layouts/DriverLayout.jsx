import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Navigation, CheckCircle2, User, LogOut } from 'lucide-react';

export default function DriverLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/driver/dashboard', icon: Truck },
    { name: 'My Tasks', path: '/driver/deliveries', icon: Navigation },
    { name: 'Profile', path: '/driver/profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white font-display leading-none block">
                ANANTA <span className="text-emerald-400">DRIVER</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {user?.vehicleNumber || 'Fleet Vehicle'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              Driver: <span className="text-emerald-400 font-bold">{user?.name}</span>
            </span>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main key={location.pathname} className="max-w-5xl mx-auto w-full p-4 md:p-6 flex-1 animate-page-in">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg z-40 py-2 px-6 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

