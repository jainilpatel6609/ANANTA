import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  Building2,
  Mail,
  UserCheck,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProfile() {
  const { user, updateUser } = useAuth();

  // Basic Profile Form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [officeAddress, setOfficeAddress] = useState(user?.officeAddress || '');

  // Mobile Change & OTP State
  const [newMobile, setNewMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [mobileVerifiedSuccess, setMobileVerifiedSuccess] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [saving, setSaving] = useState(false);

  // Synchronize state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setOfficeAddress(user.officeAddress || '');
    }
  }, [user]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // 1. Send OTP Handler
  const handleSendOtp = async () => {
    if (!newMobile || !/^[6-9]\d{9}$/.test(newMobile.trim())) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (newMobile.trim() === user?.mobile) {
      toast.error('New mobile number cannot be identical to your current mobile number.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await authService.sendMobileOtp(newMobile.trim());
      setOtpSent(true);
      setResendTimer(60);
      setMobileVerifiedSuccess(false);
      toast.success(res.message || `Verification OTP sent to +91 ${newMobile}`);
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch verification OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  // 2. Verify OTP Handler
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP received.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await authService.verifyMobileOtp(newMobile.trim(), otp.trim());
      if (res.data?.user) {
        updateUser(res.data.user, res.data.token);
        setMobileVerifiedSuccess(true);
        setOtpSent(false);
        setOtp('');
        setNewMobile('');
        toast.success('Mobile number verified and updated successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Incorrect or expired OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 3. Save Changes Handler
  const handleSaveChanges = async (e) => {
    e.preventDefault();

    // Validate password change fields if any password field is filled
    if (newPassword || confirmNewPassword || currentPassword) {
      if (!currentPassword) {
        toast.error('Current password is required to change your password.');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        toast.error('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error('New password and confirm password do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        officeAddress: officeAddress.trim()
      };

      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword.trim();
        payload.newPassword = newPassword.trim();
      }

      const res = await authService.updateProfile(payload);
      if (res.data?.user) {
        updateUser(res.data.user, res.data.token);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        toast.success('Super Admin account settings saved successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save account settings');
    } finally {
      setSaving(false);
    }
  };

  const passwordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;
  const passwordsMismatch = newPassword && confirmNewPassword && newPassword !== confirmNewPassword;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Super Admin Executive Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Profile & Account Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure administrative root mobile credentials, password security, and system contact details.
          </p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{user?.name}</div>
            <div className="text-[10px] text-amber-400 font-mono">Root Access: {user?.mobile}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveChanges} className="space-y-6">
        {/* Section 1: Mobile Number & OTP Verification */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">Mobile Number & 2FA Login Line</h2>
                <p className="text-[11px] text-slate-400">
                  Update primary administrative phone number with mandatory OTP verification
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Current Mobile */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>Current Mobile Number</span>
                <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Active Root
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={user?.mobile || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-300 font-mono font-bold cursor-not-allowed tracking-wider"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">This number receives administrative system alerts and login access.</p>
            </div>

            {/* New Mobile */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                New Mobile Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit new number"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !newMobile || newMobile.length !== 10 || resendTimer > 0}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                >
                  {sendingOtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : resendTimer > 0 ? (
                    <span>Wait {resendTimer}s</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Must be an active 10-digit Indian mobile number.</p>
            </div>
          </div>

          {/* OTP Verification Box */}
          {otpSent && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enter 6-Digit Verification OTP
                </span>
                {resendTimer > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Resend in <span className="text-amber-400 font-bold">{resendTimer}s</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-48 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono font-black text-lg tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || !otp || otp.length !== 6}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {verifyingOtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Verify & Apply New Mobile
                </button>
              </div>
            </div>
          )}

          {mobileVerifiedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Mobile number successfully verified and synchronized across system.</span>
            </div>
          )}
        </div>

        {/* Section 2: Password Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">Security & Password Credentials</h2>
                <p className="text-[11px] text-slate-400">
                  Update root Super Admin login password. Requires current password verification.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-600 focus:outline-none pr-10 ${
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
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
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
          </div>
        </div>

        {/* Section 3: Profile Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">Administrative Profile Information</h2>
                <p className="text-[11px] text-slate-400">
                  Update primary administrator representative name, official email, and corporate headquarters address
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Super Admin Representative Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Executive Superadmin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Official Email Address
              </label>
              <input
                type="email"
                placeholder="admin@anantatraders.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Headquarters / Office Physical Address
            </label>
            <textarea
              rows="3"
              placeholder="e.g. ANANTA TRADERS Corporate Office, Highway Logistics Hub, Mehsana, Gujarat"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

