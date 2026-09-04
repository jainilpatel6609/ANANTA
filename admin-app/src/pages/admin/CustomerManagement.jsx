import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/formatters';
import { Users, Search, Building2, Phone, Mail, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users directory
        const res = await api.get('/admin/orders'); // Or fetch users
        // Let's get distinct customers from recent orders or custom endpoint
        const usersRes = await api.get('/admin/dashboard');
        if (usersRes.data?.recentOrders) {
          const map = {};
          usersRes.data.recentOrders.forEach((o) => {
            if (o.userId && !map[o.userId._id]) {
              map[o.userId._id] = o.userId;
            }
          });
          setUsers(Object.values(map));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading customer directory..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Customer & Builder Directory</h1>
        <p className="text-xs text-slate-400">
          Directory of registered builders, infrastructure contractors, and traders placing material orders.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Customer Name & Firm</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Contact Line</th>
                <th className="px-4 py-3.5">GST Number</th>
                <th className="px-4 py-3.5">Billing Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-white text-sm">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.companyName || 'Individual'}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold text-[10px]">
                      {u.userType || 'Contractor'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono">
                    <div className="text-slate-200">{u.mobile}</div>
                    <div className="text-[10px] text-slate-500">{u.email || 'No email'}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold uppercase">
                    {u.gstNumber || 'Unregistered'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                    {u.officeAddress || 'Standard Site Address'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
