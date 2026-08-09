const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.post('/', salesController.createSales);
router.get('/all', salesController.getAllSales);
router.get('/:id', salesController.getSalesById);
router.get('/toko/:toko_id/sales/:sales_id', salesController.getMemberByTokoAndSales);
router.get('/', salesController.getSales)
module.exports = router;