const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Catalog & Inventory endpoints
router.get('/', productController.getProducts.bind(productController));
router.post('/', productController.createProduct.bind(productController));
router.post('/seed', productController.seedProducts.bind(productController));
router.get('/:id', productController.getProductById.bind(productController));
router.put('/:id', productController.updateProduct.bind(productController));
router.delete('/:id', productController.deleteProduct.bind(productController));

module.exports = router;
