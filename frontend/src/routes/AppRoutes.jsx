import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import DealerLayout from '../layouts/DealerLayout';
import AdminLayout from '../layouts/AdminLayout';

// Guard
import ProtectedRoute from './ProtectedRoute';

// Public Pages
import Home from '../pages/public/Home';
import Products from '../pages/public/Products';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import RoleSelection from '../pages/public/RoleSelection';
import AuthSuccessAnimation from '../pages/public/AuthSuccessAnimation';

// User Pages
import UserDashboard from '../pages/user/UserDashboard';
import CreateOrder from '../pages/user/CreateOrder';
import MyOrders from '../pages/user/MyOrders';
import OrderDetails from '../pages/user/OrderDetails';
import UserProfile from '../pages/user/UserProfile';
import UserNotifications from '../pages/user/UserNotifications';

// Dealer Pages
import DealerDashboard from '../pages/dealer/DealerDashboard';
import NewOrders from '../pages/dealer/NewOrders';
import AcceptedOrders from '../pages/dealer/AcceptedOrders';
import ActiveDeliveries from '../pages/dealer/ActiveDeliveries';
import CompletedDeliveries from '../pages/dealer/CompletedDeliveries';
import DriverManagement from '../pages/dealer/DriverManagement';
import DealerProfile from '../pages/dealer/DealerProfile';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import TodaysOrders from '../pages/admin/TodaysOrders';
import OrderManagement from '../pages/admin/OrderManagement';
import DealerManagement from '../pages/admin/DealerManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import ProductManagement from '../pages/admin/ProductManagement';
import LocationManagement from '../pages/admin/LocationManagement';
import VehicleManagement from '../pages/admin/VehicleManagement';
import DeliveryMonitoring from '../pages/admin/DeliveryMonitoring';
import Reports from '../pages/admin/Reports';
import AdminProfile from '../pages/admin/AdminProfile';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/select-role" element={<RoleSelection />} />
      </Route>

      {/* 5-Second Tractor Animation Transition (Full Screen) */}
      <Route path="/auth-success" element={<AuthSuccessAnimation />} />

      {/* User Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN', 'DEALER']} />}>
        <Route element={<UserLayout />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/create-order" element={<CreateOrder />} />
          <Route path="/user/orders" element={<MyOrders />} />
          <Route path="/user/orders/:id" element={<OrderDetails />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/notifications" element={<UserNotifications />} />
        </Route>
      </Route>

      {/* Dealer Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['DEALER', 'ADMIN']} />}>
        <Route element={<DealerLayout />}>
          <Route path="/dealer/dashboard" element={<DealerDashboard />} />
          <Route path="/dealer/new-orders" element={<NewOrders />} />
          <Route path="/dealer/accepted" element={<AcceptedOrders />} />
          <Route path="/dealer/active" element={<ActiveDeliveries />} />
          <Route path="/dealer/completed" element={<CompletedDeliveries />} />
          <Route path="/dealer/drivers" element={<DriverManagement />} />
          <Route path="/dealer/profile" element={<DealerProfile />} />
          <Route path="/dealer/notifications" element={<UserNotifications />} />
        </Route>
      </Route>

      {/* Admin Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/todays-orders" element={<TodaysOrders />} />
          <Route path="/admin/orders" element={<OrderManagement />} />
          <Route path="/admin/dealers" element={<DealerManagement />} />
          <Route path="/admin/users" element={<CustomerManagement />} />
          <Route path="/admin/products" element={<ProductManagement />} />
          <Route path="/admin/locations" element={<LocationManagement />} />
          <Route path="/admin/vehicles" element={<VehicleManagement />} />
          <Route path="/admin/deliveries" element={<DeliveryMonitoring />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/settings" element={<AdminProfile />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
