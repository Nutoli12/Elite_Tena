import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/axios';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.walletAddress) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    // Identify user to server
    socket.emit('identify', user.walletAddress);

    // Listen for new notifications
    socket.on('notification', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound
      playNotificationSound();
      
      // Show browser notification if permitted
      showBrowserNotification(notification);
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      socket.emit('identify', user.walletAddress);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    // Load initial notifications
    loadNotifications();

    return () => {
      socket.disconnect();
    };
  }, [user?.walletAddress]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user?.walletAddress || !user?.role) return;

    setLoading(true);
    try {
      // Get notifications
      const response = await axios.get('/notifications', {
        params: { limit: 20 },
        headers: {
          'x-user-role': user.role,
          'x-wallet-address': user.walletAddress
        }
      });

      // Get unread count
      const countResponse = await axios.get('/notifications/unread-count', {
        headers: {
          'x-user-role': user.role,
          'x-wallet-address': user.walletAddress
        }
      });

      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(countResponse.data.data?.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.walletAddress || !user?.role) return;

    try {
      await axios.patch('/notifications/mark-read', {
        notificationIds: [notificationId]
      }, {
        headers: {
          'x-user-role': user.role,
          'x-wallet-address': user.walletAddress
        }
      });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.walletAddress || !user?.role) return;

    try {
      await axios.patch('/notifications/mark-read', {
        markAll: true
      }, {
        headers: {
          'x-user-role': user.role,
          'x-wallet-address': user.walletAddress
        }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user?.walletAddress || !user?.role) return;

    try {
      // For now, just mark as read since we don't have delete endpoint
      await markAsRead(notificationId);
      
      // Optionally hide from UI
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore if autoplay is blocked
      });
    } catch (error) {
      // Ignore sound errors
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        badge: '/logo.png'
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const getTypeIcon = () => {
    // Return appropriate icon based on notification type
    return '📬';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          requestNotificationPermission();
        }}
        className="relative p-2 text-gray-600 dark:text-slate-300 hover:text-medical-600 dark:hover:text-medical-400 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 max-h-[600px] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-medical-600 dark:text-medical-400 hover:text-medical-700 dark:hover:text-medical-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <div className="animate-spin w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                        !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getTypeIcon()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                {notification.createdAt ? 
                                  (() => {
                                    try {
                                      const date = new Date(notification.createdAt);
                                      return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true });
                                    } catch (error) {
                                      return 'Just now';
                                    }
                                  })()
                                  : 'Just now'
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                                title="Delete"
                              >
                                <X className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                              </button>
                            </div>
                          </div>
                          {notification.priority === 'urgent' && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded">
                              URGENT
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-slate-700 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to notifications page if it exists
                  }}
                  className="text-sm text-medical-600 dark:text-medical-400 hover:text-medical-700 dark:hover:text-medical-300 font-medium"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
