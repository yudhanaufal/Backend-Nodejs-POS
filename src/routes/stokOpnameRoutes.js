const express = require('express');
const router = express.Router();
const stokOpnameController = require('../controllers/stokOpnameController');

router.post('/', stokOpnameController.createStokOpname);
router.get('/', stokOpnameController.getAll);
router.get('/toko/:toko_id', stokOpnameController.getByToko);
router.get('/:id', stokOpnameController.getById);
module.exports = router;
