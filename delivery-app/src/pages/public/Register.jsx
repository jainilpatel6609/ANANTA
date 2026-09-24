import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pincodeService, authService } from '../../services';
import RoleSelection from './RoleSelection';
import LiveCameraModal from '../../components/LiveCameraModal';
import { listenForNativeOtp } from '../../utils/nativeBridge';
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
  EyeOff,
  Radio,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Camera,
  UploadCloud,
  FileCheck,
  CreditCard,
  Mail
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
    dob: '',
    gender: 'Male',
    password: '',
    confirmPassword: '',
    // Super Admin Specific
    secretKey: '',
    // Customer Specific
    gstNumber: '',
    userType: 'Contractor',
    officeAddress: '',
    // Dealer Specific Address
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    state: 'Gujarat',
    pincode: ''
  });

  // Dealer GPS Live Location State
  const [gpsStatus, setGpsStatus] = useState('CHECKING'); // 'CHECKING' | 'LOCKED' | 'DENIED' | 'UNSUPPORTED'
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [isSyncingGps, setIsSyncingGps] = useState(false);

  // Dealer Phone OTP Verification State
  const [dealerOtp, setDealerOtp] = useState({
    sent: false,
    otp: '',
    demoOtp: '',
    isVerified: false,
    sending: false,
    verifying: false,
    resendTimer: 0
  });

  // Android app: auto-fill the OTP from the incoming SMS (user consent); manual entry always still works.
  const stopOtpListenerRef = useRef(null);
  const stopOtpListener = () => {
    if (stopOtpListenerRef.current) {
      stopOtpListenerRef.current();
      stopOtpListenerRef.current = null;
    }
  };
  useEffect(() => stopOtpListener, []);

  // Resend OTP Countdown Timer
  useEffect(() => {
    let interval;
    if (dealerOtp.resendTimer > 0) {
      interval = setInterval(() => {
        setDealerOtp((prev) => ({ ...prev, resendTimer: prev.resendTimer - 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dealerOtp.resendTimer]);

  // Dealer Mandatory KYC Documents & Photos
  const [kycDocs, setKycDocs] = useState({
    aadharFront: { file: null, url: '', uploading: false, error: '' },
    aadharBack: { file: null, url: '', uploading: false, error: '' },
    panFront: { file: null, url: '', uploading: false, error: '' },
    panBack: { file: null, url: '', uploading: false, error: '' },
    dealerPhoto: { file: null, url: '', uploading: false, error: '' },
    officeFrontPhoto: { file: null, url: '', uploading: false, error: '' }
  });

  // Live Camera Modal State for Dealer Photo & Office Front Photo
  const [cameraModal, setCameraModal] = useState({
    isOpen: false,
    docKey: null,
    title: '',
    facingMode: 'user',
    helperText: ''
  });

  const openLiveCameraFor = (docKey) => {
    if (docKey === 'dealerPhoto') {
      setCameraModal({
        isOpen: true,
        docKey: 'dealerPhoto',
        title: '📸 Capture Dealer Passport / Selfie Photo',
        facingMode: 'user',
        helperText: 'Position your face clearly inside the center frame and click Capture Live Photo.'
      });
    } else if (docKey === 'officeFrontPhoto') {
      setCameraModal({
        isOpen: true,
        docKey: 'officeFrontPhoto',
        title: '🏢 Capture Dealer Office / Depot Front View',
        facingMode: 'environment',
        helperText: 'Point camera at the front facade, signboard or main entrance of your depot.'
      });
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, registerDealer, registerSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // 1. Mandatory GPS Location Request for Dealers
  const requestDealerGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('UNSUPPORTED');
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsSyncingGps(true);
    setGpsStatus('CHECKING');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({ latitude, longitude });
        setGpsAccuracy(accuracy);
        setGpsStatus('LOCKED');
        setIsSyncingGps(false);
        toast.success(`📍 Live GPS Locked: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)}m)`);
      },
      (err) => {
        setIsSyncingGps(false);
        setGpsStatus('DENIED');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow location access in browser/device settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('GPS location unavailable. Please ensure Device Location/GPS is turned ON.');
        } else {
          setGpsError(err.message || 'Unable to fetch GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    if (selectedRole === 'DEALER') {
      requestDealerGpsLocation();
    }
  }, [selectedRole]);

  // 2. Upload Document Helper
  const handleFileUpload = async (fieldKey, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      toast.error('Please select an image file (JPG, JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10 MB.');
      return;
    }

    setKycDocs((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], uploading: true, error: '' }
    }));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('document', file);
      const res = await authService.uploadDoc(uploadFormData);
      if (res.data?.url) {
        setKycDocs((prev) => ({
          ...prev,
          [fieldKey]: { file, url: res.data.url, uploading: false, error: '' }
        }));
        toast.success(`✓ ${getFieldLabel(fieldKey)} uploaded successfully!`);
      }
    } catch (err) {
      setKycDocs((prev) => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], uploading: false, error: err.message || 'Upload failed' }
      }));
      toast.error(err.message || 'Failed to upload image.');
    }
  };

  const getFieldLabel = (key) => {
    switch (key) {
      case 'aadharFront':
        return 'Aadhar Card (Front)';
      case 'aadharBack':
        return 'Aadhar Card (Back)';
      case 'panFront':
        return 'PAN Card (Front)';
      case 'panBack':
        return 'PAN Card (Back)';
      case 'dealerPhoto':
        return 'Dealer Passport / Selfie Photo';
      case 'officeFrontPhoto':
        return 'Depot / Office Front Photo';
      default:
        return 'Document';
    }
  };

  // 3. Send Dealer Phone OTP
  const handleSendDealerOtp = async () => {
    const cleanMobile = formData.mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setDealerOtp((prev) => ({ ...prev, sending: true }));
    stopOtpListener();
    stopOtpListenerRef.current = listenForNativeOtp((otp) => {
      setDealerOtp((prev) => ({ ...prev, otp: otp.replace(/D/g, '').slice(0, 6) }));
      toast.success('OTP filled automatically.');
    });
    try {
      const res = await authService.sendDealerSignupOtp(cleanMobile);
      const generatedOtp = res.data?.demoOtp || res.data?.data?.demoOtp || '';
      setDealerOtp((prev) => ({
        ...prev,
        sent: true,
        sending: false,
        demoOtp: generatedOtp,
        resendTimer: 30
      }));
      toast.success(generatedOtp ? `OTP Sent! Demo OTP: ${generatedOtp}` : `6-Digit OTP sent to +91 ${cleanMobile}`);
    } catch (err) {
      stopOtpListener();
      toast.error(err.message || 'Failed to send OTP.');
      setDealerOtp((prev) => ({ ...prev, sending: false }));
    }
  };

  // 4. Verify Dealer Phone OTP
  const handleVerifyDealerOtp = async () => {
    const cleanMobile = formData.mobile.trim();
    const cleanOtp = dealerOtp.otp.trim();
    if (cleanOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.');
      return;
    }

    setDealerOtp((prev) => ({ ...prev, verifying: true }));
    try {
      await authService.verifyDealerSignupOtp(cleanMobile, cleanOtp);
      stopOtpListener();
      setDealerOtp((prev) => ({
        ...prev,
        isVerified: true,
        verifying: false
      }));
      toast.success('✓ Mobile number verified successfully!');
    } catch (err) {
      toast.error(err.message || 'Invalid OTP entered.');
      setDealerOtp((prev) => ({ ...prev, verifying: false }));
    }
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setSearchParams({});
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setSearchParams({ role: roleKey });
  };

  // 5. Submit Registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Full Name is mandatory.');
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

    // Role-specific validations
    if (selectedRole === 'DEALER') {
      if (!gpsCoords || gpsStatus !== 'LOCKED') {
        toast.error('Mandatory Live GPS Location required. Please turn ON location and click Refresh GPS.');
        return;
      }

      if (!dealerOtp.isVerified) {
        toast.error('Please verify your mobile number with OTP before submitting.');
        return;
      }

      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error('A valid official Email ID is mandatory for Dealer registration.');
        return;
      }

      if (!formData.dob.trim()) {
        toast.error('Date of Birth is mandatory.');
        return;
      }

      if (!formData.companyName.trim()) {
        toast.error('Dealership / Firm Name is mandatory.');
        return;
      }

      const officeAddr = (formData.officeAddress || formData.addressLine1 || '').trim();
      if (!officeAddr) {
        toast.error('Dealer Office / Depot Address is mandatory.');
        return;
      }

      if (!formData.gstNumber.trim()) {
        toast.error('GST Number is mandatory for Authorized Dealer registration.');
        return;
      }

      // Check all 6 KYC documents
      if (!kycDocs.aadharFront.url) {
        toast.error('Please upload Aadhar Card (Front Side) photo.');
        return;
      }
      if (!kycDocs.aadharBack.url) {
        toast.error('Please upload Aadhar Card (Back Side) photo.');
        return;
      }
      if (!kycDocs.panFront.url) {
        toast.error('Please upload PAN Card (Front Side) photo.');
        return;
      }
      if (!kycDocs.panBack.url) {
        toast.error('Please upload PAN Card (Back Side) photo.');
        return;
      }
      if (!kycDocs.dealerPhoto.url) {
        toast.error('Please upload Dealer Portrait / Selfie Photo.');
        return;
      }
      if (!kycDocs.officeFrontPhoto.url) {
        toast.error('Please upload Dealer Office / Depot Front Photo.');
        return;
      }
    }

    setLoading(true);
    try {
      if (selectedRole === 'ADMIN') {
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
        await registerDealer({
          name: formData.name.trim(),
          companyName: formData.companyName.trim(),
          mobile: formData.mobile.trim(),
          whatsappNumber: formData.whatsappNumber.trim() || formData.mobile.trim(),
          email: formData.email.trim(),
          dob: formData.dob.trim(),
          gender: formData.gender,
          officeAddress: (formData.officeAddress || formData.addressLine1 || '').trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim(),
          area: formData.area.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || 'Gujarat',
          pincode: formData.pincode.trim(),
          gstNumber: formData.gstNumber.trim().toUpperCase(),
          aadharFrontUrl: kycDocs.aadharFront.url,
          aadharBackUrl: kycDocs.aadharBack.url,
          panFrontUrl: kycDocs.panFront.url,
          panBackUrl: kycDocs.panBack.url,
          dealerPhotoUrl: kycDocs.dealerPhoto.url,
          officeFrontPhotoUrl: kycDocs.officeFrontPhoto.url,
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          password: formData.password
        });
      } else {
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

  if (!selectedRole) {
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

  const getRoleInfo = () => {
    switch (selectedRole) {
      case 'ADMIN':
        return {
          title: 'Super Admin Registration',
          badge: 'Executive Authorization Required',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20',
          icon: ShieldAlert
        };
      case 'DEALER':
        return {
          title: 'Authorized Dealer Registration & KYC',
          badge: 'Verified Supply Depot Partner',
          badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
          icon: Warehouse
        };
      default:
        return {
          title: 'Customer / Builder Registration',
          badge: 'Direct Factory Sand & Aggregates',
          badgeBg: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
          btnBg: 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-brand-500/20',
          icon: HardHat
        };
    }
  };

  const info = getRoleInfo();
  const RoleIcon = info.icon;

  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Back to Role Selection */}
        <button
          type="button"
          onClick={handleBackToRoleSelection}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Switch Account Type</span>
        </button>

        {/* Role Badge & Header */}
        <div className="text-center space-y-2 mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${info.badgeBg}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{info.badge}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {info.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400">
            {selectedRole === 'DEALER'
              ? 'Complete KYC verification and depot GPS locking to receive orders within your 5 KM radius.'
              : 'Create your account to order quality construction materials.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ========================================================= */}
          {/* DEALER SECTION 1: 🛰️ MANDATORY LIVE GPS LOCATION RADAR */}
          {/* ========================================================= */}
          {selectedRole === 'DEALER' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-blue-500/40 space-y-3 shadow-lg shadow-blue-500/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-blue-400 animate-bounce" />
                  <span>Mandatory Depot GPS Location</span>
                </div>
                <button
                  type="button"
                  onClick={requestDealerGpsLocation}
                  disabled={isSyncingGps}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGps ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isSyncingGps ? 'Locking GPS...' : 'Refresh GPS'}</span>
                </button>
              </div>

              {gpsStatus === 'LOCKED' && gpsCoords && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <strong>GPS Locked:</strong> {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
                    {gpsAccuracy && ` (±${Math.round(gpsAccuracy)}m)`}
                  </div>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                </div>
              )}

              {gpsStatus === 'CHECKING' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Requesting high-accuracy GPS coordinates from device...</span>
                </div>
              )}

              {gpsStatus === 'DENIED' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Location Permission Required:</strong>
                    {gpsError || 'Please enable GPS/Location in your device settings to proceed.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* DEALER SECTION 2: 📱 PHONE NUMBER WITH LIVE OTP */}
          {/* ========================================================= */}
          {selectedRole === 'DEALER' ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>Phone Number & OTP Verification *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Mobile Number (For Login & SMS) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-mono">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      disabled={dealerOtp.isVerified}
                      placeholder="98XXXXXXXX"
                      value={formData.mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, mobile: val, whatsappNumber: formData.whatsappNumber || val });
                      }}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-75"
                    />
                  </div>
                </div>

                <div>
                  {!dealerOtp.isVerified ? (
                    <button
                      type="button"
                      onClick={handleSendDealerOtp}
                      disabled={dealerOtp.sending || dealerOtp.resendTimer > 0 || formData.mobile.length !== 10}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {dealerOtp.sending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : dealerOtp.resendTimer > 0 ? (
                        <span>Resend ({dealerOtp.resendTimer}s)</span>
                      ) : (
                        <span>{dealerOtp.sent ? 'Resend OTP' : 'Send OTP'}</span>
                      )}
                    </button>
                  ) : (
                    <div className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input Box if OTP is sent and not verified */}
              {dealerOtp.sent && !dealerOtp.isVerified && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Enter 6-digit OTP sent to mobile:</span>
                    <span className="text-[11px] text-blue-400 font-mono font-bold">Valid for 5 mins</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={dealerOtp.otp}
                      onChange={(e) => setDealerOtp({ ...dealerOtp, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono font-black text-lg tracking-widest text-amber-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyDealerOtp}
                      disabled={dealerOtp.verifying || dealerOtp.otp.length !== 6}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {dealerOtp.verifying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify OTP</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Testing / Demo OTP Display & 1-Click Auto Fill */}
                  {dealerOtp.demoOtp && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-950/70 to-slate-950 border border-blue-500/40 text-xs shadow-md">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-medium">💡 Testing / Demo OTP:</span>
                        <span className="font-mono text-base font-black text-amber-400 tracking-widest bg-slate-900 px-3 py-0.5 rounded-lg border border-amber-500/30">
                          {dealerOtp.demoOtp}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDealerOtp((prev) => ({ ...prev, otp: prev.demoOtp }));
                          toast.success('✓ Demo OTP filled!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer shadow active:scale-95"
                      >
                        Auto Fill OTP
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    WhatsApp Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-mono">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98XXXXXXXX"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Official Email ID *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="dealer@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Customer / Admin Phone & Email Fields
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Mobile Number (For Login) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, mobile: val, whatsappNumber: formData.whatsappNumber || val });
                    }}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  WhatsApp Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: PERSONAL & IDENTITY DETAILS (NAME, DOB, GENDER) */}
          {/* ========================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Representative Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              {selectedRole === 'DEALER' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Birth Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Gender *
                    </label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="app-select w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

              {selectedRole !== 'DEALER' && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: DEALERSHIP & OFFICE ADDRESS + GST NUMBER */}
          {/* ========================================================= */}
          {selectedRole === 'DEALER' && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Dealership & Office Details *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Dealership / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patel Sand & Quarry Works"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    GST Number (Mandatory) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="15-digit GSTIN (e.g. 24AAAAA0000A1Z5)"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-amber-400 placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Dealer Office / Depot Physical Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Plot / Survey No., Highway / Industrial Area, City, Gujarat"
                  value={formData.officeAddress}
                  onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value, addressLine1: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="GIDC / Highway"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmedabad / Mehsana"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Gujarat"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    PIN Code (Opt)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="384001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* DEALER SECTION 5: 🪪 MANDATORY KYC DOCUMENT & PHOTO UPLOADS */}
          {/* ========================================================= */}
          {selectedRole === 'DEALER' && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Mandatory KYC Documents & Photographs (6 Uploads) *</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">JPG / PNG / WEBP (Max 10MB)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Aadhar Front */}
                <DocUploadCard
                  label="1. Aadhar Card (Front Side) *"
                  docKey="aadharFront"
                  state={kycDocs.aadharFront}
                  onUpload={(file) => handleFileUpload('aadharFront', file)}
                />

                {/* 2. Aadhar Back */}
                <DocUploadCard
                  label="2. Aadhar Card (Back Side) *"
                  docKey="aadharBack"
                  state={kycDocs.aadharBack}
                  onUpload={(file) => handleFileUpload('aadharBack', file)}
                />

                {/* 3. PAN Front */}
                <DocUploadCard
                  label="3. PAN Card (Front Side) *"
                  docKey="panFront"
                  state={kycDocs.panFront}
                  onUpload={(file) => handleFileUpload('panFront', file)}
                />

                {/* 4. PAN Back */}
                <DocUploadCard
                  label="4. PAN Card (Back Side) *"
                  docKey="panBack"
                  state={kycDocs.panBack}
                  onUpload={(file) => handleFileUpload('panBack', file)}
                />

                {/* 5. Dealer Photo (Live Camera Only) */}
                <DocUploadCard
                  label="5. Dealer Passport / Selfie Photo *"
                  docKey="dealerPhoto"
                  state={kycDocs.dealerPhoto}
                  isCameraOnly={true}
                  onOpenLiveCamera={() => openLiveCameraFor('dealerPhoto')}
                  onUpload={(file) => handleFileUpload('dealerPhoto', file)}
                />

                {/* 6. Office Front Photo (Live Camera Only) */}
                <DocUploadCard
                  label="6. Dealer Office / Depot Front Photo *"
                  docKey="officeFrontPhoto"
                  state={kycDocs.officeFrontPhoto}
                  isCameraOnly={true}
                  onOpenLiveCamera={() => openLiveCameraFor('officeFrontPhoto')}
                  onUpload={(file) => handleFileUpload('officeFrontPhoto', file)}
                />
              </div>
            </div>
          )}

          {/* CUSTOMER SPECIFIC: Business Category & GST */}
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
                    className="app-select w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
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
                    placeholder="Enter system secret key"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-amber-500/30 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
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

          {/* ========================================================= */}
          {/* SECTION 6: PASSWORD & CONFIRM PASSWORD */}
          {/* ========================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 mt-4 cursor-pointer ${info.btnBg}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account & Submitting KYC...</span>
              </>
            ) : (
              <>
                <span>
                  {selectedRole === 'ADMIN'
                    ? 'Create Super Admin Account'
                    : selectedRole === 'DEALER'
                    ? 'Complete Dealership Registration & Submit KYC'
                    : 'Complete Customer Registration'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            to={selectedRole ? `/login?role=${selectedRole}` : '/login'}
            className="text-brand-400 hover:text-brand-300 font-bold ml-1 transition-colors"
          >
            Sign In here
          </Link>
        </div>
      </div>

      {/* Live Camera Modal (Mandatory for Dealer Portrait & Office Facade) */}
      <LiveCameraModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal((prev) => ({ ...prev, isOpen: false }))}
        title={cameraModal.title}
        facingMode={cameraModal.facingMode}
        helperText={cameraModal.helperText}
        onCapture={(file) => {
          if (cameraModal.docKey) {
            handleFileUpload(cameraModal.docKey, file);
          }
        }}
      />
    </div>
  );
}

