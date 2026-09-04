import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import AdminLayout from '../layouts/AdminLayout';

// Guard
import ProtectedRoute from './ProtectedRoute';

// Auth Pages
import AdminLogin from '../pages/auth/AdminLogin';
import AdminRegister from '../pages/auth/AdminRegister';

// Admin Operations Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import TodaysOrders from '../pages/admin/TodaysOrders';
import OrderManagement from '../pages/admin/OrderManagement';
import DealerManagement from '../pages/admin/DealerManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import DriverManagement from '../pages/admin/DriverManagement';
import ProductManagement from '../pages/admin/ProductManagement';
import LocationManagement from '../pages/admin/LocationManagement';
import VehicleManagement from '../pages/admin/VehicleManagement';
import DeliveryMonitoring from '../pages/admin/DeliveryMonitoring';
import Reports from '../pages/admin/Reports';
import AdminProfile from '../pages/admin/AdminProfile';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Super Admin Authentication */}
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/register" element={<AdminRegister />} />

      {/* Super Admin Protected Back-Office Portal */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/todays-orders" element={<TodaysOrders />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/dealers" element={<DealerManagement />} />
          <Route path="/drivers" element={<DriverManagement />} />
          <Route path="/users" element={<CustomerManagement />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/materials" element={<ProductManagement />} />
          <Route path="/locations" element={<LocationManagement />} />
          <Route path="/vehicles" element={<VehicleManagement />} />
          <Route path="/deliveries" element={<DeliveryMonitoring />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<AdminProfile />} />
          <Route path="/settings" element={<AdminProfile />} />
        </Route>
      </Route>

      {/* Fallback to Login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
