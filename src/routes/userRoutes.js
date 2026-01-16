const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET all users
router.get('/', userController.getAllUsers);

// GET user by ID
router.get('/:id', userController.getUserById);

// GET users by toko_id
router.get('/toko/:toko_id', userController.getUsersByToko);

// POST create user
router.post('/', userController.createUser);

// PUT update user
router.put('/:id', userController.updateUser);

// PUT update password
router.put('/:id/password', userController.updatePassword);

// DELETE user
router.delete('/:id', userController.deleteUser);

module.exports = router;