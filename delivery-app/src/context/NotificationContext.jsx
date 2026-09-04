import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';
import { getSocket, reconnectSocket } from '../utils/socket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getNotifications();
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    const socket = reconnectSocket();

    const handleNewOrder = (data) => {
      fetchNotifications();
      toast.success(
        `🚨 New Order #${data.order?.orderNumber || ''}: ${data.order?.productNameSnapshot || 'Materials'} placed!`,
        { duration: 8000 }
      );
    };

    const handleOrderAccepted = (data) => {
      fetchNotifications();
      toast.success(
        `✓ Order #${data.orderNumber} has been accepted by dealer! Dispatch in progress.`,
        { duration: 8000 }
      );
    };

    const handleDeliveryStatusUpdate = (data) => {
      fetchNotifications();
      toast.info(
        `🚚 Order #${data.orderNumber} status updated: ${data.orderStatus}`,
        { duration: 6000 }
      );
    };

    const handleOrderEscalated = (data) => {
      fetchNotifications();
      toast.error(
        `⚠️ ESCALATION: Order #${data.orderNumber} 15-min timeout! Immediate action required.`,
        { duration: 10000 }
      );
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_accepted', handleOrderAccepted);
    socket.on('delivery_status_update', handleDeliveryStatusUpdate);
    socket.on('order_escalated', handleOrderEscalated);

    const interval = setInterval(fetchNotifications, 20000);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_accepted', handleOrderAccepted);
      socket.off('delivery_status_update', handleDeliveryStatusUpdate);
      socket.off('order_escalated', handleOrderEscalated);
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.id]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
