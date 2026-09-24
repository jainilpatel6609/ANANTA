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
  Users,
  ChevronLeft,
  ChevronRight,
  Route as RouteIcon
} from 'lucide-react';

export default function DealerLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dealer/dashboard', icon: LayoutDashboard },
    { name: 'New Pool', path: '/dealer/new-orders', icon: Inbox, alert: true, highlight: true },
    { name: 'Accepted', path: '/dealer/accepted', icon: CheckCircle },
    { name: 'Active (OTP)', path: '/dealer/active', icon: Truck },
    { name: 'Driver Fleet', path: '/dealer/drivers', icon: Users },
    { name: 'My Dumpers', path: '/dealer/dumpers', icon: Truck },
    { name: 'Archive', path: '/dealer/completed', icon: History },
    { name: 'Transport Rates', path: '/dealer/transport-config', icon: RouteIcon },
    { name: 'Depot Profile', path: '/dealer/profile', icon: User }
  ];

  // Detect if on subpage to show back button on mobile
  const isRootPage = location.pathname === '/dealer/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 selection:bg-brand-500 selection:text-slate-950 pb-20 md:pb-0">
      {/* Mobile Sticky Top App Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {!isRootPage && (
            <Link
              to="/dealer/dashboard"
              className="p-2 -ml-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-90 transition-all"
              aria-label="Back to dealer dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Truck className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="font-bold text-sm font-display text-white block leading-none">
                DEALER <span className="text-amber-400 font-semibold">DISPATCH</span>
              </span>
              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5">
                Authorized Depot
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dealer/notifications"
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-amber-600 text-white rounded-full text-[10px] font-semibold flex items-center justify-center border-2 border-slate-950">
                {unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-95 transition-all"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-brand-500/20">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-black text-white font-display leading-none block">
                ANANTA <span className="text-brand-400">DEALER</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider block mt-1">
                Depot & Fleet Hub
              </span>
            </div>
          </div>

          {/* Dealer profile card */}
          <div className="p-4 mx-4 my-5 bg-gradient-to-br from-slate-950 to-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                {user?.companyName ? user.companyName.charAt(0).toUpperCase() : 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate font-display">
                  {user?.companyName || user?.name || 'Supply Partner'}
                </div>
                <div className="text-[11px] text-amber-400 font-mono font-medium mt-0.5 truncate">
                  {user?.mobile}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-2.5 pt-2 border-t border-slate-800/80 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Supply Partner</span>
            </div>
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
                      ? 'bg-gradient-to-r from-amber-500 to-brand-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black'
                      : item.alert
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
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
            <span>Dealer Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Mandatory Location Enforcement */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DealerLocationEnforcer>
          <main key={location.pathname} className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full animate-page-in">
            <Outlet />
          </main>
        </DealerLocationEnforcer>
      </div>

      {/* Mobile Android Bottom Tab Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-classic bottom-nav-safe">
        {[
          { name: 'Dashboard', path: '/dealer/dashboard', icon: LayoutDashboard },
          { name: 'New Pool', path: '/dealer/new-orders', icon: Inbox, highlight: true },
          { name: 'Accepted', path: '/dealer/accepted', icon: CheckCircle },
          { name: 'Active OTP', path: '/dealer/active', icon: Truck },
          { name: 'Fleet', path: '/dealer/drivers', icon: Users },
          { name: 'Profile', path: '/dealer/profile', icon: User }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl min-w-[50px] transition-all duration-150 active:scale-95 relative ${
                isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200 font-normal'
              }`}
            >
              {item.highlight ? (
                <div className="w-10 h-10 -mt-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-slate-900 transition-all">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              )}
              <span className={`text-[10px] mt-1 tracking-tight ${item.highlight ? 'font-bold text-amber-300' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
