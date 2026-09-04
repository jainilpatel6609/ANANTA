const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CLIENT_URL } = require('../config/env');

let ioInstance = null;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests from all origins during development or matched CLIENT_URL
        callback(null, true);
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;

      if (!token) {
        // Allow anonymous connect for public tracking if token not present, but unauthenticated
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.warn(`[Socket Auth Warning] Invalid token: ${err.message}`);
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (user && user.id) {
      const role = String(user.role || '').toUpperCase();

      // Join User-specific room
      socket.join(`user:${user.id}`);

      // Role-specific rooms
      if (role === 'ADMIN') {
        socket.join('admin');
      } else if (role === 'DEALER') {
        socket.join(`dealer:${user.id}`);
        socket.join('dealers');
      } else if (role === 'CUSTOMER' || role === 'USER') {
        socket.join(`customer:${user.id}`);
      }
    }

    // Join specific Order room for real-time order tracking
    socket.on('join_order', (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('leave_order', (orderId) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
      }
    });

    // Handle Live GPS Location Update from Dealer / Driver
    socket.on('send_location_update', ({ orderId, latitude, longitude, heading, speed }) => {
      if (orderId && latitude && longitude) {
        io.to(`order:${orderId}`).emit('location_update', {
          orderId,
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('disconnect', (reason) => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  return ioInstance;
}

// Emits new order to matching / assigned dealers and admins in real-time
function emitNewOrder(dealerId, orderData) {
  if (!ioInstance) return;
  if (dealerId) {
    ioInstance.to(`dealer:${dealerId}`).emit('new_order', {
      success: true,
      order: orderData,
      timestamp: new Date().toISOString()
    });
  } else {
    ioInstance.to('dealers').emit('new_order', {
      success: true,
      order: orderData,
      timestamp: new Date().toISOString()
    });
  }
  ioInstance.to('admin').emit('new_order', {
    success: true,
    order: orderData,
    timestamp: new Date().toISOString()
  });
}

// Emits order acceptance to customer and order room
function emitOrderAccepted(order) {
  if (!ioInstance || !order) return;
  const customerId = order.userId?._id || order.userId;
  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    dealerId: order.dealerId,
    acceptedAt: order.acceptedAt,
    driverName: order.driverName,
    driverMobile: order.driverMobile,
    vehicleNumber: order.vehicleNumber
  };

  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit('order_accepted', payload);
  }
  ioInstance.to(`order:${order._id}`).emit('order_accepted', payload);
  ioInstance.to('admin').emit('order_status_update', payload);
}

// Emits order status update (PLACED, ACCEPTED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
function emitOrderStatusUpdate(order) {
  if (!ioInstance || !order) return;
  const customerId = order.userId?._id || order.userId;
  const dealerId = order.dealerId?._id || order.dealerId;
  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    driverName: order.driverName,
    driverMobile: order.driverMobile,
    vehicleNumber: order.vehicleNumber,
    deliveredAt: order.deliveredAt,
    timestamp: new Date().toISOString()
  };

  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit('delivery_status_update', payload);
  }
  if (dealerId) {
    ioInstance.to(`dealer:${dealerId}`).emit('delivery_status_update', payload);
  }
  ioInstance.to(`order:${order._id}`).emit('delivery_status_update', payload);
  ioInstance.to('admin').emit('delivery_status_update', payload);
}

// Emits live GPS coordinates to tracking customer
function emitLocationUpdate(orderId, customerId, locationData) {
  if (!ioInstance || !orderId) return;
  const payload = {
    orderId,
    ...locationData,
    timestamp: new Date().toISOString()
  };

  ioInstance.to(`order:${orderId}`).emit('location_update', payload);
  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit('location_update', payload);
  }
}

// Emits 15-minute response timeout escalation to Super Admin
function emitOrderEscalation(order, escalationData) {
  if (!ioInstance || !order) return;
  ioInstance.to('admin').emit('order_escalated', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    dealerId: order.dealerId,
    assignedAt: order.orderAssignedAt,
    escalatedAt: new Date().toISOString(),
    ...escalationData
  });
}

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderAccepted,
  emitOrderStatusUpdate,
  emitLocationUpdate,
  emitOrderEscalation
};

