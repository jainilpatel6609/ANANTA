import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, MapPin, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    userType: 'Contractor',
    requirement: '',
    tonnage: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Your requirement enquiry has been dispatched to our central desk.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider">
          Direct Dispatch Office
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display">
          Contact ANANTA TRADERS
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Need bulk project supply, dealer onboarding, or custom riverbed sourcing? Speak directly with our dispatch supervisors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact info cards */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white">Central Dispatch Hotline</h4>
            <p className="text-xs text-slate-400">Direct phone line for instant fleet booking & delivery inquiries.</p>
            <a href="tel:+919876543210" className="text-brand-400 font-bold text-sm block font-mono">
              +91 98765 43210
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white">WhatsApp Dispatch Desk</h4>
            <p className="text-xs text-slate-400">Share site location pins, weighbridge queries, and bulk RFQs.</p>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-bold text-sm block"
            >
              Chat on WhatsApp &rarr;
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white">Headquarters</h4>
            <p className="text-xs text-slate-300">
              Commercial Logistics Terminal, Mehsana - Ahmedabad Highway, Gujarat 384002
            </p>
          </div>
        </div>

        {/* Enquiry form */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">Enquiry Received!</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Our logistics manager will call you at <span className="text-slate-200 font-semibold">{formData.phone}</span> within 15 minutes.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="text-xl font-bold text-white font-display">Direct Material Supply RFQ</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Mobile / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Your Business Role
                  </label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Contractor">Infrastructure Contractor</option>
                    <option value="Builder">Residential / Commercial Builder</option>
                    <option value="Trader">Material Trader / Supplier</option>
                    <option value="Individual">Direct Construction Owner</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Estimated Monthly Tonnage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 Tons / Month"
                    value={formData.tonnage}
                    onChange={(e) => setFormData({ ...formData, tonnage: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Project Location & Material Requirement Details
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Mention site delivery location (e.g. Sanand GIDC, SG Highway), preferred aggregate size or sand origin..."
                  value={formData.requirement}
                  onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
              >
                <Send className="w-4 h-4" />
                Submit Supply Enquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
