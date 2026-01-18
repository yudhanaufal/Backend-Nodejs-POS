const Operasional = require('../models/Operasional');
const Toko = require('../models/Toko');
const User = require('../models/Users');

/**
 * @desc    Create new operasional dengan detail
 * @route   POST /api/operasional
 * @access  Public
 */
exports.createOperasional = async (req, res) => {
  try {
    const { tanggal, total, toko_id, users_id, keterangan, details } = req.body;

    // Validasi input wajib
    if (!tanggal || !toko_id || !users_id || !details || !Array.isArray(details)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, toko, user, dan detail pengeluaran wajib diisi"
      });
    }

    // Validasi details tidak boleh kosong
    if (details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Detail pengeluaran tidak boleh kosong"
      });
    }

    // Validasi total harus sesuai dengan jumlah subtotal detail
    let calculatedTotal = 0;
    for (const detail of details) {
      if (!detail.jenis_pengeluaran || !detail.harga) {
        return res.status(400).json({
          success: false,
          message: "Setiap detail harus memiliki jenis pengeluaran dan harga"
        });
      }
      
      const quantity = parseFloat(detail.quantity) || 1;
      const harga = parseFloat(detail.harga);
      
      if (harga <= 0) {
        return res.status(400).json({
          success: false,
          message: "Harga harus lebih dari 0"
        });
      }
      
      calculatedTotal += quantity * harga;
    }

    // Validasi total harus sama dengan perhitungan
    const inputTotal = parseFloat(total);
    if (Math.abs(inputTotal - calculatedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Total tidak sesuai. Input: ${inputTotal}, Hitung: ${calculatedTotal.toFixed(2)}`
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

    // Format details
    const formattedDetails = details.map(detail => ({
      jenis_pengeluaran: detail.jenis_pengeluaran,
      quantity: parseFloat(detail.quantity) || 1,
      harga: parseFloat(detail.harga)
    }));

    // Create operasional
    const operasionalId = await Operasional.create({
      tanggal,
      total: calculatedTotal,
      toko_id: parseInt(toko_id),
      users_id: parseInt(users_id),
      keterangan: keterangan || null,
      details: formattedDetails
    });

    // Get the created operasional
    const newOperasional = await Operasional.getById(operasionalId);

    res.status(201).json({
      success: true,
      message: "Operasional berhasil dibuat",
      data: newOperasional
    });
  } catch (error) {
    console.error('Create Operasional Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat operasional",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all operasional
 * @route   GET /api/operasional
 * @access  Public
 */
exports.getAllOperasional = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id;
    const users_id = req.query.users_id;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    
    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    if (users_id) filters.users_id = users_id;
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }
    
    const result = await Operasional.getAll(page, limit, filters);
    
    res.json({
      success: true,
      message: "Data operasional berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all operasional error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data operasional"
    });
  }
};

/**
 * @desc    Get operasional by ID
 * @route   GET /api/operasional/:id
 * @access  Public
 */
exports.getOperasionalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID operasional tidak valid"
      });
    }
    
    const operasional = await Operasional.getById(id);
    
    if (!operasional) {
      return res.status(404).json({
        success: false,
        message: "Operasional tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Operasional berhasil ditemukan",
      data: operasional
    });
  } catch (error) {
    console.error('Get operasional by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data operasional"
    });
  }
};

/**
 * @desc    Get operasional by toko
 * @route   GET /api/operasional/toko/:toko_id
 * @access  Public
 */
exports.getOperasionalByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const users_id = req.query.users_id;
    
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
    
    const filters = {};
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }
    if (users_id) {
      filters.users_id = users_id;
    }
    
    const result = await Operasional.getByTokoId(parseInt(toko_id), page, limit, filters);
    
    res.json({
      success: true,
      message: `Data operasional toko ${toko_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get operasional by toko error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data operasional"
    });
  }
};

/**
 * @desc    Get operasional by tanggal
 * @route   GET /api/operasional/tanggal/:tanggal
 * @access  Public
 */
exports.getOperasionalByTanggal = async (req, res) => {
  try {
    const { tanggal } = req.params;
    const { toko_id } = req.query;
    
    if (!tanggal) {
      return res.status(400).json({
        success: false,
        message: "Tanggal harus diisi"
      });
    }
    
    // Jika ada toko_id, validasi toko
    if (toko_id) {
      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }
    }
    
    const operasionalList = await Operasional.getByTanggal(tanggal, toko_id);
    
    res.json({
      success: true,
      message: `Data operasional tanggal ${tanggal} berhasil diambil`,
      data: operasionalList,
      total: operasionalList.length
    });
  } catch (error) {
    console.error('Get operasional by tanggal error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data operasional"
    });
  }
};

/**
 * @desc    Update operasional
 * @route   PUT /api/operasional/:id
 * @access  Public
 */
