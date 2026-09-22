import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, MapPin, Send, CheckCircle2, Sparkles } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-14 select-none">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          Direct Dispatch Office
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          Contact ANANTA TRADERS
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
          Need bulk project supply, dealer onboarding, or custom riverbed sourcing? Speak directly with our dispatch supervisors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-inner">
              <Phone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">Central Dispatch Hotline</h3>
            <p className="text-xs text-slate-400 font-medium">Direct phone line for instant fleet booking & delivery inquiries.</p>
            <a href="tel:+919876543210" className="text-brand-400 font-black text-base block font-mono">
              +91 98765 43210
            </a>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">WhatsApp Dispatch Desk</h3>
            <p className="text-xs text-slate-400 font-medium">Share site location pins, weighbridge queries, and bulk RFQs.</p>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-black text-xs block hover:underline"
            >
              Chat on WhatsApp &rarr;
            </a>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <MapPin className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">Logistics Headquarters</h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Commercial Logistics Terminal, Mehsana - Ahmedabad Highway, Gujarat 384002
            </p>
          </div>
        </div>

        {/* RFQ Form */}
        <div className="lg:col-span-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-2xl font-black text-white font-display">Enquiry Received!</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-medium">
                Our logistics supervisor will call you at <span className="text-white font-bold">{formData.phone}</span> within 15 minutes.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs active:scale-95 transition-all shadow-md shadow-slate-900/20"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-xl font-black text-white font-display">Direct Material Supply RFQ</h3>
                <p className="text-xs text-slate-400 mt-1">Get verified quarry quotations delivered directly to your WhatsApp.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Mobile / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Business Role
                  </label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="app-select w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    <option value="Contractor">Infrastructure Contractor</option>
                    <option value="Builder">Residential / Commercial Builder</option>
                    <option value="Trader">Material Trader / Supplier</option>
                    <option value="Individual">Direct Site Owner</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Monthly Tonnage (Approx)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 Tons / Month"
                    value={formData.tonnage}
                    onChange={(e) => setFormData({ ...formData, tonnage: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Project Location & Requirements
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Site drop location (e.g. Sanand GIDC, SG Highway), preferred aggregate specification, sand origin..."
                  value={formData.requirement}
                  onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-black text-sm transition-all shadow-xl shadow-slate-900/25 active:scale-95"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>Submit Supply Enquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
