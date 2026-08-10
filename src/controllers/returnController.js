const ReturnModel = require('../models/Return');
const Toko = require('../models/Toko');
const User = require('../models/Users');
const Produk = require('../models/Produk');

/**
 * @desc    Create new return dengan detail
 * @route   POST /api/return
 * @access  Public
 */
exports.createReturn = async (req, res) => {
  try {
    const { tanggal, users_id, toko_id, keterangan, status, details } = req.body;

    // Validasi input wajib
    if (!tanggal || !users_id || !toko_id || !details || !Array.isArray(details)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, user, toko, dan detail produk wajib diisi"
      });
    }

    // Validasi details tidak boleh kosong
    if (details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Detail produk return tidak boleh kosong"
      });
    }

    // Cek apakah toko exists
    const tokoExists = await Toko.exists(toko_id);
    if (!tokoExists) {
      return res.status(404).json({
        success: false,
        message: "Toko tidak ditemukan"
      });
    }

    // Cek apakah user exists
    const userExists = await User.exists(users_id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    // Validasi setiap detail
    const validatedDetails = [];

    for (const detail of details) {
      if (!detail.produk_id) {
        return res.status(400).json({
          success: false,
          message: "Setiap detail harus memiliki produk_id"
        });
      }

      // Cek apakah produk ada
      const produkExists = await Produk.exists(detail.produk_id);
      if (!produkExists) {
        return res.status(404).json({
          success: false,
          message: `Produk dengan ID ${detail.produk_id} tidak ditemukan`
        });
      }

      // Cek apakah produk milik toko yang sama
      const produkToko = await Produk.belongsToToko(detail.produk_id, toko_id);
      if (!produkToko) {
        return res.status(400).json({
          success: false,
          message: `Produk dengan ID ${detail.produk_id} tidak termasuk dalam toko ${toko_id}`
        });
      }

      const quantity = parseInt(detail.quantity) || 1;

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity harus lebih dari 0"
        });
      }

      validatedDetails.push({
        produk_id: parseInt(detail.produk_id),
        quantity: quantity,
        alasan_return: detail.alasan_return || null
        // Nama produk dan harga_beli akan diambil otomatis di model
      });
    }

    // Create return - TIDAK PERLU kirim total, akan dihitung otomatis
    // TIDAK PERLU kirim nama_produk, akan diambil otomatis dari database
    const returnId = await ReturnModel.create({
      tanggal,
      users_id: parseInt(users_id),
      toko_id: parseInt(toko_id),
      keterangan: keterangan || null,
      status: status || 'pending',
      details: validatedDetails
    });

    // Get the created return
    const newReturn = await ReturnModel.getById(returnId);

    res.status(201).json({
      success: true,
      message: "Return berhasil dibuat",
      data: newReturn
    });
  } catch (error) {
    console.error('Create Return Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat return",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * @desc    Get all return
 * @route   GET /api/return
 * @access  Public
 */
exports.getAllReturn = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id;
    const status = req.query.status;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const users_id = req.query.users_id;

    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    if (status) filters.status = status;
    if (users_id) filters.users_id = users_id;
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }

    const result = await ReturnModel.getAll(page, limit, filters);

    res.json({
      success: true,
      message: "Data return berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all return error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data return"
    });
  }
};

/**
 * @desc    Get return by ID
 * @route   GET /api/return/:id
 * @access  Public
 */
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID return tidak valid"
      });
    }

    const returnItem = await ReturnModel.getById(id);

    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: "Return tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Return berhasil ditemukan",
      data: returnItem
    });
  } catch (error) {
    console.error('Get return by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data return"
    });
  }
};

/**
 * @desc    Get return by toko
 * @route   GET /api/return/toko/:toko_id
 * @access  Public
 */

exports.getReturnByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      start_date,
      end_date
    } = req.query;

    const result = await ReturnModel.getByTokoId(
      toko_id,
      Number(page),
      Number(limit),
      {
        status,
        start_date,
        end_date
      }
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get Return Error:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data return',
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : undefined
    });
  }
};



