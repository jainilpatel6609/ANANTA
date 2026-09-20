import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService, pincodeService } from '../../services';
import {
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  Save,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  User,
  Mail,
  Truck,
  IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DealerProfile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    companyName: user?.companyName || '',
    whatsappNumber: user?.whatsappNumber || '',
    email: user?.email || '',
    addressLine1: user?.addressLine1 || '',
    addressLine2: user?.addressLine2 || '',
    area: user?.area || '',
    city: user?.city || '',
    state: user?.state || 'Gujarat',
    pincode: user?.pincode || '',
    officeAddress: user?.officeAddress || '',
    ratePerKm: user?.ratePerKm ?? 0,
    password: ''
  });

  const [pincodeValidation, setPincodeValidation] = useState({
    valid: user?.pincode && /^[1-9][0-9]{5}$/.test(user.pincode) ? true : null,
    message: user?.pincode && /^[1-9][0-9]{5}$/.test(user.pincode) ? '✓ Registered PIN Code' : '',
    loading: false
  });

  const [saving, setSaving] = useState(false);

  const handlePincodeChange = async (val) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: numericVal }));

    if (numericVal.length === 0) {
      setPincodeValidation({ valid: null, message: '', loading: false });
      return;
    }

    if (numericVal.length < 6) {
      setPincodeValidation({
        valid: false,
        message: `Must be exactly 6 digits (${6 - numericVal.length} more needed)`,
        loading: false
      });
      return;
    }

    if (numericVal.length === 6) {
      if (!/^[1-9][0-9]{5}$/.test(numericVal)) {
        setPincodeValidation({
          valid: false,
          message: 'Invalid PIN code format. First digit must be 1-9.',
          loading: false
        });
        return;
      }

      setPincodeValidation({ valid: null, message: 'Verifying PIN code...', loading: true });
      try {
        const res = await pincodeService.lookup(numericVal);
        const geo = res.data;
        if (geo?.city) {
          setPincodeValidation({
            valid: true,
            message: `✓ Valid PIN Code (${geo.city}, ${geo.state})`,
            loading: false
          });
          setFormData((prev) => ({
            ...prev,
            city: prev.city || geo.city,
            state: prev.state || geo.state
          }));
        }
      } catch (err) {
        setPincodeValidation({
          valid: false,
          message: err.response?.data?.message || 'Invalid or unrecognized 6-digit Indian PIN code.',
          loading: false
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.pincode || !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      toast.error('A valid mandatory 6-digit Indian PIN code is required for dealer dispatch routing.');
      return;
    }

    setSaving(true);
    try {
      const res = await authService.updateProfile(formData);
      if (res.data?.user) {
        updateUser(res.data.user);
        toast.success('Dealer logistics profile & geo-depot updated successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Dealer Header Avatar Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-3xl shadow-xl shadow-amber-500/20 shrink-0">
          <Truck className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Logistics Partner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {user?.companyName || user?.name || 'Dealership Hub'}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Rep: <strong className="text-white">{user?.name}</strong> • Mobile: <strong className="text-slate-200">{user?.mobile}</strong>
          </p>
          <p className="text-xs text-amber-400 font-mono">
            {user?.pincode ? `Registered Depot: PIN ${user.pincode} (${user.city || 'Gujarat'})` : 'PIN Location Required'}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Representative & Firm */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4" />
              <span>Dealership Credentials</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Dealer Representative Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Dealership / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Primary Mobile (Dealer Login)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user?.mobile || ''}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm text-slate-400 cursor-not-allowed font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  WhatsApp Dispatch Alerts Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 font-mono min-h-[44px]"
                    placeholder="10-digit WhatsApp for incoming alerts"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Depot Address & PIN Code Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-4 h-4" />
              <span>Depot / Yard Physical Location & Routing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Address Line 1 (Depot / Street) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Station Road Logistics Depot"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Railway Freight Yard"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Area / Locality *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway Zone"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>

              {/* PIN Code Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    PIN Code *
                  </label>
                  {pincodeValidation.loading && (
                    <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl bg-slate-950 border text-sm text-white focus:outline-none font-mono font-bold tracking-widest min-h-[44px] ${
                    pincodeValidation.valid === true
                      ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-300'
                      : pincodeValidation.valid === false
                      ? 'border-rose-500/80 bg-rose-950/20 text-rose-300'
                      : 'border-slate-800 focus:border-brand-500'
                  }`}
                />
                {pincodeValidation.message && (
                  <div
                    className={`text-[11px] mt-1.5 flex items-center gap-1 font-medium ${
                      pincodeValidation.valid === true
                        ? 'text-emerald-400'
                        : pincodeValidation.valid === false
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {pincodeValidation.valid === true ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : pincodeValidation.valid === false ? (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : null}
                    <span>{pincodeValidation.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mehsana"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gujarat"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Delivery Pricing */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
              <IndianRupee className="w-4 h-4" />
              <span>Delivery Pricing</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Rate per KM (₹ per ton, per km)
              </label>
              <div className="relative max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 12.5"
                  value={formData.ratePerKm}
                  onChange={(e) => setFormData({ ...formData, ratePerKm: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 font-mono min-h-[44px]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Customers see: <strong className="text-slate-200">Price per ton = this rate &times; distance (km) to shipping address</strong>.
              </p>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
              <Lock className="w-4 h-4" />
              <span>Account Security</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Update Password (Leave blank to keep current)
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[44px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50 min-h-[48px] cursor-pointer"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Dealer Profile & Depot Routing
          </button>
        </form>
      </div>
    </div>
  );
}
