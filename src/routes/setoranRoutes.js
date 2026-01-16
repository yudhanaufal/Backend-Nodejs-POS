const express = require('express');
const router = express.Router();
const setoranController = require('../controllers/setoranController');

// GET all setoran (dengan filter)
router.get('/', setoranController.getAllSetoran);

// GET setoran by ID
router.get('/:id', setoranController.getSetoranById);

// GET setoran by toko_id
router.get('/toko/:toko_id', setoranController.getSetoranByToko);

// GET setoran by user_id
router.get('/user/:user_id', setoranController.getSetoranByUser);

// GET setoran by tanggal
router.get('/tanggal/:tanggal', setoranController.getSetoranByTanggal);

// GET summary setoran
router.get('/summary/:toko_id', setoranController.getSummary);

// GET daily summary
router.get('/daily-summary/:toko_id/:tanggal', setoranController.getDailySummary);

// GET monthly summary
router.get('/monthly-summary/:toko_id/:year/:month', setoranController.getMonthlySummary);

// GET top users setoran
router.get('/top-users/:toko_id', setoranController.getTopUsers);

// POST create setoran
router.post('/', setoranController.createSetoran);

// PUT update setoran
router.put('/:id', setoranController.updateSetoran);

// DELETE setoran
router.delete('/:id', setoranController.deleteSetoran);

module.exports = router;