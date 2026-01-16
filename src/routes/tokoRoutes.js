const express = require('express');
const router = express.Router();
const tokoController = require('../controllers/tokoController');

// Routes untuk Toko
router.get('/', tokoController.getAllToko);           // GET /api/toko
router.get('/search', tokoController.searchToko);     // GET /api/toko/search?q=
router.get('/:id', tokoController.getTokoById);       // GET /api/toko/:id
router.post('/', tokoController.createToko);          // POST /api/toko
router.put('/:id', tokoController.updateToko);        // PUT /api/toko/:id
router.delete('/:id', tokoController.deleteToko);     // DELETE /api/toko/:id



module.exports = router;