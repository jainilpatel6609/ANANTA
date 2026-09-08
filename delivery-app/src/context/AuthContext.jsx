import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, driverService } from '../services';
import { requestAndRegisterDevicePush, unregisterDevicePush, getPushPermissionState } from '../utils/fcm';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ananta_token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('ananta_token');
      const storedUser = localStorage.getItem('ananta_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // Auto-register device push if permission already granted
          if (getPushPermissionState() === 'granted' && (parsedUser.role === 'DEALER' || parsedUser.role === 'ADMIN')) {
            requestAndRegisterDevicePush().catch(() => {});
          }

          // Refresh user profile from server in background
          const res = await authService.getMe();
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('ananta_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (mobile, password, expectedRole, locationData = {}) => {
    try {
      const res = await authService.login(mobile, password, expectedRole, locationData);
      const { token: newToken, user: authUser } = res.data;

      localStorage.setItem('ananta_token', newToken);
      localStorage.setItem('ananta_user', JSON.stringify(authUser));

      setToken(newToken);
      setUser(authUser);
      toast.success(`Welcome back, ${authUser.name}!`);
      return authUser;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      const { token: newToken, user: authUser } = res.data;

      localStorage.setItem('ananta_token', newToken);
      localStorage.setItem('ananta_user', JSON.stringify(authUser));

      setToken(newToken);
      setUser(authUser);
      toast.success('Registration successful! Welcome to ANANTA TRADERS.');
      return authUser;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const registerDealer = async (dealerData) => {
    try {
      const res = await authService.registerDealer(dealerData);
      const { token: newToken, user: authUser } = res.data;

      localStorage.setItem('ananta_token', newToken);
      localStorage.setItem('ananta_user', JSON.stringify(authUser));

      setToken(newToken);
      setUser(authUser);
      toast.success('Authorized Dealer registration successful! Welcome to ANANTA TRADERS.');
      return authUser;
    } catch (error) {
      toast.error(error.message || 'Dealer registration failed');
      throw error;
    }
  };

  const registerSuperAdmin = async (adminData) => {
    try {
      const res = await authService.registerSuperAdmin(adminData);
      const { token: newToken, user: authUser } = res.data;

      localStorage.setItem('ananta_token', newToken);
      localStorage.setItem('ananta_user', JSON.stringify(authUser));

      setToken(newToken);
      setUser(authUser);
      toast.success('Super Admin account created successfully! Welcome to Executive Command.');
      return authUser;
    } catch (error) {
      toast.error(error.message || 'Super Admin creation failed');
      throw error;
    }
  };

  const driverLogin = async (mobile, pin) => {
    try {
      const res = await driverService.driverLogin(mobile, pin);
      const authData = res.data || res;
      const { token: newToken, user: authUser } = authData;

      localStorage.setItem('ananta_token', newToken);
      localStorage.setItem('ananta_user', JSON.stringify(authUser));

      setToken(newToken);
      setUser(authUser);
      toast.success(`Welcome back, Driver ${authUser?.name || ''}!`);
      return authUser;
    } catch (error) {
      toast.error(error.message || 'Driver login failed');
      throw error;
    }
  };

  const logout = () => {
    unregisterDevicePush().catch(() => {});
    localStorage.removeItem('ananta_token');
    localStorage.removeItem('ananta_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const updateUser = (updatedUser, newToken) => {
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('ananta_user', JSON.stringify(updatedUser));
    }
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('ananta_token', newToken);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    driverLogin,
    register,
    registerDealer,
    logout,
    updateUser,
    isAuthenticated: Boolean(token && user),
    isUser: user?.role === 'USER' || user?.role === 'CUSTOMER',
    isDealer: user?.role === 'DEALER',
    isDriver: user?.role === 'DRIVER',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
