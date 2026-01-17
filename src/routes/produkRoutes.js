const express = require('express');
const router = express.Router();
const produkController = require('../controllers/produkController');

// GET all produk
router.get('/', produkController.getAllProduk);

// GET produk by ID
router.get('/:id', produkController.getProdukById);

// GET produk by toko
router.get('/toko/:toko_id', produkController.getProdukByToko);

// SEARCH produk
router.get('/search/all', produkController.searchProduk);

// GET low stock products
router.get('/inventory/low-stock', produkController.getLowStock);

// POST create produk (dengan gambar)
router.post('/', produkController.createProduk);

// PUT update produk (dengan gambar)
router.put('/:id', produkController.updateProduk);

// POST upload gambar untuk produk
router.post('/:id/upload', produkController.uploadGambar);

// DELETE gambar produk
router.delete('/:id/gambar', produkController.deleteGambar);

// PATCH update stok produk
router.patch('/:id/stok', produkController.updateStok);

// DELETE produk
router.delete('/:id', produkController.deleteProduk);

module.exports = router;