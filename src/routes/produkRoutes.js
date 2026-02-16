const express = require('express');
const router = express.Router();
const produkController = require('../controllers/produkController');

// GET all produk
router.get('/', produkController.getAllProduk);

// SEARCH produk (must be before /:id)
router.get('/search/all', produkController.searchProduk);

// GET low stock products (must be before /:id)
router.get('/inventory/low-stock', produkController.getLowStock);

// GET produk by toko (must be before /:id)
router.get('/toko/:toko_id', produkController.getProdukByToko);

// GET produk by ID (must be after specific routes)
router.get('/:id', produkController.getProdukById);

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

// GET mutasi produk
router.get('/:produk_id/mutasi', produkController.getMutasiProduk);

module.exports = router;