exports.updateOperasional = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, total, toko_id, users_id, keterangan, details } = req.body;
    
    // Cek apakah operasional exists
    const operasionalExists = await Operasional.exists(id);
    if (!operasionalExists) {
      return res.status(404).json({
        success: false,
        message: "Operasional tidak ditemukan"
      });
    }
    
    // Validasi input
    if (!tanggal || !toko_id || !users_id || !details || !Array.isArray(details)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, toko, user, dan detail pengeluaran wajib diisi"
      });
    }
    
    if (details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Detail pengeluaran tidak boleh kosong"
      });
    }
    
    // Hitung total dari details
    let calculatedTotal = 0;
    for (const detail of details) {
      if (!detail.jenis_pengeluaran || !detail.harga) {
        return res.status(400).json({
          success: false,
          message: "Setiap detail harus memiliki jenis pengeluaran dan harga"
        });
      }
      
      const quantity = parseFloat(detail.quantity) || 1;
      const harga = parseFloat(detail.harga);
      
      if (harga <= 0) {
        return res.status(400).json({
          success: false,
          message: "Harga harus lebih dari 0"
        });
      }
      
      calculatedTotal += quantity * harga;
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
    
    // Format details
    const formattedDetails = details.map(detail => ({
      jenis_pengeluaran: detail.jenis_pengeluaran,
      quantity: parseFloat(detail.quantity) || 1,
      harga: parseFloat(detail.harga)
    }));
    
    // Update operasional
    const updated = await Operasional.update(id, {
      tanggal,
      total: calculatedTotal,
      toko_id: parseInt(toko_id),
      users_id: parseInt(users_id),
      keterangan: keterangan || null,
      details: formattedDetails
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate operasional"
      });
    }
    
    const updatedOperasional = await Operasional.getById(id);
    
    res.json({
      success: true,
      message: "Operasional berhasil diupdate",
      data: updatedOperasional
    });
  } catch (error) {
    console.error('Update operasional error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate operasional"
    });
  }
};

/**
 * @desc    Delete operasional
 * @route   DELETE /api/operasional/:id
 * @access  Public
 */
exports.deleteOperasional = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah operasional exists
    const operasionalExists = await Operasional.exists(id);
    if (!operasionalExists) {
      return res.status(404).json({
        success: false,
        message: "Operasional tidak ditemukan"
      });
    }
    
    const deleted = await Operasional.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus operasional"
      });
    }
    
    res.json({
      success: true,
      message: "Operasional berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete operasional error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus operasional"
    });
  }
};

/**
 * @desc    Get summary operasional
 * @route   GET /api/operasional/summary/:toko_id
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
    
    const summary = await Operasional.getSummary(parseInt(toko_id), start_date, end_date);
    
    res.json({
      success: true,
      message: `Summary operasional toko ${toko_id}`,
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
      message: "Gagal mengambil summary operasional"
    });
  }
};

/**
 * @desc    Get daily summary
 * @route   GET /api/operasional/daily-summary/:toko_id/:tanggal
 * @access  Public
 */
exports.getDailySummary = async (req, res) => {
  try {
    const { toko_id, tanggal } = req.params;
    
    // Validasi toko_id
    if (!toko_id || isNaN(toko_id)) {
      return res.status(400).json({
        success: false,
        message: "ID toko tidak valid"
      });
    }
    
    // Validasi tanggal
    if (!tanggal) {
      return res.status(400).json({
        success: false,
        message: "Tanggal harus diisi"
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
    
    const summary = await Operasional.getDailySummary(parseInt(toko_id), tanggal);
    
    res.json({
      success: true,
      message: `Daily summary operasional toko ${toko_id} tanggal ${tanggal}`,
      data: summary
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daily summary"
    });
  }
};

/**
 * @desc    Get monthly summary
 * @route   GET /api/operasional/monthly-summary/:toko_id/:year/:month
 * @access  Public
 */
exports.getMonthlySummary = async (req, res) => {
  try {
    const { toko_id, year, month } = req.params;
    
    // Validasi toko_id
    if (!toko_id || isNaN(toko_id)) {
      return res.status(400).json({
        success: false,
        message: "ID toko tidak valid"
      });
    }
    
    // Validasi year dan month
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year dan month harus diisi"
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
    
    const summary = await Operasional.getMonthlySummary(parseInt(toko_id), year, month);
    
    res.json({
      success: true,
      message: `Monthly summary operasional toko ${toko_id} bulan ${month}-${year}`,
      data: summary
    });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil monthly summary"
    });
  }
};

/**
 * @desc    Get statistik by jenis pengeluaran
 * @route   GET /api/operasional/statistik/jenis-pengeluaran/:toko_id
 * @access  Public
 */
exports.getStatistikByJenis = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    
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
    
    const statistik = await Operasional.getByJenisPengeluaran(
      parseInt(toko_id), 
      start_date, 
      end_date
    );
    
    res.json({
      success: true,
      message: `Statistik jenis pengeluaran toko ${toko_id}`,
      data: statistik
    });
  } catch (error) {
    console.error('Get statistik by jenis error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik"
    });
  }
};