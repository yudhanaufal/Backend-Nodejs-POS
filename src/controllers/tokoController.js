const tokoModel = require('../models/Toko');

exports.getAllToko = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await tokoModel.getAll(page, limit);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all toko error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data toko'
    });
  }
};

exports.getTokoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const toko = await tokoModel.getById(id);
    
    if (!toko) {
      return res.status(404).json({
        success: false,
        message: 'Toko tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: toko
    });
  } catch (error) {
    console.error('Get toko by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data toko'
    });
  }
};

exports.createToko = async (req, res) => {
  try {
    const { nama_toko, alamat, pemilik, telepon, email } = req.body;
    
    // Validasi
    if (!nama_toko || !alamat) {
      return res.status(400).json({
        success: false,
        message: 'Nama toko dan alamat wajib diisi'
      });
    }
    
    const tokoId = await tokoModel.create({
      nama_toko,
      alamat,
      pemilik: pemilik || null,
      telepon: telepon || null,
      email: email || null
    });
    
    const newToko = await tokoModel.getById(tokoId);
    
    res.status(201).json({
      success: true,
      message: 'Toko berhasil dibuat',
      data: newToko
    });
  } catch (error) {
    console.error('Create toko error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat toko',
      error: error.code === 'ER_DUP_ENTRY' ? 'Email/telepon sudah terdaftar' : undefined
    });
  }
};

exports.updateToko = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_toko, alamat, pemilik, telepon, email } = req.body;
    
    // Validasi
    if (!nama_toko || !alamat) {
      return res.status(400).json({
        success: false,
        message: 'Nama toko dan alamat wajib diisi'
      });
    }
    
    // Cek apakah toko ada
    const exists = await tokoModel.exists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Toko tidak ditemukan'
      });
    }
    
    const updated = await tokoModel.update(id, {
      nama_toko,
      alamat,
      pemilik: pemilik || null,
      telepon: telepon || null,
      email: email || null
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Gagal mengupdate toko'
      });
    }
    
    const updatedToko = await tokoModel.getById(id);
    
    res.json({
      success: true,
      message: 'Toko berhasil diupdate',
      data: updatedToko
    });
  } catch (error) {
    console.error('Update toko error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate toko'
    });
  }
};

exports.deleteToko = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah toko ada
    const exists = await tokoModel.exists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Toko tidak ditemukan'
      });
    }
    
    const deleted = await tokoModel.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Gagal menghapus toko'
      });
    }
    
    res.json({
      success: true,
      message: 'Toko berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete toko error:', error);
    
    // Handle foreign key constraint
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Tidak dapat menghapus toko karena masih memiliki data terkait'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus toko'
    });
  }
};

exports.searchToko = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Kata kunci pencarian harus diisi'
      });
    }
    
    const results = await tokoModel.search(q.trim());
    
    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Search toko error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan pencarian'
    });
  }
};