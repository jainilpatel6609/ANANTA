import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCheck, Package, Clock, Truck, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

export default function UserNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Notifications</h1>
          <p className="text-xs text-slate-400">Real-time alerts for dispatch, OTPs, and delivery milestones</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-brand-400 hover:bg-slate-800 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You are all caught up! Updates regarding your material orders will show up here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && markAsRead(n._id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                n.isRead
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-slate-900 border-brand-500/30 text-slate-200 shadow-md shadow-brand-500/5'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  n.isRead ? 'bg-slate-800 text-slate-500' : 'bg-brand-500/10 text-brand-400'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{n.title}</h4>
                  <span className="text-[10px] text-slate-500">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-xs leading-relaxed">{n.message}</p>
              </div>

              {!n.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
