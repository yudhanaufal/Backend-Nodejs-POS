const StokOpname = require('../models/StockOpname');
const db = require('../config/Connection');

// =========================
// CREATE STOK OPNAME (TAHAP 1: PILIH PRODUK)
// =========================
exports.createStokOpname = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { tanggal, jenis, toko_id, users_id, produk_list } = req.body;

    // Validasi input
    if (!tanggal || !jenis || !toko_id || !users_id) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, jenis, toko_id, dan users_id wajib diisi'
      });
    }

    if (!produk_list || !Array.isArray(produk_list) || produk_list.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimal satu produk harus dipilih'
      });
    }

    // Buat stok opname dengan detail produk
    const stokOpnameId = await StokOpname.createWithDetails(conn, {
      tanggal,
      jenis,
      toko_id,
      users_id,
      produk_list
    });

    await conn.commit();

    // Ambil data yang baru dibuat
    const data = await StokOpname.getById(stokOpnameId);

    res.status(201).json({
      success: true,
      message: 'Stok opname berhasil dibuat',
      data
    });

  } catch (error) {
    await conn.rollback();
    console.error('Create Stok Opname Error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Gagal membuat stok opname'
    });
  } finally {
    conn.release();
  }
};

// =========================
// UPDATE STOK ASLI (TAHAP 2: ISI STOK ASLI)
// =========================
exports.updateStokAsli = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { stok_asli } = req.body;

    // Validasi input
    if (stok_asli === null || stok_asli === undefined || stok_asli < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stok asli wajib diisi dan tidak boleh negatif'
      });
    }

    // Update stok asli pada detail
    const result = await StokOpname.updateStokAsli(conn, {
      id: parseInt(id),
      stok_asli: parseFloat(stok_asli)
    });

    await conn.commit();

    // Ambil data detail terbaru
    const [detailRows] = await conn.query(`
      SELECT d.*, p.nama_produk 
      FROM detail_stok_opname d
      LEFT JOIN produk p ON p.id = d.produk_id
      WHERE d.id = ?
    `, [id]);

    const detail = detailRows[0];

    res.json({
      success: true,
      message: result.selisih !== 0 
        ? 'Stok asli berhasil diperbarui dan mutasi stok dibuat' 
        : 'Stok asli berhasil diperbarui (tidak ada perubahan stok)',
      data: detail,
      mutasi_created: result.selisih !== 0,
      selisih: result.selisih
    });

  } catch (error) {
    await conn.rollback();
    console.error('Update Stok Asli Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal memperbarui stok asli'
    });
  } finally {
    conn.release();
  }
};

// =========================
// BATCH UPDATE STOK ASLI
// =========================
exports.batchUpdateStokAsli = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { stok_opname_id } = req.params;
    const { updates } = req.body;

    // Validasi input
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data update diperlukan dalam format array'
      });
    }

    // Validasi setiap update
    for (const update of updates) {
      if (!update.detail_id || update.stok_asli === undefined || update.stok_asli < 0) {
        return res.status(400).json({
          success: false,
          message: 'Setiap update harus memiliki detail_id dan stok_asli (tidak negatif)'
        });
      }
    }

    // Update batch
    const results = await StokOpname.batchUpdateStokAsli(
      conn, 
      parseInt(stok_opname_id), 
      updates
    );

    await conn.commit();

    // Hitung berhasil/gagal
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Ambil data terbaru
    const data = await StokOpname.getById(stok_opname_id);

    res.json({
      success: true,
      message: `Berhasil update ${successCount} produk${failCount > 0 ? `, gagal: ${failCount}` : ''}`,
      data,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    await conn.rollback();
    console.error('Batch Update Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal update batch stok asli'
    });
  } finally {
    conn.release();
  }
};

// =========================
// ADD PRODUCT TO STOK OPNAME
// =========================
exports.addProduct = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { stok_opname_id } = req.params;
    const { produk_id } = req.body;

    // Validasi input
    if (!produk_id) {
      return res.status(400).json({
        success: false,
        message: 'Produk ID diperlukan'
      });
    }

    // Tambahkan produk
    await StokOpname.addProduct(conn, {
      stok_opname_id: parseInt(stok_opname_id),
      produk_id: parseInt(produk_id)
    });

    await conn.commit();

    // Ambil data terbaru
    const data = await StokOpname.getById(stok_opname_id);

    res.json({
      success: true,
      message: 'Produk berhasil ditambahkan ke stok opname',
      data
    });

  } catch (error) {
    await conn.rollback();
    console.error('Add Product Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menambahkan produk'
    });
  } finally {
    conn.release();
  }
};

// =========================
// REMOVE PRODUCT FROM STOK OPNAME
// =========================
exports.removeProduct = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Hapus produk dari detail
    const result = await StokOpname.removeProduct(conn, parseInt(id));

    await conn.commit();

    res.json({
      success: true,
      message: 'Produk berhasil dihapus dari stok opname',
      data: {
        stok_opname_id: result.stok_opname_id,
        produk_id: result.produk_id
      }
    });

  } catch (error) {
    await conn.rollback();
    console.error('Remove Product Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghapus produk'
    });
  } finally {
    conn.release();
  }
};

// =========================
// GET ALL STOK OPNAME
// =========================
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Filter
    const filters = {};
    if (req.query.toko_id) filters.toko_id = req.query.toko_id;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.tanggal_dari) filters.tanggal_dari = req.query.tanggal_dari;
    if (req.query.tanggal_sampai) filters.tanggal_sampai = req.query.tanggal_sampai;

    const result = await StokOpname.getAll(page, limit, filters);

    res.json({
      success: true,
      message: 'Data stok opname berhasil diambil',
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get All Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok opname'
    });
  }
};

// =========================
// GET BY ID
// =========================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await StokOpname.getById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Stok opname tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Stok opname berhasil ditemukan',
      data
    });

  } catch (error) {
    console.error('Get By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok opname'
    });
  }
};

// =========================
// GET BY TOKO
// =========================
exports.getByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await StokOpname.getByToko(toko_id, page, limit);

    res.json({
      success: true,
      message: 'Data stok opname berdasarkan toko berhasil diambil',
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get By Toko Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengambil data stok opname'
    });
  }
};


// =========================
// DELETE STOK OPNAME
// =========================
exports.deleteStokOpname = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Hapus stok opname
    const deleted = await StokOpname.delete(conn, parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Stok opname tidak ditemukan'
      });
    }

    await conn.commit();

    res.json({
      success: true,
      message: 'Stok opname berhasil dihapus'
    });

  } catch (error) {
    await conn.rollback();
    console.error('Delete Stok Opname Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghapus stok opname'
    });
  } finally {
    conn.release();
  }
};