const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const multer = require('multer');
const path = require('path');

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/absensi');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'absensi-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
router.post('/', upload.single('foto'), absensiController.createAbsensi);
router.get('/', absensiController.getAbsensi);
router.get('/:user_id', absensiController.getAbsensiByUser);

module.exports = router;