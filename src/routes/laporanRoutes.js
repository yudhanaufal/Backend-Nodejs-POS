const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

router.get('/nilai-stok/:toko_id', laporanController.getLaporanNilaiStok);
router.get('/nilai-stok/:toko_id/tanggal', laporanController.getLaporanNilaiStokByTanggal);
router.get('/produk-terlaris/:toko_id', laporanController.getLaporanProdukTerlaris);
router.get('/transaksi/:toko_id', laporanController.getLaporanTransaksi);
router.get('/detail/:transaksi_id', laporanController.getDetailByTransaksi);
router.get('/pelanggan/:toko_id', laporanController.getLaporanPelanggan);
router.get('/pelanggan/:nama/produk', laporanController.detailProdukPelanggan);
router.get('/setoran/:toko_id', laporanController.getLaporanSetoran);
router.get('/operasional/:toko_id', laporanController.getLaporanOperasional);
router.get('/inout/:toko_id', laporanController.getInOutProduk);
router.get('/laporantoko/', laporanController.getLaporanToko);
router.get('/laporantoko/:toko_id/detail', laporanController.getDetailLaporanToko);
router.get('/nota/:member_id', laporanController.getNotabyPelanggan);

// EXPORT ROUTES
router.get('/export/nilai-stok/:toko_id', laporanController.exportNilaiStokExcel);
router.get('/export/nilai-stok-tanggal/:toko_id', laporanController.exportNilaiStokByTanggalExcel);
router.get('/export/produk-terlaris/:toko_id', laporanController.exportProdukTerlarisExcel);
router.get('/export/transaksi/:toko_id', laporanController.exportTransaksiExcel);
router.get('/export/pelanggan/:toko_id', laporanController.exportPelangganExcel);
router.get('/export/setoran/:toko_id', laporanController.exportSetoranExcel);
router.get('/export/operasional/:toko_id', laporanController.exportOperasionalExcel);

module.exports = router;
