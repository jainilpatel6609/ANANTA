import React, { useState, useEffect } from 'react';
import { dealerService, pincodeService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import DealerDumpersModal from '../../components/DealerDumpersModal';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  Building2,
  PlusCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Edit2,
  Trash2,
  Power,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DealerManagement() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Dealer Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    companyName: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    officeAddress: '',
    password: ''
  });
  const [pincodeValidation, setPincodeValidation] = useState({
    valid: null,
    message: '',
    loading: false
  });
  const [adding, setAdding] = useState(false);

  // Edit Dealer Modal
  const [editModalDealer, setEditModalDealer] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    officeAddress: ''
  });
  const [editPincodeValidation, setEditPincodeValidation] = useState({
    valid: null,
    message: '',
    loading: false
  });
  const [updating, setUpdating] = useState(false);

  // Delete Dealer Confirmation Modal
  const [deleteModalDealer, setDeleteModalDealer] = useState(null);
  const [dumperModalDealer, setDumperModalDealer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset Password Modal
  const [resetModalDealer, setResetModalDealer] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Toggle Confirm
  const [toggleDealer, setToggleDealer] = useState(null);

  const loadDealers = async () => {
    try {
      const res = await dealerService.getAllDealers();
      if (res.data?.dealers) {
        setDealers(res.data.dealers);
      }
    } catch (err) {
      toast.error('Failed to load dealer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealers();
  }, []);

  const handlePincodeChange = async (val) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    setAddForm((prev) => ({ ...prev, pincode: numericVal }));

    if (numericVal.length === 0) {
      setPincodeValidation({ valid: null, message: '', loading: false });
      return;
    }

    if (numericVal.length < 6) {
      setPincodeValidation({
        valid: false,
        message: `Must be 6 digits (${6 - numericVal.length} more needed)`,
        loading: false
      });
      return;
    }

    if (numericVal.length === 6) {
      if (!/^[1-9][0-9]{5}$/.test(numericVal)) {
        setPincodeValidation({
          valid: false,
          message: 'Invalid PIN format. First digit must be 1-9.',
          loading: false
        });
        return;
      }

      setPincodeValidation({ valid: null, message: 'Validating PIN...', loading: true });
      try {
        const res = await pincodeService.lookup(numericVal);
        const geo = res.data;
        if (geo?.city) {
          setPincodeValidation({
            valid: true,
            message: `✓ Valid PIN Code (${geo.city}, ${geo.state})`,
            loading: false
          });
          setAddForm((prev) => ({
            ...prev,
            city: prev.city || geo.city,
            state: prev.state || geo.state
          }));
        }
      } catch (err) {
        setPincodeValidation({
          valid: false,
          message: err.response?.data?.message || 'Invalid or unrecognized PIN code.',
          loading: false
        });
      }
    }
  };

  const handleAddDealer = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.mobile || !addForm.password) {
      toast.error('Name, mobile number, and initial password are required.');
      return;
    }

    if (!addForm.pincode || !/^[1-9][0-9]{5}$/.test(addForm.pincode.trim())) {
      toast.error('Mandatory 6-digit Indian PIN code is required for dealer dispatch assignment.');
      return;
    }

    setAdding(true);
    try {
      await dealerService.createDealer(addForm);
      toast.success('Dealer registered successfully with geo coordinates!');
      setAddModalOpen(false);
      setAddForm({
        name: '',
        companyName: '',
        mobile: '',
        whatsappNumber: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        area: '',
        city: '',
        state: 'Gujarat',
        pincode: '',
        officeAddress: '',
        password: ''
      });
      setPincodeValidation({ valid: null, message: '', loading: false });
      loadDealers();
    } catch (err) {
      toast.error(err.message || 'Failed to create dealer');
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (dealer) => {
    setEditModalDealer(dealer);
    setEditForm({
      name: dealer.name || '',
      companyName: dealer.companyName || '',
      mobile: dealer.mobile || '',
      whatsappNumber: dealer.whatsappNumber || dealer.mobile || '',
      email: dealer.email || '',
      addressLine1: dealer.addressLine1 || '',
      addressLine2: dealer.addressLine2 || '',
      area: dealer.area || '',
      city: dealer.city || '',
      state: dealer.state || 'Gujarat',
      pincode: dealer.pincode || '',
      officeAddress: dealer.officeAddress || ''
    });
    setEditPincodeValidation({
      valid: dealer.pincode && /^[1-9][0-9]{5}$/.test(dealer.pincode) ? true : null,
      message: dealer.pincode && /^[1-9][0-9]{5}$/.test(dealer.pincode) ? '✓ Registered PIN Code' : '',
      loading: false
    });
  };

  const handleEditPincodeChange = async (val) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    setEditForm((prev) => ({ ...prev, pincode: numericVal }));

    if (numericVal.length === 0) {
      setEditPincodeValidation({ valid: null, message: '', loading: false });
      return;
    }

    if (numericVal.length < 6) {
      setEditPincodeValidation({
        valid: false,
        message: `Must be 6 digits (${6 - numericVal.length} more needed)`,
        loading: false
      });
      return;
    }

    if (numericVal.length === 6) {
      if (!/^[1-9][0-9]{5}$/.test(numericVal)) {
        setEditPincodeValidation({
          valid: false,
          message: 'Invalid PIN format. First digit must be 1-9.',
          loading: false
        });
        return;
      }

      setEditPincodeValidation({ valid: null, message: 'Validating PIN...', loading: true });
      try {
        const res = await pincodeService.lookup(numericVal);
        const geo = res.data;
        if (geo?.city) {
          setEditPincodeValidation({
            valid: true,
            message: `✓ Valid PIN Code (${geo.city}, ${geo.state})`,
            loading: false
          });
          setEditForm((prev) => ({
            ...prev,
            city: prev.city || geo.city,
            state: prev.state || geo.state
          }));
        }
      } catch (err) {
        setEditPincodeValidation({
          valid: false,
          message: err.response?.data?.message || 'Invalid or unrecognized PIN code.',
          loading: false
        });
      }
    }
  };

  // Submit Edit Dealer
  const handleUpdateDealer = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.name.trim()) {
      toast.error('Dealer representative name is required.');
      return;
    }

    if (!editForm.mobile || !/^[6-9]\d{9}$/.test(editForm.mobile.trim())) {
      toast.error('Dealer phone number must contain exactly 10 digits and follow Indian mobile format.');
      return;
    }

    if (editForm.pincode && !/^[1-9][0-9]{5}$/.test(editForm.pincode.trim())) {
      toast.error('PIN code must be exactly 6 numeric digits.');
      return;
    }

    setUpdating(true);
    try {
      await dealerService.updateDealer(editModalDealer._id, editForm);
      toast.success('✓ Dealer phone number updated successfully.');
      setEditModalDealer(null);
      loadDealers();
    } catch (err) {
      toast.error(err.message || 'Failed to update dealer');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Dealer
  const handleDeleteDealer = async () => {
    if (!deleteModalDealer) return;
    setDeleting(true);
    try {
      await dealerService.deleteDealer(deleteModalDealer._id);
      toast.success(`✓ Dealer ${deleteModalDealer.companyName || deleteModalDealer.name} deleted successfully.`);
      setDeleteModalDealer(null);
      loadDealers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete dealer');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleDealer) return;
    try {
      await dealerService.toggleStatus(toggleDealer._id);
      toast.success(`Dealer ${toggleDealer.name} status updated.`);
      loadDealers();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setResetting(true);
    try {
      await dealerService.resetPassword(resetModalDealer._id, newPassword.trim());
      toast.success(`Password reset successfully for ${resetModalDealer.name}`);
      setResetModalDealer(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dealer network..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Dealer Partner Network</h1>
          <p className="text-xs text-slate-400">
            Manage authorized supply and fleet dispatch partners across Gujarat's quarry zones.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Add Authorized Dealer
        </button>
      </div>

      {/* Dealers Table */}
      {dealers.length === 0 ? (
        <EmptyState
          title="No dealers registered"
          description="Register dealers to enable order dispatching and fleet fulfillment."
          actionText="Add Dealer"
          onAction={() => setAddModalOpen(true)}
          icon={Building2}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Dealership / Firm</th>
                  <th className="px-4 py-3.5">Depot PIN & Location</th>
                  <th className="px-4 py-3.5">Contact Line</th>
                  <th className="px-4 py-3.5">Dumpers</th>
                  <th className="px-4 py-3.5">Total Deliveries</th>
                  <th className="px-4 py-3.5">Fulfillment Rate</th>
                  <th className="px-4 py-3.5">Total Revenue</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dealers.map((dealer) => (
                  <tr key={dealer._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm">{dealer.companyName || dealer.name}</div>
                      <div className="text-[10px] text-slate-400">Rep: {dealer.name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{dealer.city || 'Gujarat'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold text-[10px] border border-amber-500/20">
                          {dealer.pincode || 'No PIN'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">
                        {dealer.addressLine1 || dealer.officeAddress || 'No address set'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <div className="text-slate-200">{dealer.mobile}</div>
                      <div className="text-[10px] text-slate-500">{dealer.email || 'No email'}</div>
                    </td>
                    <td className="px-4 py-3.5 min-w-[190px]">
                      <div className="font-bold text-white font-mono">Total Dumpers: {dealer.dumperSummary?.total || 0}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-400">Available: {dealer.dumperSummary?.available || 0}</span>
                        {' | '}
                        <span className="text-amber-400">In Order: {dealer.dumperSummary?.inOrder || 0}</span>
                        {' | '}
                        <span>Disabled: {dealer.dumperSummary?.disabled || 0}</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[10px] font-mono text-slate-500">
                        {[10, 12, 14, 16, 18].map((w) => {
                          const b = dealer.dumperSummary?.wheels?.[w] || { available: 0, inOrder: 0 };
                          return (
                            <div key={w}>{w}W: {b.available} Available | {b.inOrder} In Order</div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white font-mono">{dealer.stats?.completedOrders || 0} completed</div>
                      <div className="text-[10px] text-slate-500">{dealer.stats?.totalOrders || 0} total assigned</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 font-mono">
                          {dealer.stats?.completionRate || 100}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-400">
                      {formatINR(dealer.stats?.totalRevenue || 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          dealer.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {dealer.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDumperModalDealer(dealer)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-xs border border-sky-500/20 transition-all shadow-sm"
                          title="View / manage this dealer's dumpers"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dumpers</span>
                        </button>

                        <button
                          onClick={() => openEditModal(dealer)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/20 transition-all shadow-sm"
                          title="Edit Dealer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteModalDealer(dealer)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 transition-all shadow-sm"
                          title="Delete Dealer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          onClick={() => setResetModalDealer(dealer)}
                          title="Reset Password"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setToggleDealer(dealer)}
                          title={dealer.isActive ? 'Deactivate Dealer' : 'Activate Dealer'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            dealer.isActive
                              ? 'bg-rose-950/40 border-rose-800/40 text-rose-400 hover:bg-rose-900/60'
                              : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dealer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Authorized Dealer"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAddDealer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Suresh Parmar"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Dealership / Transport Firm Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sabarmati Logistics Co"
                value={addForm.companyName}
                onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Primary Mobile (Dealer Login) *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile"
                value={addForm.mobile}
                onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                WhatsApp Dispatch Alerts Phone
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit WhatsApp"
                value={addForm.whatsappNumber}
                onChange={(e) => setAddForm({ ...addForm, whatsappNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Initial Password *
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="dealer@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Physical Address Fields */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Depot Physical Address & Mandatory PIN Code
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Address Line 1 (Street/Depot) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway Logistics Hub"
                  value={addForm.addressLine1}
                  onChange={(e) => setAddForm({ ...addForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Area / Locality *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GIDC Industrial Area"
                  value={addForm.area}
                  onChange={(e) => setAddForm({ ...addForm, area: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">
                    PIN Code *
                  </label>
                  {pincodeValidation.loading && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 digits (e.g. 384001)"
                  value={addForm.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white font-mono font-bold tracking-wider focus:outline-none ${
                    pincodeValidation.valid === true
                      ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-300'
                      : pincodeValidation.valid === false
                      ? 'border-rose-500/80 bg-rose-950/20 text-rose-300'
                      : 'border-slate-700 focus:border-amber-500'
                  }`}
                />
                {pincodeValidation.message && (
                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1 font-medium ${
                      pincodeValidation.valid === true
                        ? 'text-emerald-400'
                        : pincodeValidation.valid === false
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {pincodeValidation.valid === true ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : pincodeValidation.valid === false ? (
                      <XCircle className="w-3 h-3 shrink-0" />
                    ) : null}
                    <span>{pincodeValidation.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mehsana"
                  value={addForm.city}
                  onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gujarat"
                  value={addForm.state}
                  onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Register Dealer
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={Boolean(resetModalDealer)}
        onClose={() => setResetModalDealer(null)}
        title={`Reset Password for ${resetModalDealer?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetModalDealer(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all"
            >
              {resetting ? 'Resetting...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(toggleDealer)}
        onClose={() => setToggleDealer(null)}
        onConfirm={handleToggleStatus}
        title={toggleDealer?.isActive ? 'Deactivate Dealer Account?' : 'Activate Dealer Account?'}
        message={
          toggleDealer?.isActive
            ? `Deactivating ${toggleDealer?.name} will prevent them from accepting new orders while preserving all historical delivery records.`
            : `Re-activating ${toggleDealer?.name} will allow them to access new dispatch pools.`
        }
        confirmText={toggleDealer?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleDealer?.isActive}
      />

      {/* Edit Dealer Modal */}
      <Modal
        isOpen={Boolean(editModalDealer)}
        onClose={() => setEditModalDealer(null)}
        title="Edit Dealer"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUpdateDealer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Dealer Representative Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Suresh Parmar"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Dealership / Firm Name
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Traders"
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile"
                value={editForm.mobile}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">10-digit Indian phone number for dealer login & dispatch.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit WhatsApp"
                value={editForm.whatsappNumber}
                onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="dealer@example.com"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Physical Address Fields */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Depot Physical Address & Registered PIN Code
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  placeholder="e.g. Highway Logistics Hub"
                  value={editForm.addressLine1}
                  onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Area / Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. GIDC Industrial Area"
                  value={editForm.area}
                  onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">
                    PIN Code
                  </label>
                  {editPincodeValidation.loading && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 digits (e.g. 384001)"
                  value={editForm.pincode}
                  onChange={(e) => handleEditPincodeChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white font-mono font-bold tracking-wider focus:outline-none ${
                    editPincodeValidation.valid === true
                      ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-300'
                      : editPincodeValidation.valid === false
                      ? 'border-rose-500/80 bg-rose-950/20 text-rose-300'
                      : 'border-slate-700 focus:border-amber-500'
                  }`}
                />
                {editPincodeValidation.message && (
                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1 font-medium ${
                      editPincodeValidation.valid === true
                        ? 'text-emerald-400'
                        : editPincodeValidation.valid === false
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {editPincodeValidation.valid === true ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : editPincodeValidation.valid === false ? (
                      <XCircle className="w-3 h-3 shrink-0" />
                    ) : null}
                    <span>{editPincodeValidation.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mehsana"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gujarat"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditModalDealer(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Update Dealer
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dealer Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteModalDealer)}
        onClose={() => setDeleteModalDealer(null)}
        title="⚠️ Delete Dealer?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs space-y-3">
            <p className="text-slate-300">
              Are you sure you want to delete:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
              <div className="text-sm font-bold text-white">
                {deleteModalDealer?.companyName || deleteModalDealer?.name}
              </div>
              <div className="text-xs text-amber-400">
                Phone: <span className="text-white font-bold">{deleteModalDealer?.mobile}</span>
              </div>
              {deleteModalDealer?.city && (
                <div className="text-[11px] text-slate-400">
                  Location: {deleteModalDealer.city} (PIN {deleteModalDealer.pincode})
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              This action cannot be undone. Historical order records will remain safely preserved.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalDealer(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDealer}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Dealer
            </button>
          </div>
        </div>
      </Modal>

      <DealerDumpersModal
        dealer={dumperModalDealer}
        onClose={() => setDumperModalDealer(null)}
        onChanged={loadDealers}
      />
    </div>
  );
}
