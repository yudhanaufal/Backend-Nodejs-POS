const express = require('express');
const router = express.Router();
const operasionalController = require('../controllers/operasionalController');

// GET all operasional
router.get('/', operasionalController.getAllOperasional);

// GET operasional by ID
router.get('/:id', operasionalController.getOperasionalById);

// GET operasional by toko
router.get('/toko/:toko_id', operasionalController.getOperasionalByToko);

// GET operasional by tanggal
router.get('/tanggal/:tanggal', operasionalController.getOperasionalByTanggal);

// GET summary operasional
router.get('/summary/:toko_id', operasionalController.getSummary);

// GET daily summary
router.get('/daily-summary/:toko_id/:tanggal', operasionalController.getDailySummary);

// GET monthly summary
router.get('/monthly-summary/:toko_id/:year/:month', operasionalController.getMonthlySummary);

// GET statistik by jenis pengeluaran
router.get('/statistik/jenis-pengeluaran/:toko_id', operasionalController.getStatistikByJenis);

// POST create operasional
router.post('/', operasionalController.createOperasional);

// PUT update operasional
router.put('/:id', operasionalController.updateOperasional);

// DELETE operasional
router.delete('/:id', operasionalController.deleteOperasional);

module.exports = router;