/**
 * @desc    Get return by status
 * @route   GET /api/return/status/:status
 * @access  Public
 */
exports.getReturnByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { toko_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validasi status
    const validStatus = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilih dari: ${validStatus.join(', ')}`
      });
    }

    // Validasi toko_id jika ada
    if (toko_id) {
      if (isNaN(toko_id)) {
        return res.status(400).json({
          success: false,
          message: "ID toko tidak valid"
        });
      }

      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "toko_id wajib diisi"
      });
    }

    const result = await ReturnModel.getByStatus(parseInt(toko_id), status, page, limit);

    res.json({
      success: true,
      message: `Data return dengan status ${status} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get return by status error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data return"
    });
  }
};
// Di src/controllers/returnController.js, perbaiki updateStatus:

/**
 * @desc    Update status return
 * @route   PATCH /api/return/:id/status
 * @access  Private/Admin
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_id } = req.body;

    // Validasi status
    const validStatus = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilih dari: ${validStatus.join(', ')}`
      });
    }

    // Cek apakah return exists
    const returnExists = await ReturnModel.exists(id);
    if (!returnExists) {
      return res.status(404).json({
        success: false,
        message: "Return tidak ditemukan"
      });
    }

    // Get current return untuk validasi
    const currentReturn = await ReturnModel.getById(id);

    // Validasi: hanya admin yang bisa approve/reject/complete
    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      if (!admin_id) {
        return res.status(400).json({
          success: false,
          message: "admin_id wajib diisi untuk status approved/rejected/completed"
        });
      }

      // Cek apakah admin exists
      const adminExists = await User.exists(admin_id);
      if (!adminExists) {
        return res.status(404).json({
          success: false,
          message: "Admin tidak ditemukan"
        });
      }
    }

    // Update status (yang sekarang sudah include log mutasi stok)
    const updated = await ReturnModel.updateStatus(id, status, admin_id);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate status return"
      });
    }

    const updatedReturn = await ReturnModel.getById(id);

    // Response message berdasarkan status
    let message = `Status return berhasil diubah menjadi ${status}`;

    // Tambahkan pesan khusus untuk status yang melibatkan perubahan stok
    if (status === 'approved') {
      message += " (Stok produk telah ditambahkan dan dicatat dalam mutasi stok)";
    } else if ((status === 'rejected' || status === 'pending') && currentReturn.status === 'approved') {
      message += " (Perubahan stok telah dikembalikan dan dicatat dalam mutasi stok)";
    }

    res.json({
      success: true,
      message: message,
      data: updatedReturn
    });
  } catch (error) {
    console.error('Update status error:', error);

    // Handle error yang lebih spesifik
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: "Data referensi tidak valid (produk atau toko tidak ditemukan)"
      });
    }

    res.status(500).json({
      success: false,
      message: "Gagal mengupdate status return",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * @desc    Update return (hanya untuk pending)
 * @route   PUT /api/return/:id
 * @access  Public
 */
exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, total, keterangan, details } = req.body;

    // Cek apakah return exists
    const returnExists = await ReturnModel.exists(id);
    if (!returnExists) {
      return res.status(404).json({
        success: false,
        message: "Return tidak ditemukan"
      });
    }

    // Validasi input
    if (!tanggal || !details || !Array.isArray(details)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal dan detail produk wajib diisi"
      });
    }

    if (details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Detail produk return tidak boleh kosong"
      });
    }

    // Ambil data return saat ini untuk mendapatkan toko_id
    const currentReturn = await ReturnModel.getById(id);

    // Validasi total harus sesuai dengan jumlah subtotal detail
    let calculatedTotal = 0;
    for (const detail of details) {
      if (!detail.produk_id || !detail.nama_produk || !detail.harga_beli) {
        return res.status(400).json({
          success: false,
          message: "Setiap detail harus memiliki produk_id, nama_produk, dan harga_beli"
        });
      }

      // Cek apakah produk ada
      const produkExists = await Produk.exists(detail.produk_id);
      if (!produkExists) {
        return res.status(404).json({
          success: false,
          message: `Produk dengan ID ${detail.produk_id} tidak ditemukan`
        });
      }

      // Cek apakah produk milik toko yang sama
      const produkToko = await Produk.belongsToToko(detail.produk_id, currentReturn.toko_id);
      if (!produkToko) {
        return res.status(400).json({
          success: false,
          message: `Produk dengan ID ${detail.produk_id} tidak termasuk dalam toko ${currentReturn.toko_id}`
        });
      }

      const quantity = parseInt(detail.quantity) || 1;
      const harga_beli = parseFloat(detail.harga_beli);

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity harus lebih dari 0"
        });
      }

      if (harga_beli <= 0) {
        return res.status(400).json({
          success: false,
          message: "Harga beli harus lebih dari 0"
        });
      }

      calculatedTotal += quantity * harga_beli;
    }

    // Format details
    const formattedDetails = details.map(detail => ({
      produk_id: parseInt(detail.produk_id),
      nama_produk: detail.nama_produk,
      quantity: parseInt(detail.quantity) || 1,
      harga_beli: parseFloat(detail.harga_beli),
      alasan_return: detail.alasan_return || null
    }));

    // Update return
    const updated = await ReturnModel.update(id, {
      tanggal,
      total: calculatedTotal,
      keterangan: keterangan || null,
      details: formattedDetails
    });

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate return. Pastikan status masih pending"
      });
    }

    const updatedReturn = await ReturnModel.getById(id);

    res.json({
      success: true,
      message: "Return berhasil diupdate",
      data: updatedReturn
    });
  } catch (error) {
    console.error('Update return error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate return"
    });
  }
};

/**
 * @desc    Delete return (hanya untuk pending)
 * @route   DELETE /api/return/:id
 * @access  Public
 */
exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah return exists
    const returnExists = await ReturnModel.exists(id);
    if (!returnExists) {
      return res.status(404).json({
        success: false,
        message: "Return tidak ditemukan"
      });
    }

    const deleted = await ReturnModel.delete(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus return. Pastikan status masih pending"
      });
    }

    res.json({
      success: true,
      message: "Return berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete return error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus return"
    });
  }
};

/**
 * @desc    Get return history by produk
 * @route   GET /api/return/produk/:produk_id
 * @access  Public
 */
exports.getReturnByProduk = async (req, res) => {
  try {
    const { produk_id } = req.params;
    const { toko_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validasi produk_id
    if (!produk_id || isNaN(produk_id)) {
      return res.status(400).json({
        success: false,
        message: "ID produk tidak valid"
      });
    }

    // Cek apakah produk exists
    const produkExists = await Produk.exists(produk_id);
    if (!produkExists) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }

    const result = await ReturnModel.getByProduk(parseInt(produk_id), toko_id, page, limit);

    res.json({
      success: true,
      message: `Riwayat return produk ${produk_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get return by produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat return produk"
    });
  }
};

/**
 * @desc    Get summary return
 * @route   GET /api/return/summary/:toko_id
 * @access  Public
 */
exports.getSummary = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start_date, end_date } = req.query;

    // Validasi toko_id
    if (!toko_id || isNaN(toko_id)) {
      return res.status(400).json({
        success: false,
        message: "ID toko tidak valid"
      });
    }

    // Cek apakah toko exists
    const tokoExists = await Toko.exists(toko_id);
    if (!tokoExists) {
      return res.status(404).json({
        success: false,
        message: "Toko tidak ditemukan"
      });
    }

    // Validasi tanggal
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date dan end date wajib diisi"
      });
    }

    const summary = await ReturnModel.getSummary(parseInt(toko_id), start_date, end_date);

    res.json({
      success: true,
      message: `Summary return toko ${toko_id}`,
      data: summary,
      periode: {
        start_date,
        end_date
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil summary return"
    });
  }
};