import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import RoleSelection from './RoleSelection';
import {
  Truck,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Send,
  ShieldAlert,
  RotateCcw,
  Warehouse,
  HardHat,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role');

  // Role: null | 'ADMIN' | 'DEALER' | 'USER'
  const [selectedRole, setSelectedRole] = useState(initialRole || null);

  // Sync state if URL searchParams change
  useEffect(() => {
    const roleInQuery = searchParams.get('role');
    if (roleInQuery && ['ADMIN', 'DEALER', 'USER'].includes(roleInQuery.toUpperCase())) {
      setSelectedRole(roleInQuery.toUpperCase());
    }
  }, [searchParams]);

  // Mode: 'LOGIN' | 'FORGOT_PASSWORD'
  const [mode, setMode] = useState('LOGIN');

  // Login Form State
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMobile, setForgotMobile] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Resend Timer Countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // 1. Role Selection Back Button
  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setSearchParams({});
    setMode('LOGIN');
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setSearchParams({ role: roleKey });
  };

  // 2. Login Submit Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!mobile || !password) {
      toast.error('Please enter registered mobile number and password.');
      return;
    }

    setLoading(true);
    try {
      // Pass expectedRole to verify against backend role
      await login(mobile.trim(), password, selectedRole);
      // Navigate to dedicated 5-Second Tractor Animation screen
      navigate('/auth-success', { state: { from: location.state?.from } });
    } catch (err) {
      // Error handled with toast
    } finally {
      setLoading(false);
    }
  };

  // 3. Forgot Password: Step 1 -> Send OTP
  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotMobile || !/^[6-9]\d{9}$/.test(forgotMobile.trim())) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await authService.forgotPasswordSendOtp(forgotMobile.trim());
      setMaskedMobile(res.data?.maskedMobile || `******${forgotMobile.slice(-4)}`);
      setForgotStep(2);
      setResendTimer(60);
      toast.success(res.message || `OTP sent successfully to ${res.data?.maskedMobile}`);
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  // 4. Forgot Password: Step 2 -> Verify OTP
  const handleVerifyForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP received via SMS.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await authService.forgotPasswordVerifyOtp(forgotMobile.trim(), forgotOtp.trim());
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setForgotStep(3);
        toast.success('OTP verified successfully! Please set your new password.');
      }
    } catch (err) {
      toast.error(err.message || 'Incorrect or expired OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 5. Forgot Password: Step 3 -> Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirm new password do not match.');
      return;
    }

    setResettingPass(true);
    try {
      const res = await authService.forgotPasswordReset(forgotMobile.trim(), resetToken, newPassword.trim());
      toast.success(res.message || 'Password reset successfully! Please sign in with your new password.');
      setMobile(forgotMobile.trim());
      setPassword('');
      setMode('LOGIN');
      setForgotStep(1);
      setForgotOtp('');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. Please start over.');
    } finally {
      setResettingPass(false);
    }
  };

  // If no role has been selected yet, render Role Selection Screen First
  if (!selectedRole) {
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  // Role Metadata Helper
  const getRoleMetadata = () => {
    switch (selectedRole) {
      case 'ADMIN':
        return {
          title: 'Super Admin Login',
          subtitle: 'Executive Command & System Governance',
          icon: ShieldAlert,
          badge: 'Super Admin Portal',
          badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          borderColor: 'focus:border-amber-500',
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
        };
      case 'DEALER':
        return {
          title: 'Authorized Dealer Login',
          subtitle: 'Regional Material Depot & Fleet Dispatch',
          icon: Warehouse,
          badge: 'Dealer Portal',
          badgeStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          borderColor: 'focus:border-blue-500',
          btnBg: 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20'
        };
      case 'USER':
      default:
        return {
          title: 'Customer Login',
          subtitle: 'Contractor, Builder & Material Orders',
          icon: HardHat,
          badge: 'Customer Portal',
          badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          borderColor: 'focus:border-brand-500',
          btnBg: 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-brand-500/20'
        };
    }
  };

  const meta = getRoleMetadata();
  const RoleIcon = meta.icon;
  const passwordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;
  const passwordsMismatch = newPassword && confirmNewPassword && newPassword !== confirmNewPassword;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
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
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badgeStyle}`}>
            {meta.badge}
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black mx-auto shadow-lg">
            <RoleIcon className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-400 font-medium">{meta.subtitle}</p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {mode === 'LOGIN' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setForgotStep(1);
                      setForgotMobile(mobile || '');
                      setForgotOtp('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 cursor-pointer ${meta.btnBg}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Sign Up Link for Selected Role */}
              <div className="text-center pt-3 border-t border-slate-800 text-xs text-slate-400">
                Don't have a {meta.badge}?{' '}
                <Link
                  to={`/register?role=${selectedRole}`}
                  className="text-brand-400 font-bold hover:underline"
                >
                  Sign Up here
                </Link>
              </div>
            </form>
          ) : (
            /* ================= FORGOT PASSWORD FLOW ================= */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono">
                  Step {forgotStep} of 3
                </span>
              </div>

              {/* STEP 1: Enter Mobile */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white font-display mb-1">Forgot Password</h2>
                    <p className="text-xs text-slate-400">
                      Enter your registered mobile number:
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={forgotMobile}
                        onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp || !forgotMobile || forgotMobile.length !== 10}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Secure OTP...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send OTP
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white font-display mb-1">Verify Mobile OTP</h2>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        OTP sent successfully to <strong className="font-mono text-white">{maskedMobile}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Enter OTP:
                      </label>
                      <span className="text-[10px] text-slate-400">Valid for 5 minutes</span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="_ _ _ _ _ _"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono font-black text-xl tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingOtp || !forgotOtp || forgotOtp.length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying OTP...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify OTP
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotOtp('');
                      }}
                      className="text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer"
                    >
                      Change mobile number
                    </button>

                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={sendingOtp || resendTimer > 0}
                      className="text-amber-400 hover:text-amber-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Create New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white font-display mb-1">Create New Password</h2>
                    <p className="text-xs text-slate-400">
                      Set a secure new password for your account.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      New Password:
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Confirm New Password:
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-600 focus:outline-none pr-10 ${
                          passwordsMatch
                            ? 'border-emerald-500/80'
                            : passwordsMismatch
                            ? 'border-rose-500/80'
                            : 'border-slate-800 focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

                  <button
                    type="submit"
                    disabled={resettingPass || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resettingPass ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
