const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== IMPORT ROUTES ====================
// Pastikan path ini sesuai dengan struktur folder Anda
const tokoRoutes = require('./src/routes/tokoRoutes');
const produkRoutes = require('./src/routes/produkRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const memberRoutes= require('./src/routes/memberRoutes');
// ==================== REGISTER ROUTES ====================
app.use('/api/toko', tokoRoutes);
app.use('/api/produk',produkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/member',memberRoutes);
// ==================== BASIC ROUTES ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🛒 Toko Management API',
    version: '1.0.0',
    endpoints: {
      toko: '/api/toko',
      produk: '/api/produk'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server sehat',
    timestamp: new Date().toISOString()
  });
});

// ==================== 404 HANDLER ====================
// INI YANG PERLU DIPERBAIKI - JANGAN PAKAI '*'
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});