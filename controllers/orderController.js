const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

// @desc  Customer: place a new order
// @route POST /api/orders
const placeOrder = asyncHandler(async (req, res) => {
  const { restaurantId, items, deliveryAddress } = req.body;

  if (!items || !items.length) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    res.status(400);
    throw new Error('Restaurant not available');
  }
  if (!restaurant.isOpen) {
    res.status(400);
    throw new Error('Restaurant is currently closed');
  }

  // Rebuild items server-side from DB so prices can't be spoofed by the client
  let subtotal = 0;
  const orderItems = [];

  for (const line of items) {
    const menuItem = await MenuItem.findOne({ _id: line.menuItemId, restaurant: restaurantId, isAvailable: true });
    if (!menuItem) {
      res.status(400);
      throw new Error(`Menu item ${line.menuItemId} not available`);
    }

    let lineAddOns = [];
    let addOnTotal = 0;
    if (line.addOns && line.addOns.length) {
      lineAddOns = menuItem.addOns.filter((a) => line.addOns.includes(a.name));
      addOnTotal = lineAddOns.reduce((sum, a) => sum + a.price, 0);
    }

    const quantity = line.quantity || 1;
    subtotal += (menuItem.price + addOnTotal) * quantity;

    orderItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      addOns: lineAddOns,
    });
  }

  const deliveryFee = 2.5; // flat fee for MVP; can be distance-based later
  const platformFee = Number((subtotal * (restaurant.commissionRate / 100)).toFixed(2));
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const order = await Order.create({
    customer: req.user._id,
    restaurant: restaurantId,
    items: orderItems,
    deliveryAddress,
    subtotal,
    deliveryFee,
    platformFee,
    total,
    statusHistory: [{ status: 'placed', at: new Date() }],
  });

  // Real-time: notify the restaurant dashboard of a new incoming order
  req.io.to(`restaurant:${restaurantId}`).emit('order:new', order);

  res.status(201).json(order);
});

// @desc  Get single order (customer who owns it, restaurant staff of that restaurant, or admin)
// @route GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('restaurant', 'name phone address');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwnerCustomer = String(order.customer) === String(req.user._id);
  const isRestaurantStaff = String(order.restaurant._id) === String(req.user.restaurant);
  if (!isOwnerCustomer && !isRestaurantStaff && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json(order);
});

// @desc  Customer: list own order history
// @route GET /api/orders/mine
const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc  Restaurant: list incoming/active orders for their restaurant
// @route GET /api/orders/restaurant/:restaurantId
const listRestaurantOrders = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  if (req.user.role !== 'admin' && String(req.user.restaurant) !== String(restaurantId)) {
    res.status(403);
    throw new Error('Not authorized to view these orders');
  }

  const { status } = req.query;
  const filter = { restaurant: restaurantId };
  if (status) filter.status = status;

  const orders = await Order.find(filter).populate('customer', 'name phone').sort({ createdAt: -1 });
  res.json(orders);
});

// @desc  Restaurant: update order status (confirm, preparing, ready, out_for_delivery, delivered, cancelled)
// @route PATCH /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, estimatedMinutes, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (req.user.role !== 'admin' && String(req.user.restaurant) !== String(order.restaurant)) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  order.pushStatus(status, note);
  if (estimatedMinutes !== undefined) order.estimatedMinutes = estimatedMinutes;
  await order.save();

  // Real-time: push the update to the customer tracking screen, and to the restaurant dashboard
  req.io.to(`order:${order._id}`).emit('order:statusUpdate', {
    orderId: order._id,
    status: order.status,
    estimatedMinutes: order.estimatedMinutes,
    at: new Date(),
  });
  req.io.to(`restaurant:${order.restaurant}`).emit('order:statusUpdate', {
    orderId: order._id,
    status: order.status,
  });

  res.json(order);
});

module.exports = { placeOrder, getOrder, listMyOrders, listRestaurantOrders, updateOrderStatus };
