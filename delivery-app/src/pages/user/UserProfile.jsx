import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import {
  User,
  Phone,
  MessageSquare,
  Building2,
  MapPin,
  Save,
  ShieldCheck,
  Loader2,
  Mail,
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    whatsappNumber: user?.whatsappNumber || '',
    email: user?.email || '',
    companyName: user?.companyName || '',
    gstNumber: user?.gstNumber || '',
    officeAddress: user?.officeAddress || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authService.updateProfile(formData);
      if (res.data?.user) {
        updateUser(res.data.user);
        toast.success('Profile and GST details updated successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 select-none">
      {/* Profile Header Avatar Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-xs relative overflow-hidden">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-3xl shadow-lg shadow-amber-500/20 shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
            {user?.name || 'Customer Account'}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Login ID / Mobile: <strong className="text-slate-900">{user?.mobile}</strong>
          </p>
          {user?.companyName && (
            <p className="text-xs text-amber-800 font-bold flex items-center justify-center sm:justify-start gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{user.companyName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Settings Form Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Contact & Personal Info</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  WhatsApp Dispatch Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono transition-all"
                    placeholder="10-digit WhatsApp for OTP alerts"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Primary Mobile (Fixed Login ID)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user?.mobile || ''}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-sm text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    placeholder="for digital invoices"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business & GST Profile */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Firm & GST Invoicing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Company / Firm Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition-all"
                  placeholder="E.g. Shree Ram Construction Co."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  GST Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono uppercase transition-all"
                    placeholder="24AAAAA0000A1Z5"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Office / Billing Address
              </label>
              <textarea
                rows="3"
                value={formData.officeAddress}
                onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white leading-relaxed transition-all"
                placeholder="Official address printed on GST tax invoices"
              />
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Account Security</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Update Password (Leave blank to retain current)
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 stroke-[2.5]" />}
            <span>Save Account & Profile Changes</span>
          </button>
        </form>
      </div>
    </div>
  );
}
