import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  Boxes,
  FileSpreadsheet,
  Truck,
  FileBarChart,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Coins,
  Route as RouteIcon
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Command Center', path: '/dashboard', icon: LayoutDashboard },
    { name: "Today's Orders", path: '/todays-orders', icon: Clock, highlight: true },
    { name: 'All Orders Master', path: '/orders', icon: FileSpreadsheet },
    { name: 'Dealer Network', path: '/dealers', icon: Building2 },
    { name: 'Fleet Drivers', path: '/drivers', icon: Truck },
    { name: 'Customer Directory', path: '/customers', icon: Users },
    { name: 'Materials & Pricing', path: '/products', icon: Coins },
    { name: 'Sourcing Locations', path: '/locations', icon: Boxes },
    { name: 'Dealer Transport Rates', path: '/dealer-transport-rates', icon: RouteIcon },
    { name: 'Vehicle & Fleet Management', path: '/vehicles', icon: Truck },
    { name: 'Delivery Radar & OTP', path: '/deliveries', icon: ShieldAlert },
    { name: 'Reports & Analytics', path: '/reports', icon: FileBarChart },
    { name: 'Profile & Security', path: '/profile', icon: ShieldCheck }
  ];

  const isRootPage = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      {/* Mobile Top Navbar */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {!isRootPage && (
            <Link
              to="/dashboard"
              className="p-2 -ml-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-90 transition-all"
              aria-label="Back to admin dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-sm font-display text-white block leading-none">
                ADMIN <span className="text-amber-400">HQ</span>
              </span>
              <span className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider block mt-0.5">
                Executive Control
              </span>
            </div>
          </Link>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-95 transition-all"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900/95 md:bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80 hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-black text-white font-display leading-none block">
                ANANTA <span className="text-amber-400">ADMIN</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider block mt-1">
                Executive Control Hub
              </span>
            </div>
          </div>

          {/* Admin profile card */}
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="block p-4 mx-4 my-4 bg-gradient-to-br from-slate-950 to-slate-900/90 rounded-2xl border border-slate-800 shadow-md transition-all group hover:border-amber-500/40"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-white group-hover:text-amber-400 truncate font-display">
                {user?.name || 'Super Admin'}
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black uppercase">
                HQ
              </span>
            </div>
            <div className="text-[11px] text-amber-400/80 font-mono font-medium mt-1">
              {user?.mobile || '9876543210'}
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="px-4 space-y-1 pb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                      : item.highlight
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
