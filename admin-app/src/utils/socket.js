import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocketBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  return undefined;
};

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('ananta_token') || localStorage.getItem('token');
    const socketUrl = getSocketBaseUrl();

    const socketOptions = {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    };

    socketInstance = socketUrl ? io(socketUrl, socketOptions) : io(socketOptions);

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to central real-time server:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection notice:', err.message);
    });
  }
  return socketInstance;
};

export const reconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  return getSocket();
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