// Subcomponent: Document / Photo Upload Card
function DocUploadCard({
  label,
  docKey,
  state,
  onUpload,
  isCameraOnly = false,
  onOpenLiveCamera
}) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (isCameraOnly) {
      if (onOpenLiveCamera) onOpenLiveCamera();
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`p-3.5 rounded-2xl bg-slate-950 border transition-all flex flex-col justify-between space-y-3 ${
        isCameraOnly
          ? 'border-amber-500/40 bg-gradient-to-b from-slate-950 to-slate-900/40'
          : 'border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-200 truncate">{label}</span>
        {state.url ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Captured
          </span>
        ) : isCameraOnly ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0 animate-pulse">
            🔴 Live Camera Only
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Required
          </span>
        )}
      </div>

      {/* Hidden file input only for non-camera-only cards */}
      {!isCameraOnly && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {state.url ? (
        <div className="relative group rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900 h-28 flex items-center justify-center">
          <img
            src={state.url}
            alt={label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div
            onClick={handleClick}
            className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-1.5 text-xs text-white font-bold"
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <span>{isCameraOnly ? 'Retake Live Photo' : 'Change Photo'}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={state.uploading}
          className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all cursor-pointer group disabled:opacity-50 ${
            isCameraOnly
              ? 'border-amber-500/50 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10'
              : 'border-slate-800 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900'
          }`}
        >
          {state.uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-blue-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading...</span>
            </div>
          ) : isCameraOnly ? (
            <div className="flex flex-col items-center gap-1 text-amber-400 group-hover:text-amber-300 transition-colors">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-md">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Click to Open Live Camera</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">🔴 Real-Time Snap (No Gallery)</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-blue-400 transition-colors">
              <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
              <span className="text-xs font-bold">Click to Upload Document</span>
              <span className="text-[10px] text-slate-500">Camera / File (JPG, PNG)</span>
            </div>
          )}
        </button>
      )}

      {state.error && (
        <div className="text-[10px] text-rose-400 font-medium">{state.error}</div>
      )}
    </div>
  );
}
