import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import DealerLocationEnforcer from '../components/DealerLocationEnforcer';
import {
  LayoutDashboard,
  Inbox,
  CheckCircle,
  Truck,
  History,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Users
} from 'lucide-react';

export default function DealerLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dealer/dashboard', icon: LayoutDashboard },
    { name: 'New Orders Pool', path: '/dealer/new-orders', icon: Inbox, alert: true },
    { name: 'Accepted Orders', path: '/dealer/accepted', icon: CheckCircle },
    { name: 'Active Deliveries (OTP)', path: '/dealer/active', icon: Truck, highlight: true },
    { name: 'Driver Fleet', path: '/dealer/drivers', icon: Users },
    { name: 'Completed Archive', path: '/dealer/completed', icon: History },
    { name: 'Dealer Profile', path: '/dealer/profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-slate-950 font-black">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-bold text-base font-display text-white">DEALER <span className="text-brand-400">DISPATCH</span></span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/dealer/notifications" className="relative p-2 text-slate-400 hover:text-white">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-brand-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white font-display leading-none block">
                ANANTA <span className="text-brand-400">DEALER</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">
                Fleet & Logistics Hub
              </span>
            </div>
          </div>

          {/* Dealer profile card */}
          <div className="p-4 mx-3 my-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.companyName || user?.name}</div>
            <div className="text-[11px] text-brand-400 font-medium capitalize mt-0.5">
              Authorized Supply Dealer • {user?.mobile}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              Active Partner Status
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20 font-bold'
                      : item.highlight
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-brand-400'}`} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="block text-center text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800/60"
          >
            Public Website
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Dealer Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area with Mandatory Location Enforcement */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DealerLocationEnforcer>
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </DealerLocationEnforcer>
      </div>
    </div>
  );
}
