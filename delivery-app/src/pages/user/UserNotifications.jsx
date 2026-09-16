import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCheck, Package, Clock, Truck, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

export default function UserNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Helper to pick contextual icon based on notification content
  const getNotificationIcon = (item) => {
    const text = (item.title + ' ' + item.message).toLowerCase();
    if (text.includes('otp')) return KeyRound;
    if (text.includes('dispatch') || text.includes('driver') || text.includes('truck')) return Truck;
    if (text.includes('deliver') || text.includes('verified')) return ShieldCheck;
    if (text.includes('order') || text.includes('placed')) return Package;
    return Bell;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 select-none">
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Real-time alerts for dispatch, OTPs, and delivery milestones</p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-amber-600" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You are all caught up! Updates regarding your material orders and live vehicle dispatches will appear here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = getNotificationIcon(n);
            return (
              <div
                key={n._id}
                onClick={() => !n.isRead && markAsRead(n._id)}
                className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 active:scale-[0.99] ${
                  n.isRead
                    ? 'bg-slate-50/60 border-slate-200/70 text-slate-500 hover:bg-slate-50'
                    : 'bg-white border-amber-300 text-slate-800 shadow-xs hover:border-amber-400'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl shrink-0 transition-colors ${
                    n.isRead
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{n.message}</p>
                </div>

                {!n.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-2 ring-4 ring-amber-500/20" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
