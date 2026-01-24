const express = require('express');
const router = express.Router();
const pembelianController = require('../controllers/pembeliancontroller');

// ============================================
// PEMBELIAN ROUTES
// ============================================
router.put('/:id/status', pembelianController.updateStatusPembelian);

// Create pembelian baru
router.post('/', pembelianController.createPembelian);

// Get semua pembelian
router.get('/', pembelianController.getAllPembelian);

// Get pembelian by ID
router.get('/:id', pembelianController.getPembelianById);

// Get pembelian by Toko ID
router.get('/toko/:toko_id', pembelianController.getPembelianByToko);

// Update harga beli item
router.put('/:pembelianId/detail/:detailId/harga', pembelianController.updateHargaBeli);

// Update status pembelian
router.put('/:id/status', pembelianController.updateStatusPembelian);

// Delete pembelian
router.delete('/pembelian/:id', pembelianController.deletePembelian);

// ============================================
// PRODUK ROUTES
// ============================================

// Get harga produk
router.get('/produk/harga', pembelianController.getHargaProduk);

// Search produk
router.get('/produk/search', pembelianController.searchProduk);

// ============================================
// TOKO ROUTES
// ============================================

// Get semua toko
router.get('/toko', pembelianController.getAllToko);

// Get statistik pembelian by toko
router.get('/toko/:toko_id/statistik', pembelianController.getStatistikPembelian);

// ============================================
// SYSTEM ROUTES
// ============================================

// Health check
router.get('/health', pembelianController.healthCheck);

module.exports = router;