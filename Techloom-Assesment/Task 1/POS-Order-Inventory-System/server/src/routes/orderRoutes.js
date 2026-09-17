const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Order Lifecycle endpoints (optionalAuth attaches req.user if logged in)
router.post('/', optionalAuth, orderController.createOrder.bind(orderController));
router.get('/', optionalAuth, orderController.listOrders.bind(orderController));
router.get('/:id', optionalAuth, orderController.getOrderById.bind(orderController));
router.post('/:id/cancel', optionalAuth, orderController.cancelOrder.bind(orderController));
router.post('/:id/expire', optionalAuth, orderController.expireOrder.bind(orderController));
router.post('/:id/complete', optionalAuth, orderController.completeOrder.bind(orderController));

module.exports = router;
