import React, { useState } from 'react';
import Modal from './Modal';
import { helpService } from '../services';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HelpRequestModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    address: user?.officeAddress || '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.mobile.trim() || !formData.address.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await helpService.create(formData);
      toast.success('Help request submitted. Our team will reach out shortly.');
      setFormData({
        name: user?.name || '',
        mobile: user?.mobile || '',
        address: user?.officeAddress || '',
        message: ''
      });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit help request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help & Support" maxWidth="max-w-md">
      <div className="flex items-center gap-2.5 mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <LifeBuoy className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-[11px] text-slate-300 font-medium">
          Facing an issue? Share your details below and our support team will contact you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Ramesh Kumar"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
            Mobile Number *
          </label>
          <input
            type="tel"
            required
            maxLength={10}
            placeholder="10-digit mobile number"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
            Address *
          </label>
          <textarea
            required
            rows={2}
            placeholder="Your site / office address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white resize-none focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
            Support Message *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe the issue you're facing..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white resize-none focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 active:scale-95"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Submit</span>
        </button>
      </form>
    </Modal>
  );
}
