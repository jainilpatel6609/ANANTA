import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pincodeService } from '../../services';
import RoleSelection from './RoleSelection';
import {
  Truck,
  User,
  Phone,
  MessageSquare,
  Building2,
  MapPin,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Warehouse,
  HardHat,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role');

  // Role: null | 'ADMIN' | 'DEALER' | 'USER'
  const [selectedRole, setSelectedRole] = useState(initialRole || null);

  useEffect(() => {
    const roleInQuery = searchParams.get('role');
    if (roleInQuery && ['ADMIN', 'DEALER', 'USER'].includes(roleInQuery.toUpperCase())) {
      setSelectedRole(roleInQuery.toUpperCase());
    }
  }, [searchParams]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Super Admin Specific
    secretKey: '',
    // Customer Specific
    gstNumber: '',
    userType: 'Contractor',
    officeAddress: '',
    // Dealer Specific
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    state: 'Gujarat',
    pincode: ''
  });

  const [pinValidation, setPinValidation] = useState({
    valid: false,
    checking: false,
    message: '',
    details: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, registerDealer, registerSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Validate Indian PIN Code in real-time for Dealer registration
  useEffect(() => {
    if (selectedRole !== 'DEALER') return;

    const pin = formData.pincode.trim();
    if (!pin) {
      setPinValidation({ valid: false, checking: false, message: '', details: null });
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin) || pin.startsWith('0')) {
      setPinValidation({
        valid: false,
        checking: false,
        message: 'Must be exactly 6 numeric digits (valid Indian PIN code).',
        details: null
      });
      return;
    }

    let isMounted = true;
    const checkPin = async () => {
      setPinValidation((prev) => ({ ...prev, checking: true, message: 'Validating Indian PIN code...' }));
      try {
        const res = await pincodeService.validatePincode(pin);
        if (isMounted) {
          if (res.data?.valid) {
            setPinValidation({
              valid: true,
              checking: false,
              message: `✓ Valid Indian PIN Code (${res.data.pincodeData.city}, ${res.data.pincodeData.state})`,
              details: res.data.pincodeData
            });
            setFormData((prev) => ({
              ...prev,
              city: prev.city || res.data.pincodeData.city,
              state: prev.state || res.data.pincodeData.state
            }));
          } else {
            setPinValidation({
              valid: false,
              checking: false,
              message: 'Invalid Indian PIN code.',
              details: null
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setPinValidation({
            valid: false,
            checking: false,
            message: 'Unable to verify PIN code.',
            details: null
          });
        }
      }
    };

    const timer = setTimeout(checkPin, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.pincode, selectedRole]);

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setSearchParams({});
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setSearchParams({ role: roleKey });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'ADMIN') {
        // SUPER ADMIN REGISTRATION (Requires Secret Key)
        if (!formData.secretKey.trim()) {
          toast.error('Super Admin Secret Key is mandatory.');
          setLoading(false);
          return;
        }

        await registerSuperAdmin({
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          password: formData.password,
          secretKey: formData.secretKey.trim()
        });
      } else if (selectedRole === 'DEALER') {
        // DEALER REGISTRATION (Requires 6-Digit PIN Code)
        if (!pinValidation.valid) {
          toast.error('Please enter a valid 6-digit Indian PIN code for your depot.');
          setLoading(false);
          return;
        }

        await registerDealer({
          name: formData.name.trim(),
          companyName: formData.companyName.trim(),
          mobile: formData.mobile.trim(),
          whatsappNumber: formData.whatsappNumber.trim() || formData.mobile.trim(),
          email: formData.email.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim(),
          area: formData.area.trim(),
          city: formData.city.trim() || pinValidation.details?.city || '',
          state: formData.state.trim() || pinValidation.details?.state || 'Gujarat',
          pincode: formData.pincode.trim(),
          password: formData.password
        });
      } else {
        // CUSTOMER REGISTRATION
        await register({
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          whatsappNumber: formData.whatsappNumber.trim() || formData.mobile.trim(),
          email: formData.email.trim(),
          gstNumber: formData.gstNumber.trim().toUpperCase(),
          officeAddress: formData.officeAddress.trim(),
          companyName: formData.companyName.trim(),
          userType: formData.userType,
          password: formData.password
        });
      }

      // Navigate to dedicated 5-Second Tractor Animation transition
      navigate('/auth-success');
    } catch (err) {
      // Handled in context with toast
    } finally {
      setLoading(false);
    }
  };

  // If no role selected yet, display Role Selection
  if (!selectedRole) {
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

  // Role details
  const getRoleInfo = () => {
    switch (selectedRole) {
      case 'ADMIN':
        return {
          title: 'Create Super Admin Account',
          subtitle: 'Authorized Executive Root Registration',
          icon: ShieldAlert,
          badge: 'Super Admin Portal',
          badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
        };
      case 'DEALER':
        return {
          title: 'Authorized Dealership Registration',
          subtitle: 'Join Regional Material Supply & Logistics Fleet',
          icon: Warehouse,
          badge: 'Dealer Portal',
          badgeStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          btnBg: 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20'
        };
      case 'USER':
      default:
        return {
          title: 'Customer Account Registration',
          subtitle: 'Contractor, Builder, or Material Procurement Account',
          icon: HardHat,
          badge: 'Customer Portal',
          badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          btnBg: 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-brand-500/20'
        };
    }
  };

  const info = getRoleInfo();
  const IconComponent = info.icon;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation back to Role Selection */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToRoleSelection}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4 text-brand-400" />
            Back to Role Selection
          </button>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${info.badgeStyle}`}>
            {info.badge}
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black mx-auto shadow-lg">
            <IconComponent className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {info.title}
          </h1>
          <p className="text-xs text-slate-400">{info.subtitle}</p>
        </div>

        {/* Registration Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Name & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  {selectedRole === 'ADMIN' ? 'Super Admin Full Name *' : selectedRole === 'DEALER' ? 'Dealer Representative Name *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              {selectedRole !== 'ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    {selectedRole === 'DEALER' ? 'Dealership / Firm Name *' : 'Company / Firm Name'}
                  </label>
                  <input
                    type="text"
                    required={selectedRole === 'DEALER'}
                    placeholder="e.g. Patel Infrastructure Ltd"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              {selectedRole === 'ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@anantatraders.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Mobile & Communication */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Mobile Number (For Login) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                  />
                </div>
              </div>

              {selectedRole !== 'ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    WhatsApp Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="For dispatch updates"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* DEALER SPECIFIC: Depot Address & Mandatory 6-Digit PIN Code */}
            {selectedRole === 'DEALER' && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Depot Location & Mandatory 6-Digit PIN Code
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Plot No., Highway / Industrial Area"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Area / Locality *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GIDC Industrial Estate"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siddhpur"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Depot PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 384151"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {pinValidation.message && (
                  <div className={`text-xs p-2.5 rounded-xl flex items-center gap-2 ${
                    pinValidation.valid
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {pinValidation.valid ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <span>{pinValidation.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOMER SPECIFIC: Category, GST, Address */}
            {selectedRole === 'USER' && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Business Category *
                    </label>
                    <select
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Contractor">Contractor</option>
                      <option value="Builder">Builder</option>
                      <option value="Trader">Trader / Supplier</option>
                      <option value="Individual">Individual</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      GST Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Physical Office / Billing Address
                  </label>
                  <input
                    type="text"
                    placeholder="Plot / Office No., Commercial Area, City, Gujarat"
                    value={formData.officeAddress}
                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* SUPER ADMIN SPECIFIC: SECRET KEY INPUT */}
            {selectedRole === 'ADMIN' && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Executive Authorization Required</strong>
                    Super Admin registration is strictly protected by the server-side Secret Key.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                    Super Admin Secret Key *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showSecretKey ? 'text' : 'password'}
                      required
                      placeholder="Enter server-authorized Secret Key"
                      value={formData.secretKey}
                      onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-600 focus:outline-none pr-10 ${
                      passwordsMatch
                        ? 'border-emerald-500/80'
                        : passwordsMismatch
                        ? 'border-rose-500/80'
                        : 'border-slate-800 focus:border-brand-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordsMatch && (
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </div>
                )}
                {passwordsMismatch && (
                  <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <XCircle className="w-3 h-3" /> Passwords do not match
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (selectedRole === 'DEALER' && !pinValidation.valid)}
              className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 mt-4 cursor-pointer ${info.btnBg}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  {selectedRole === 'ADMIN'
                    ? 'Create Super Admin Account'
                    : selectedRole === 'DEALER'
                    ? 'Complete Dealership Registration'
                    : 'Complete Customer Registration'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Already have an account?{' '}
            <Link
              to={`/login?role=${selectedRole}`}
              className="text-brand-400 font-bold hover:underline"
            >
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
