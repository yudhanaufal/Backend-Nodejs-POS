const express = require('express');
const router = express.Router();
const stokOpnameController = require('../controllers/stokOpnameController');

// CREATE: Buat stok opname dengan daftar produk
router.post('/', stokOpnameController.createStokOpname);

// READ: Get semua stok opname
router.get('/', stokOpnameController.getAll);

// READ: Get by ID
router.get('/:id', stokOpnameController.getById);

// READ: Get by toko ID
router.get('/toko/:toko_id', stokOpnameController.getByToko);

// UPDATE: Update stok asli pada detail
router.put('/details/:id', stokOpnameController.updateStokAsli);

// UPDATE: Batch update stok asli
router.put('/:stok_opname_id/batch-update', stokOpnameController.batchUpdateStokAsli);

// CREATE: Tambah produk ke stok opname yang sudah ada
router.post('/:stok_opname_id/products', stokOpnameController.addProduct);

// DELETE: Hapus produk dari stok opname
router.delete('/details/:id', stokOpnameController.removeProduct);

// DELETE: Hapus stok opname
router.delete('/:id', stokOpnameController.deleteStokOpname);

module.exports = router;