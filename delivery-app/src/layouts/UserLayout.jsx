import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  LayoutGrid,
  PlusCircle,
  Package,
  Bell,
  User,
  LogOut,
  Truck,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MapPin,
  FileText,
  PhoneCall,
  Navigation,
  Plus
} from 'lucide-react';

export default function UserLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
    { name: 'Order Material', path: '/user/create-order', icon: PlusCircle, highlight: true },
    { name: 'My Orders', path: '/user/orders', icon: Package },
    { name: 'Notifications', path: '/user/notifications', icon: Bell, badge: unreadCount },
    { name: 'GST & Profile', path: '/user/profile', icon: User }
  ];

  // Detect if on subpage to show Android-like back button on mobile
  const isRootPage = location.pathname === '/user/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-amber-500/20 selection:text-amber-900 pb-28 md:pb-0">
      {/* Mobile Sticky Top App Bar (Matching Screenshot Exactly) */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        {/* Left: Orange Rounded Square + Branding */}
        <Link to="/user/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs font-display text-slate-900 tracking-tight leading-none truncate">
                ANANTA TRADERS
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 text-[9px] font-bold leading-none shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                PRO
              </span>
            </div>
            <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider block mt-0.5 leading-none">
              CONTRACTOR PORTAL
            </span>
          </div>
        </Link>

        {/* Right Controls: Location Pill, Bell, Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Location Pill Selector */}
          <div className="bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-slate-700 flex items-center gap-1 border border-slate-200/60 shadow-2xs cursor-pointer">
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="max-w-[75px] truncate font-medium">{user?.companyName || user?.city || 'Arise Ananta'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </div>

          {/* Notifications Bell Button */}
          <Link
            to="/user/notifications"
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border border-white" />
          </Link>

          {/* User Profile Avatar */}
          <Link
            to="/user/profile"
            className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-800 shadow-sm shrink-0 uppercase"
            aria-label="Profile"
          >
            {user?.name ? user.name.charAt(0) : 'P'}
          </Link>
        </div>
      </div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900/95 md:bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80 hidden md:flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base font-black text-white font-display leading-none block">
                  ANANTA <span className="text-brand-400">TRADERS</span>
                </span>
                <span className="text-[10px] text-brand-400/90 font-bold uppercase tracking-wider block mt-1">
                  Customer & Site Portal
                </span>
              </div>
            </Link>
          </div>

          {/* User profile card */}
          <div className="p-4 mx-4 my-5 bg-gradient-to-br from-slate-950 to-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate font-display">{user?.name || 'Customer'}</div>
                <div className="text-[11px] text-brand-400 font-mono font-medium mt-0.5 truncate">
                  {user?.mobile}
                </div>
              </div>
            </div>
            {user?.gstNumber && (
              <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono truncate">
                GST: <span className="text-slate-200 font-semibold">{user.gstNumber}</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-amber-500 text-slate-950 shadow-lg shadow-brand-500/25 font-black'
                      : item.highlight
                      ? 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-brand-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-brand-500 text-slate-950 font-black">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2.5">
          <Link
            to="/"
            className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <span>Public Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
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
      <main key={location.pathname} className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full animate-page-in">
        <Outlet />
      </main>

      {/* Mobile Android Floating Dark Navy Bottom Dock (Portal, Create Order with +, Orders) */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-50 bg-[#0c1427] text-white rounded-full p-2 px-6 flex items-center justify-around shadow-2xl border border-slate-800/80 max-w-sm mx-auto">
        {/* 1. Portal */}
        <Link
          to="/user/dashboard"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[64px] transition-all active:scale-95"
        >
          {location.pathname === '/user/dashboard' ? (
            <div className="w-10 h-10 rounded-full bg-[#201a0e] border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
              <LayoutGrid className="w-5 h-5 text-amber-400" />
            </div>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <span
            className={`text-[11px] mt-0.5 tracking-tight font-medium ${
              location.pathname === '/user/dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            Portal
          </span>
        </Link>

        {/* 2. Create Order (Center Elevated Button with + icon) */}
        <Link
          to="/user/create-order"
          className="flex flex-col items-center justify-center -mt-8 transition-all active:scale-95 px-2"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black shadow-xl shadow-amber-500/60 border-4 border-white flex items-center justify-center">
            <Plus className="w-7 h-7 stroke-[3] text-slate-950" />
          </div>
          <span className="text-[11px] font-black text-white tracking-tight mt-1">
            Create Order
          </span>
        </Link>

        {/* 3. Orders */}
        <Link
          to="/user/orders"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[64px] transition-all active:scale-95"
        >
          {location.pathname.startsWith('/user/orders') ? (
            <div className="w-10 h-10 rounded-full bg-[#201a0e] border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <span
            className={`text-[11px] mt-0.5 tracking-tight font-medium ${
              location.pathname.startsWith('/user/orders') ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            Orders
          </span>
        </Link>
      </nav>
    </div>
  );
}
