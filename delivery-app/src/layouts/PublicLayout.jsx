import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Phone, MessageSquare, ShieldCheck, Menu, X, ArrowRight, LogIn, LayoutDashboard } from 'lucide-react';

export default function PublicLayout() {
  const { user, isAuthenticated, logout, isDealer, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isDealer) return '/dealer/dashboard';
    return '/user/dashboard';
  };

  const navLinks = [
    { name: 'Home', path: '/home' },
    { name: 'Products & Rates', path: '/products' },
    { name: 'About Network', path: '/about' },
    { name: 'Direct Dispatch', path: '/contact' }
  ];

  const isRoleSelectionPage = ['/', '/role-selection', '/select-role'].includes(location.pathname);

  if (isRoleSelectionPage) {
    return (
      <div key={location.pathname} className="min-h-screen bg-slate-950 text-slate-100 selection:bg-slate-900 selection:text-white animate-page-in">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-slate-900 selection:text-white">
      {/* Mobile-Friendly Top Industrial Ribbon */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 text-xs py-2 px-4 sm:px-8 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-slate-300 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Riverbed & Quarry Supply Network</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-2">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              100% Verified Royalty Slips
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:+919876543210"
              className="flex items-center gap-1 text-slate-300 hover:text-brand-400 transition-colors font-bold text-[11px]"
            >
              <Phone className="w-3 h-3 text-brand-400" />
              <span>+91 98765 43210</span>
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-bold text-[11px]"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden xs:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Sticky Mobile App Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/25 group-hover:scale-105 active:scale-95 transition-all">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-white font-display block leading-none">
                ANANTA <span className="text-brand-400">TRADERS</span>
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-slate-400 font-bold block mt-1">
                Quality Materials • Reliable Delivery
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold transition-all hover:text-brand-400 ${
                    isActive ? 'text-brand-400 font-black' : 'text-slate-300'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardLink()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-black text-xs transition-all shadow-lg shadow-slate-900/25 active:scale-95"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard ({user?.role})</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all active:scale-95"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-brand-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-black text-xs transition-all shadow-lg shadow-slate-900/25 active:scale-95"
                >
                  <span>Order Materials</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-2xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 active:scale-90 transition-all"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-6 bg-slate-950/98 backdrop-blur-2xl border-b border-slate-800 shadow-2xl space-y-3 animate-in slide-in-from-top-4 duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-900 hover:text-white active:scale-98 transition-all"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white font-black text-sm shadow-lg shadow-slate-900/20 active:scale-95"
                  >
                    Go to {user?.role} Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-sm active:scale-95"
                  >
                    Sign In to Portal
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white font-black text-sm shadow-lg shadow-slate-900/25 active:scale-95"
                  >
                    Register / Place Order
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main key={location.pathname} className="flex-1 animate-page-in">
        <Outlet />
      </main>

      {/* Industrial Footer */}
      <footer className="bg-slate-900/90 border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-black shadow-md shadow-slate-900/20">
                <Truck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-lg font-black text-white font-display">
                ANANTA <span className="text-brand-400">TRADERS</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gujarat's premier aggregate, river sand, and grit supply powerhouse. Committed to certified royalty compliance, weighbridge precision, and on-time site dispatch.
            </p>
          </div>

          <div>
            <h4 className="text-white font-black mb-4 font-display text-xs tracking-wider uppercase">Products & Minerals</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">River Sand (Patan & Sabarmati)</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">Black Trap Aggregate (20mm, 10mm)</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">6mm Grit & Refo Stone Dust</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">Metal 40×63 & Heavy Rubble Stone</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-4 font-display text-xs tracking-wider uppercase">Portal Quick Links</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link to="/role-selection" className="hover:text-brand-400 transition-colors">Role Gateway</Link></li>
              <li><Link to="/about" className="hover:text-brand-400 transition-colors">About Our Supply Chain</Link></li>
              <li><Link to="/contact" className="hover:text-brand-400 transition-colors">Dispatch Helpline</Link></li>
              <li><Link to="/login" className="hover:text-brand-400 transition-colors">Dealer Portal Access</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-black mb-4 font-display text-xs tracking-wider uppercase">Dispatch Headquarters</h4>
            <p className="text-xs text-slate-300">
              Commercial Logistics Hub, Mehsana - Ahmedabad Highway, Gujarat, India.
            </p>
            <div className="pt-2 text-xs space-y-1 font-mono">
              <div>Phone: <span className="text-white font-bold">+91 98765 43210</span></div>
              <div>Email: <span className="text-white font-bold">dispatch@anantatraders.com</span></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ANANTA TRADERS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Royalty Certified</span>
            <span>Weighbridge Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
