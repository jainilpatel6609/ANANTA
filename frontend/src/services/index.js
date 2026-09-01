import api from './api';

export const authService = {
  login: (mobile, password, expectedRole) => api.post('/auth/login', { mobile, password, expectedRole }),
  register: (userData) => api.post('/auth/register', userData),
  registerDealer: (dealerData) => api.post('/auth/dealer/register', dealerData),
  registerSuperAdmin: (adminData) => api.post('/auth/super-admin/register', adminData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  sendMobileOtp: (newMobile) => api.post('/auth/mobile-otp/send', { newMobile }),
  verifyMobileOtp: (newMobile, otp) => api.post('/auth/mobile-otp/verify', { newMobile, otp }),
  forgotPasswordSendOtp: (mobile) => api.post('/auth/forgot-password/send-otp', { mobile }),
  forgotPasswordVerifyOtp: (mobile, otp) => api.post('/auth/forgot-password/verify-otp', { mobile, otp }),
  forgotPasswordReset: (mobile, resetToken, newPassword) =>
    api.post('/auth/forgot-password/reset', { mobile, resetToken, newPassword })
};

export const productService = {
  getActiveProducts: () => api.get('/products'),
  getProductById: (id) => api.get(`/products/${id}`),
  getAllAdmin: () => api.get('/admin/products'),
  getAdminProducts: () => api.get('/admin/products'),
  create: (data) => api.post('/products', data),
  createProduct: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  deleteProduct: (id) => api.delete(`/products/${id}`)
};

export const orderService = {
  create: (orderData) => api.post('/orders', orderData),
  createOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getDealerAvailable: () => api.get('/orders/dealer/available'),
  getDealerDeliveries: (status) => api.get('/orders/dealer/my-deliveries', { params: { status } }),
  acceptOrder: (id) => api.post(`/orders/${id}/accept`),
  declineOrder: (id, reason) => api.post(`/orders/${id}/decline`, { reason }),
  rejectOrder: (id, reason) => api.post(`/orders/${id}/reject`, { reason }),
  getAdminEscalations: () => api.get('/orders/admin/escalations'),
  adminAcknowledge: (id) => api.post(`/orders/${id}/admin-acknowledge`),
  adminReassign: (id, targetDealerId) => api.post(`/orders/${id}/reassign`, { targetDealerId }),
  getAllAdmin: (params) => api.get('/admin/orders', { params })
};

export const deliveryService = {
  assignDriver: (id, driverData) => api.post(`/deliveries/${id}/assign-driver`, driverData),
  dispatchOrder: (id, formData) => api.post(`/deliveries/${id}/dispatch`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verifyOtp: (id, otp) => api.post(`/deliveries/${id}/verify-otp`, { otp }),
  getOtpStatus: (id) => api.get(`/deliveries/${id}/otp`)
};

export const driverService = {
  getDrivers: (params) => api.get('/drivers', { params }),
  createDriver: (data) => api.post('/drivers', data),
  updateDriver: (id, data) => api.put(`/drivers/${id}`, data),
  toggleStatus: (id) => api.patch(`/drivers/${id}/toggle`),
  deleteDriver: (id) => api.delete(`/drivers/${id}`)
};

export const paymentService = {
  verify: (data) => api.post('/payments/verify', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  devConfirm: (orderId) => api.post('/payments/dev-confirm', { orderId }),
  devConfirmPayment: (orderId) => api.post('/payments/dev-confirm', { orderId })
};

export const dealerService = {
  getAllDealers: () => api.get('/admin/dealers'),
  createDealer: (data) => api.post('/admin/dealers', data),
  updateDealer: (id, data) => api.put(`/admin/dealers/${id}`, data),
  deleteDealer: (id) => api.delete(`/admin/dealers/${id}`),
  toggleStatus: (id) => api.patch(`/admin/dealers/${id}/toggle-status`),
  resetPassword: (id, newPassword) => api.post(`/admin/dealers/${id}/reset-password`, { newPassword })
};

export const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getReports: (month, year) => api.get('/admin/reports', { params: { month, year } }),
  exportUrl: (format, params) => {
    const url = new URL(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/reports/export`);
    url.searchParams.append('format', format);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.startDate) url.searchParams.append('startDate', params.startDate);
    if (params?.endDate) url.searchParams.append('endDate', params.endDate);
    return url.toString();
  }
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  registerDevice: (data) => api.post('/notifications/register-device', data),
  unregisterDevice: (token) => api.post('/notifications/unregister-device', { token }),
  testPush: () => api.post('/notifications/test-push')
};

export const locationService = {
  getPublicLocations: (params) => api.get('/locations', { params: typeof params === 'string' ? { vehicleType: params } : params }),
  getAdminLocations: (params) => api.get('/locations/admin', { params }),
  createLocation: (data) => api.post('/locations/admin', data),
  updateLocation: (id, data) => api.put(`/locations/admin/${id}`, data),
  toggleLocation: (id, vehicleType) => api.patch(`/locations/admin/${id}/toggle`, { vehicleType }),
  deleteLocation: (id, vehicleType) => api.delete(`/locations/admin/${id}`, { params: vehicleType ? { vehicleType } : {} })
};

export const vehicleConfigService = {
  getPublicConfigs: (vehicleType) => api.get('/vehicle-configs', { params: vehicleType ? { vehicleType } : {} }),
  getVehicleSettings: () => api.get('/vehicle-configs/settings'),
  getAdminConfigs: (params) => api.get('/vehicle-configs/admin', { params }),
  createConfig: (data) => api.post('/vehicle-configs/admin', data),
  updateConfig: (id, data) => api.put(`/vehicle-configs/admin/${id}`, data),
  toggleConfig: (id, vehicleType) => api.patch(`/vehicle-configs/admin/${id}/toggle`, { vehicleType }),
  updateSettings: (data) => api.patch('/vehicle-configs/admin/settings', data),
  deleteConfig: (id, vehicleType) => api.delete(`/vehicle-configs/admin/${id}`, { params: vehicleType ? { vehicleType } : {} })
};

export const pincodeService = {
  lookup: (pincode) => api.get(`/pincode/lookup/${pincode}`),
  getNearestDealer: (pincode) => api.get(`/pincode/nearest-dealer/${pincode}`),
  geocode: (q) => api.get('/pincode/geocode', { params: { q } }),
  reverseGeocode: (lat, lng) => api.get('/pincode/reverse-geocode', { params: { lat, lng } })
};
