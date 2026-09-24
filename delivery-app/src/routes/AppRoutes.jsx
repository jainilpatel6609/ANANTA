import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import DealerLayout from '../layouts/DealerLayout';
import DriverLayout from '../layouts/DriverLayout';

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

// User / Customer Pages
import UserDashboard from '../pages/user/UserDashboard';
import CreateOrder from '../pages/user/CreateOrder';
import MyOrders from '../pages/user/MyOrders';
import OrderDetails from '../pages/user/OrderDetails';
import OrderInvoice from '../pages/user/OrderInvoice';
import UserProfile from '../pages/user/UserProfile';
import UserNotifications from '../pages/user/UserNotifications';

// Dealer Pages
import DealerDashboard from '../pages/dealer/DealerDashboard';
import NewOrders from '../pages/dealer/NewOrders';
import AcceptedOrders from '../pages/dealer/AcceptedOrders';
import ActiveDeliveries from '../pages/dealer/ActiveDeliveries';
import CompletedDeliveries from '../pages/dealer/CompletedDeliveries';
import DriverManagement from '../pages/dealer/DriverManagement';
import DumperManagement from '../pages/dealer/DumperManagement';
import DealerProfile from '../pages/dealer/DealerProfile';
import TransportConfig from '../pages/dealer/TransportConfig';

// Driver Pages
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverDeliveries from '../pages/driver/DriverDeliveries';
import DriverDeliveryDetails from '../pages/driver/DriverDeliveryDetails';
import DriverProfile from '../pages/driver/DriverProfile';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/home" element={<Home />} />
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

      {/* User / Customer Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['USER', 'CUSTOMER', 'DEALER', 'ADMIN']} />}>
        <Route element={<UserLayout />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/create-order" element={<CreateOrder />} />
          <Route path="/user/orders" element={<MyOrders />} />
          <Route path="/user/orders/:id" element={<OrderDetails />} />
          <Route path="/user/orders/:id/invoice" element={<OrderInvoice />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/notifications" element={<UserNotifications />} />
        </Route>
        <Route path="/orders/:id/invoice" element={<OrderInvoice />} />
        <Route path="/invoice/:id" element={<OrderInvoice />} />
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
          <Route path="/dealer/dumpers" element={<DumperManagement />} />
          <Route path="/dealer/transport-config" element={<TransportConfig />} />
          <Route path="/dealer/profile" element={<DealerProfile />} />
          <Route path="/dealer/notifications" element={<UserNotifications />} />
        </Route>
      </Route>

      {/* Driver Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['DRIVER', 'DEALER', 'ADMIN']} />}>
        <Route element={<DriverLayout />}>
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          <Route path="/driver/deliveries" element={<DriverDeliveries />} />
          <Route path="/driver/deliveries/:id" element={<DriverDeliveryDetails />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
