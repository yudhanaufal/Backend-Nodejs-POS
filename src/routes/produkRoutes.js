const express = require('express');
const router = express.Router();
const produkController = require('../controllers/produkController');

// GET all produk (dengan filter)
router.get('/', produkController.getAllProduk);

// GET produk by ID
router.get('/:id', produkController.getProdukById);

// GET produk by toko_id
router.get('/toko/:toko_id', produkController.getProdukByToko);

// SEARCH produk
router.get('/search/all', produkController.searchProduk);

// GET low stock products
router.get('/inventory/low-stock', produkController.getLowStock);

// POST create produk
router.post('/', produkController.createProduk);

// PUT update produk
router.put('/:id', produkController.updateProduk);

// PATCH update stok produk
router.patch('/:id/stok', produkController.updateStok);

// DELETE produk
router.delete('/:id', produkController.deleteProduk);

module.exports = router;