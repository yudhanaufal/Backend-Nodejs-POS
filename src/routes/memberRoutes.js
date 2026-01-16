const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// GET all member (dengan filter)
router.get('/', memberController.getAllMember);

// GET member by ID
router.get('/:id', memberController.getMemberById);

// GET member by toko_id
router.get('/toko/:toko_id', memberController.getMemberByToko);

// GET member by nomor telepon
router.get('/telepon/:no_tlp', memberController.getMemberByTelepon);

// GET member stats by toko
router.get('/stats/:toko_id', memberController.getMemberStats);

// SEARCH member
router.get('/search/all', memberController.searchMember);

// POST create member
router.post('/', memberController.createMember);

// PUT update member
router.put('/:id', memberController.updateMember);

// DELETE member
router.delete('/:id', memberController.deleteMember);

module.exports = router;