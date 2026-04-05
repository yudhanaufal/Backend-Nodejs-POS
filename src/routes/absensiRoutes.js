const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const multer = require('multer');
const path = require('path');

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/absensi'); // Pastikan folder public/uploads/absensi ada
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

module.exports = router;