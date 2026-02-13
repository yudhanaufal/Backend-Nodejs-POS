const express = require('express');
const router = express.Router();
const transaksiController = require('../controllers/transaksiController');

router.post('/', transaksiController.createTransaksi);
// router.get('/detail', transaksiController.getRiwayat);
router.get('/',transaksiController.getTransaksi);
router.get('/:id',transaksiController.getTransaksiById);
router.patch('/cancel/:id',transaksiController.cancelTransaksi);
router.get('/toko/:id',transaksiController.getByToko);

module.exports = router;