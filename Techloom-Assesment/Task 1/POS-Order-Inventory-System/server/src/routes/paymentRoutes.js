const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment gateway simulation endpoints
router.post('/process', paymentController.processPayment.bind(paymentController));
router.get('/order/:orderId', paymentController.getPaymentByOrderId.bind(paymentController));
router.get('/:id', paymentController.getPaymentById.bind(paymentController));

module.exports = router;
