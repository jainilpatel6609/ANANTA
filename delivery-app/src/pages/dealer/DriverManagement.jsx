import React, { useState, useEffect } from 'react';
import { driverService, authService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import {
  Users,
  UserPlus,
  Truck,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Shield,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  UploadCloud,
  X,
  Check,
  Lock,
  ShieldCheck,
  ExternalLink,
  Image as ImageIcon,
  KeyRound,
  FileCheck,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDriverDocs, setSelectedDriverDocs] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('BASIC'); // 'BASIC' | 'KYC' | 'SECURITY'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alternateMobile: '',
    vehicleNumber: '',
    vehicleType: 'Tractor',
    licenseNumber: '',
    licenseFrontUrl: '',
    licenseBackUrl: '',
    aadharCardUrl: '',
    panCardUrl: '',
    photoUrl: '',
    password: '',
    isMobileVerified: false,
    notes: ''
  });

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State inside Modal
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [demoOtp, setDemoOtp] = useState('');

  // File uploading indicators
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await driverService.getDrivers();
      if (res.data?.drivers) {
        setDrivers(res.data.drivers);
      }
    } catch (err) {
      toast.error('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const openAddModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      mobile: '',
      alternateMobile: '',
      vehicleNumber: '',
      vehicleType: 'Tractor',
      licenseNumber: '',
      licenseFrontUrl: '',
      licenseBackUrl: '',
      aadharCardUrl: '',
      panCardUrl: '',
      photoUrl: '',
      password: '',
      isMobileVerified: false,
      notes: ''
    });
    setOtpSent(false);
    setOtpInput('');
    setDemoOtp('');
    setShowPassword(false);
    setActiveTab('BASIC');
    setModalOpen(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      mobile: driver.mobile || '',
      alternateMobile: driver.alternateMobile || '',
      vehicleNumber: driver.vehicleNumber || '',
      vehicleType: driver.vehicleType || 'Tractor',
      licenseNumber: driver.licenseNumber || '',
      licenseFrontUrl: driver.licenseFrontUrl || '',
      licenseBackUrl: driver.licenseBackUrl || '',
      aadharCardUrl: driver.aadharCardUrl || '',
      panCardUrl: driver.panCardUrl || '',
      photoUrl: driver.photoUrl || '',
      password: '',
      isMobileVerified: Boolean(driver.isMobileVerified),
      notes: driver.notes || ''
    });
    setOtpSent(false);
    setOtpInput('');
    setDemoOtp('');
    setShowPassword(false);
    setActiveTab('BASIC');
    setModalOpen(true);
  };

  const openDocViewer = (driver) => {
    setSelectedDriverDocs(driver);
    setDocModalOpen(true);
  };

  // Handle Document / Photo File Upload via API
  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
      return;
    }

    try {
      setUploadingField(fieldName);
      const data = new FormData();
      data.append('document', file);

      const res = await authService.uploadDoc(data);
      if (res.data?.url) {
        setFormData((prev) => ({ ...prev, [fieldName]: res.data.url }));
        toast.success('Document uploaded successfully! ✅');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingField(null);
    }
  };

  // Send Driver Phone OTP
  const handleSendOtp = async () => {
    const cleanMobile = formData.mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number first.');
      return;
    }

    try {
      setSendingOtp(true);
      const res = await driverService.sendOtp(cleanMobile);
      setOtpSent(true);
      setOtpTimer(60);
      if (res.data?.demoOtp) {
        setDemoOtp(res.data.demoOtp);
        toast.success(`OTP Sent! (Demo OTP: ${res.data.demoOtp})`);
      } else {
        toast.success(`6-digit OTP sent to +91 ${cleanMobile}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Driver Phone OTP
  const handleVerifyOtp = async () => {
    const cleanMobile = formData.mobile.replace(/\D/g, '').slice(-10);
    if (!otpInput || otpInput.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }

    try {
      setVerifyingOtp(true);
      await driverService.verifyOtp(cleanMobile, otpInput.trim());
      setFormData((prev) => ({ ...prev, isMobileVerified: true }));
      toast.success('Mobile number verified successfully! ✅');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Basic Info Validation
    if (!formData.name.trim()) {
      toast.error('Driver full name is mandatory.');
      setActiveTab('BASIC');
      return;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      setActiveTab('BASIC');
      return;
    }

    if (!formData.vehicleNumber.trim()) {
      toast.error('Vehicle registration number is mandatory (e.g. GJ-02-AB-1234).');
      setActiveTab('BASIC');
      return;
    }

    // 2. Compulsory KYC Validation
    if (!formData.licenseNumber || !formData.licenseNumber.trim()) {
      toast.error('Driving License Number is compulsory.');
      setActiveTab('KYC');
      return;
    }

    if (!formData.licenseFrontUrl) {
      toast.error('License Front Side photo is compulsory. Please upload.');
      setActiveTab('KYC');
      return;
    }

    if (!formData.licenseBackUrl) {
      toast.error('License Back Side photo is compulsory. Please upload.');
      setActiveTab('KYC');
      return;
    }

    if (!formData.aadharCardUrl) {
      toast.error('Aadhaar Card document / photo is compulsory. Please upload.');
      setActiveTab('KYC');
      return;
    }

    // 3. Security / Password Validation
    if (!editingDriver && (!formData.password || formData.password.trim().length < 4)) {
      toast.error('Please assign a login password (at least 4 characters) so driver can login.');
      setActiveTab('SECURITY');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        mobile: cleanMobile,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase()
      };

      if (editingDriver) {
        await driverService.updateDriver(editingDriver._id, payload);
        toast.success(`Driver ${formData.name} updated successfully.`);
      } else {
        await driverService.createDriver(payload);
        toast.success(`Driver ${formData.name} onboarded with credentials! 🚛`);
      }

      setModalOpen(false);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (driver) => {
    try {
      const res = await driverService.toggleStatus(driver._id);
      toast.success(res.data?.message || 'Driver status updated.');
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to remove driver ${driver.name} from your fleet?`)) {
      return;
    }

    try {
      await driverService.deleteDriver(driver._id);
      toast.success(`Driver ${driver.name} removed.`);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete driver.');
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery) ||
      d.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' ? true : d.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const availableCount = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const onDeliveryCount = drivers.filter((d) => d.status === 'ON_DELIVERY').length;
  const totalDeliveriesCount = drivers.reduce((acc, d) => acc + (d.totalDeliveries || 0), 0);

  if (loading) {
    return <LoadingSpinner message="Loading your driver fleet..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Add Driver Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            <span>Fleet & Logistics Management</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            Driver Onboarding & Fleet
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Onboard drivers with full KYC (License, Aadhaar, PAN, Photo), verify phone with OTP, assign login credentials, and track deliveries.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Fleet</span>
          <div className="text-2xl font-black text-white font-display">{drivers.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Available</span>
          <div className="text-2xl font-black text-emerald-400 font-display">{availableCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">On Delivery</span>
          <div className="text-2xl font-black text-amber-400 font-display">{onDeliveryCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trips Completed</span>
          <div className="text-2xl font-black text-white font-display">{totalDeliveriesCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver by name, phone, license, or vehicle plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'AVAILABLE', 'ON_DELIVERY', 'INACTIVE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Drivers' : st === 'AVAILABLE' ? 'Available' : st === 'ON_DELIVERY' ? 'On Delivery' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List / Cards */}
      {filteredDrivers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Drivers Found"
          description={
            searchQuery
              ? 'No drivers match your search query.'
              : "You haven't added any drivers yet. Add your drivers with full KYC and assigned login password!"
          }
          actionLabel={!searchQuery ? 'Add First Driver' : undefined}
          onAction={!searchQuery ? openAddModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const isAvailable = driver.status === 'AVAILABLE';
            const isOnDelivery = driver.status === 'ON_DELIVERY';
            const hasKyc = Boolean(driver.licenseFrontUrl || driver.aadharCardUrl || driver.panCardUrl);

            return (
              <div
                key={driver._id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-lg space-y-4 relative group overflow-hidden"
              >
                {/* Status Glow Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isAvailable ? 'bg-emerald-500' : isOnDelivery ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                />

                {/* Driver Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    {driver.photoUrl ? (
                      <img
                        src={driver.photoUrl}
                        alt={driver.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-amber-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700 font-black text-lg">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm">{driver.name}</h3>
                        {driver.isMobileVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified Mobile Number" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isOnDelivery
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-400 animate-pulse' : isOnDelivery ? 'bg-amber-400' : 'bg-slate-500'
                            }`}
                          />
                          {driver.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(driver)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Driver"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(driver)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Pill Grid */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Vehicle:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {driver.vehicleNumber} ({driver.vehicleType})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mobile:</span>
                    </span>
                    <span className="font-mono text-slate-200">+91 {driver.mobile}</span>
                  </div>

                  {driver.licenseNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span>License:</span>
                      </span>
                      <span className="font-mono text-slate-300">{driver.licenseNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Deliveries Completed:</span>
                    <span className="font-bold text-white">{driver.totalDeliveries || 0} Trips</span>
                  </div>
                </div>

                {/* KYC Preview Button if Docs exist */}
                <button
                  type="button"
                  onClick={() => openDocViewer(driver)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Driver KYC & Documents</span>
                  {hasKyc && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </button>

                {/* Quick Action Buttons: Call & WhatsApp */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:+91${driver.mobile}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Driver</span>
                  </a>

                  <a
                    href={`https://wa.me/91${driver.mobile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Onboard New Driver to Fleet'}
      >
        {/* Step / Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-4 pb-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('BASIC')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'BASIC'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Identity & Phone OTP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('KYC')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'KYC'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. License & KYC Docs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Login & Security
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAB 1: BASIC INFO & MOBILE OTP */}
          {activeTab === 'BASIC' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Driver Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Bhai Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Profile Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Driver Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  {formData.photoUrl ? (
                    <div className="relative">
                      <img
                        src={formData.photoUrl}
                        alt="Driver"
                        className="w-14 h-14 rounded-xl object-cover border border-amber-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex-1 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-950 transition-colors">
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-400">
                        {uploadingField === 'photoUrl' ? 'Uploading Photo...' : 'Upload Driver Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'photoUrl')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Mobile Number & OTP Verification */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    10-Digit Mobile Number (Login ID) *
                  </label>
                  {formData.isMobileVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400/90 font-semibold">Unverified</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9825012345"
                      value={formData.mobile}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          mobile: e.target.value.replace(/\D/g, ''),
                          isMobileVerified: false
                        });
                        setOtpSent(false);
                      }}
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {!formData.isMobileVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || otpTimer > 0 || formData.mobile.length !== 10}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : otpTimer > 0 ? (
                        `${otpTimer}s`
                      ) : (
                        'Send OTP'
                      )}
                    </button>
                  )}
                </div>

                {/* OTP Input Card */}
                {otpSent && !formData.isMobileVerified && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Enter 6-Digit OTP sent to driver's phone:</span>
                      {demoOtp && (
                        <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Demo: {demoOtp}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono text-white text-sm tracking-widest focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpInput.length !== 6}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Alternate Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Alternate Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Optional secondary contact"
                  value={formData.alternateMobile}
                  onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Vehicle Registration & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Vehicle Registration Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ-02-AB-1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tractor">Tractor (Single / Double Patiya)</option>
                    <option value="Dumper">Dumper (10 / 12 / 16 Wheel)</option>
                    <option value="Truck">Truck</option>
                    <option value="Other">Other Commercial Vehicle</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('KYC')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <span>Next: License & KYC</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LICENSE & KYC DOCUMENTS */}
          {activeTab === 'KYC' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Driving License Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ02 20180001234"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              {/* License Front & Back Side Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>License Front Side *</span>
                    <span className="text-[10px] text-amber-400 font-normal">Compulsory</span>
                  </label>
                  {formData.licenseFrontUrl ? (
                    <div className="relative p-2 bg-slate-950 rounded-xl border border-emerald-500/30">
                      <img
                        src={formData.licenseFrontUrl}
                        alt="License Front"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, licenseFrontUrl: '' })}
                        className="absolute top-3 right-3 bg-red-500 text-white p-1 rounded-full shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950 transition-colors h-28">
                      <UploadCloud className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">
                        {uploadingField === 'licenseFrontUrl' ? 'Uploading...' : 'Upload Front Side *'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'licenseFrontUrl')}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>License Back Side *</span>
                    <span className="text-[10px] text-amber-400 font-normal">Compulsory</span>
                  </label>
                  {formData.licenseBackUrl ? (
                    <div className="relative p-2 bg-slate-950 rounded-xl border border-emerald-500/30">
                      <img
                        src={formData.licenseBackUrl}
                        alt="License Back"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, licenseBackUrl: '' })}
                        className="absolute top-3 right-3 bg-red-500 text-white p-1 rounded-full shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950 transition-colors h-28">
                      <UploadCloud className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">
                        {uploadingField === 'licenseBackUrl' ? 'Uploading...' : 'Upload Back Side *'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'licenseBackUrl')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Aadhaar Card & PAN Card Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Aadhaar Card Photo *</span>
                    <span className="text-[10px] text-amber-400 font-normal">Compulsory</span>
                  </label>
                  {formData.aadharCardUrl ? (
                    <div className="relative p-2 bg-slate-950 rounded-xl border border-emerald-500/30">
                      <img
                        src={formData.aadharCardUrl}
                        alt="Aadhaar Card"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, aadharCardUrl: '' })}
                        className="absolute top-3 right-3 bg-red-500 text-white p-1 rounded-full shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950 transition-colors h-28">
                      <UploadCloud className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">
                        {uploadingField === 'aadharCardUrl' ? 'Uploading...' : 'Upload Aadhaar Card *'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'aadharCardUrl')}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    PAN Card Document (Optional)
                  </label>
                  {formData.panCardUrl ? (
                    <div className="relative p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <img
                        src={formData.panCardUrl}
                        alt="PAN Card"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, panCardUrl: '' })}
                        className="absolute top-3 right-3 bg-red-500 text-white p-1 rounded-full shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950 transition-colors h-28">
                      <UploadCloud className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">
                        {uploadingField === 'panCardUrl' ? 'Uploading...' : 'Upload PAN Card'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'panCardUrl')}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('BASIC')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('SECURITY')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer transition-colors"
                >
                  <span>Next: Login Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOGIN PASSWORD & SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4" />
                  <span>Assigned Driver App Credentials</span>
                </div>
                <p className="text-xs text-slate-400">
                  The driver will log in to the ANANTA Driver App using their <strong>Mobile Number (+91 {formData.mobile || 'XXXXXXXXXX'})</strong> and the Password you assign below.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {editingDriver ? 'Update Password (Leave blank to keep unchanged)' : 'Assign Login Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="e.g. Driver@1234 or PIN"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Expert driver for Vadagam & Sayala routes; reliable night deliveries"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('KYC')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Submit Footer */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{editingDriver ? 'Save Changes' : 'Complete Driver Onboarding'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Driver KYC & Document Inspection Viewer Modal */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title={selectedDriverDocs ? `KYC Documents: ${selectedDriverDocs.name}` : 'Driver KYC Documents'}
      >
        {selectedDriverDocs && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-400">Driver Name</div>
                <div className="font-bold text-white text-sm">{selectedDriverDocs.name}</div>
              </div>
              <div>
                <div className="text-slate-400">Mobile</div>
                <div className="font-mono text-amber-400">{selectedDriverDocs.mobile}</div>
              </div>
              <div>
                <div className="text-slate-400">Vehicle</div>
                <div className="font-mono text-white">{selectedDriverDocs.vehicleNumber}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Profile Photo */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Profile Photo</span>
                {selectedDriverDocs.photoUrl ? (
                  <img
                    src={selectedDriverDocs.photoUrl}
                    alt="Driver Portrait"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No photo uploaded
                  </div>
                )}
              </div>

              {/* License Details */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">
                  License Front ({selectedDriverDocs.licenseNumber || 'N/A'})
                </span>
                {selectedDriverDocs.licenseFrontUrl ? (
                  <img
                    src={selectedDriverDocs.licenseFrontUrl}
                    alt="License Front"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No license front photo
                  </div>
                )}
              </div>

              {/* License Back */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">License Back Side</span>
                {selectedDriverDocs.licenseBackUrl ? (
                  <img
                    src={selectedDriverDocs.licenseBackUrl}
                    alt="License Back"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No license back photo
                  </div>
                )}
              </div>

              {/* Aadhaar Card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Aadhaar Card</span>
                {selectedDriverDocs.aadharCardUrl ? (
                  <img
                    src={selectedDriverDocs.aadharCardUrl}
                    alt="Aadhaar Card"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No Aadhaar card uploaded
                  </div>
                )}
              </div>

              {/* PAN Card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-slate-300 block">PAN Card</span>
                {selectedDriverDocs.panCardUrl ? (
                  <img
                    src={selectedDriverDocs.panCardUrl}
                    alt="PAN Card"
                    className="w-full h-44 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-28 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No PAN card uploaded
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

