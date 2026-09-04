import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Phone, MessageSquare, ShieldCheck, Menu, X, ArrowRight, UserCircle, LogIn, LayoutDashboard } from 'lucide-react';

export default function PublicLayout() {
  const { user, isAuthenticated, logout, isUser, isDealer, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isDealer) return '/dealer/dashboard';
    return '/user/dashboard';
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products & Pricing', path: '/products' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' }
  ];

  const isRoleSelectionPage = ['/', '/role-selection', '/select-role'].includes(location.pathname);

  if (isRoleSelectionPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-slate-950">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-slate-950">
      {/* Top Industrial Helpline Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Direct Riverbed & Quarry Supply Network
            </span>
            <span className="hidden sm:inline-block text-slate-600">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              100% Genuine River Royalty & Certified Weighbridge Slips
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="tel:+919876543210"
              className="flex items-center gap-1.5 text-slate-300 hover:text-brand-400 transition-colors font-semibold"
            >
              <Phone className="w-3 h-3 text-brand-400" />
              +91 98765 43210
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
            >
              <MessageSquare className="w-3 h-3" />
              WhatsApp Dispatch
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white font-display block leading-none">
                ANANTA <span className="text-brand-400">TRADERS</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold block mt-1">
                Quality Materials. Reliable Delivery.
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
                  className={`text-sm font-semibold transition-colors ${
                    isActive ? 'text-brand-400 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardLink()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-brand-500/20"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Portal ({user?.role})
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-brand-400" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-brand-500/25"
                >
                  Order Material
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 bg-slate-950 border-b border-slate-800 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-brand-500 text-slate-950 font-bold text-sm"
                  >
                    Go to {user?.role} Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-brand-500 text-slate-950 font-extrabold text-sm"
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
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Industrial Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-slate-950 font-black">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-lg font-black text-white font-display">
                ANANTA <span className="text-brand-400">TRADERS</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gujarat's trusted aggregate, river sand, and grit supply powerhouse. Committed to certified royalty compliance, weighbridge precision, and on-time site dispatch.
            </p>
            <div className="text-xs font-semibold text-slate-300">
              Tagline: <span className="text-brand-400">"Quality Materials. Reliable Delivery."</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 font-display text-sm tracking-wider uppercase">Products & Minerals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">River Sand (Send) - Patan & Sabarmati</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">Crushed Black Trap Aggregate (20mm, 10mm)</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">6mm Grit & Refo Stone Dust</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">Metal 40×63 & Heavy Rubble Stone</Link></li>
              <li><Link to="/products" className="hover:text-brand-400 transition-colors">Tractor Dispatch (Single & Double Patiya)</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 font-display text-sm tracking-wider uppercase">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/about" className="hover:text-brand-400 transition-colors">About ANANTA TRADERS</Link></li>
              <li><Link to="/contact" className="hover:text-brand-400 transition-colors">Contact Dispatch Office</Link></li>
              <li><Link to="/login" className="hover:text-brand-400 transition-colors">Dealer Portal Access</Link></li>
              <li><Link to="/register" className="hover:text-brand-400 transition-colors">Builder & Contractor Registration</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold mb-4 font-display text-sm tracking-wider uppercase">Dispatch Headquarters</h4>
            <p className="text-xs text-slate-300">
              Commercial Hub, Mehsana - Ahmedabad Highway, Gujarat, India.
            </p>
            <div className="pt-2 text-xs space-y-1">
              <div>Phone: <span className="text-slate-200 font-mono">+91 98765 43210</span></div>
              <div>Email: <span className="text-slate-200 font-mono">dispatch@anantatraders.com</span></div>
              <div>Royalty Compliance: <span className="text-emerald-400 font-semibold">100% Certified</span></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ANANTA TRADERS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Terms & Conditions</span>
            <span>Privacy Policy</span>
            <span>Weighbridge Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
