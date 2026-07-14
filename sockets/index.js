const jwt = require('jsonwebtoken');

// Sets up Socket.io: authenticates the connection via JWT, then lets clients
// join rooms so they only receive events relevant to them.
//
// Rooms used:
//   order:<orderId>       - customer tracking a specific order's status
//   restaurant:<restId>   - restaurant dashboard receiving new orders / status pushes
function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token missing'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role }
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.user.id}, role ${socket.user.role})`);

    // Customer app calls this after placing an order to receive live status updates
    socket.on('order:track', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('order:untrack', (orderId) => {
      socket.leave(`order:${orderId}`);
    });

    // Restaurant dashboard calls this on load to receive new-order + status events
    socket.on('restaurant:join', (restaurantId) => {
      if (socket.user.role !== 'restaurant_owner' && socket.user.role !== 'restaurant_staff' && socket.user.role !== 'admin') {
        return;
      }
      socket.join(`restaurant:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;
