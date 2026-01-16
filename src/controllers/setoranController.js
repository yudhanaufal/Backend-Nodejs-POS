const Setoran = require('../models/Setoran');
const Toko = require('../models/Toko');
const User = require('../models/Users');

exports.createSetoran = async (req, res) => {
  try {
    const { cash, transfer, tanggal, total, toko_id, users_id, keterangan } = req.body;

    // Validasi input wajib
    if (!tanggal || !toko_id || !users_id) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, toko, dan user wajib diisi"
      });
    }

    // Validasi total = cash + transfer
    const cashValue = parseFloat(cash) || 0;
    const transferValue = parseFloat(transfer) || 0;
    const totalValue = parseFloat(total) || 0;
    
    if (totalValue !== (cashValue + transferValue)) {
      return res.status(400).json({
        success: false,
        message: "Total harus sama dengan jumlah cash + transfer"
      });
    }

    // Validasi tidak boleh negatif
    if (cashValue < 0 || transferValue < 0 || totalValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Cash, transfer, dan total tidak boleh negatif"
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

    // Cek apakah user sudah setor di tanggal yang sama
    const existingSetoran = await Setoran.getByUserDate(users_id, tanggal);
    if (existingSetoran.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User sudah melakukan setoran pada tanggal ini"
      });
    }

    // Create setoran
    const setoranId = await Setoran.create({
      cash: cashValue,
      transfer: transferValue,
      tanggal,
      total: totalValue,
      toko_id: parseInt(toko_id),
      users_id: parseInt(users_id),
      keterangan: keterangan || null
    });

    // Get the created setoran
    const newSetoran = await Setoran.getById(setoranId);

    res.status(201).json({
      success: true,
      message: "Setoran berhasil dibuat",
      data: newSetoran
    });
  } catch (error) {
    console.error('Create Setoran Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat setoran",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllSetoran = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id;
    const users_id = req.query.users_id;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const tanggal = req.query.tanggal;
    
    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    if (users_id) filters.users_id = users_id;
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    } else if (tanggal) {
      filters.tanggal = tanggal;
    }
    
    const result = await Setoran.getAll(page, limit, filters);
    
    res.json({
      success: true,
      message: "Data setoran berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all setoran error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data setoran"
    });
  }
};

exports.getSetoranById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID setoran tidak valid"
      });
    }
    
    const setoran = await Setoran.getById(id);
    
    if (!setoran) {
      return res.status(404).json({
        success: false,
        message: "Setoran tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Setoran berhasil ditemukan",
      data: setoran
    });
  } catch (error) {
    console.error('Get setoran by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data setoran"
    });
  }
};

exports.getSetoranByToko = async (req, res) => {
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
    
    const result = await Setoran.getByTokoId(parseInt(toko_id), page, limit, filters);
    
    res.json({
      success: true,
      message: `Data setoran toko ${toko_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get setoran by toko error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data setoran"
    });
  }
};

exports.getSetoranByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const toko_id = req.query.toko_id;
    
    // Validasi user_id
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "ID user tidak valid"
      });
    }
    
    // Cek apakah user exists
    const userExists = await User.exists(user_id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }
    
    const filters = {};
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }
    if (toko_id) {
      filters.toko_id = toko_id;
    }
    
    const result = await Setoran.getByUserId(parseInt(user_id), page, limit, filters);
    
    res.json({
      success: true,
      message: `Data setoran user ${user_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get setoran by user error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data setoran"
    });
  }
};

exports.getSetoranByTanggal = async (req, res) => {
  try {
    const { tanggal } = req.params;
    const { toko_id } = req.query;
    
    if (!tanggal) {
      return res.status(400).json({
        success: false,
        message: "Tanggal harus diisi"
      });
    }
    
    // Validasi format tanggal (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal harus YYYY-MM-DD"
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
    
    const setoranList = await Setoran.getByTanggal(tanggal, toko_id);
    
    res.json({
      success: true,
      message: `Data setoran tanggal ${tanggal} berhasil diambil`,
      data: setoranList,
      total: setoranList.length
    });
  } catch (error) {
    console.error('Get setoran by tanggal error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data setoran"
    });
  }
};

exports.updateSetoran = async (req, res) => {
  try {
    const { id } = req.params;
    const { cash, transfer, tanggal, total, toko_id, users_id, keterangan } = req.body;
    
    // Cek apakah setoran exists
    const setoranExists = await Setoran.exists(id);
    if (!setoranExists) {
      return res.status(404).json({
        success: false,
        message: "Setoran tidak ditemukan"
      });
    }
    
    // Validasi input
    if (!tanggal || !toko_id || !users_id) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, toko, dan user wajib diisi"
      });
    }
    
    // Validasi total = cash + transfer
    const cashValue = parseFloat(cash) || 0;
    const transferValue = parseFloat(transfer) || 0;
    const totalValue = parseFloat(total) || 0;
    
    if (totalValue !== (cashValue + transferValue)) {
      return res.status(400).json({
        success: false,
        message: "Total harus sama dengan jumlah cash + transfer"
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
    
    // Update setoran
    const updated = await Setoran.update(id, {
      cash: cashValue,
      transfer: transferValue,
      tanggal,
      total: totalValue,
      toko_id: parseInt(toko_id),
      users_id: parseInt(users_id),
      keterangan: keterangan || null
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate setoran"
      });
    }
    
    const updatedSetoran = await Setoran.getById(id);
    
    res.json({
      success: true,
      message: "Setoran berhasil diupdate",
      data: updatedSetoran
    });
  } catch (error) {
    console.error('Update setoran error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate setoran"
    });
  }
};

exports.deleteSetoran = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah setoran exists
    const setoranExists = await Setoran.exists(id);
    if (!setoranExists) {
      return res.status(404).json({
        success: false,
        message: "Setoran tidak ditemukan"
      });
    }
    
    const deleted = await Setoran.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus setoran"
      });
    }
    
    res.json({
      success: true,
      message: "Setoran berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete setoran error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus setoran"
    });
  }
};

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
    
    const summary = await Setoran.getSummary(parseInt(toko_id), start_date, end_date);
    
    res.json({
      success: true,
      message: `Summary setoran toko ${toko_id}`,
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
      message: "Gagal mengambil summary setoran"
    });
  }
};

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
    
    const summary = await Setoran.getDailySummary(parseInt(toko_id), tanggal);
    
    res.json({
      success: true,
      message: `Daily summary setoran toko ${toko_id} tanggal ${tanggal}`,
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
    
    const summary = await Setoran.getMonthlySummary(parseInt(toko_id), year, month);
    
    res.json({
      success: true,
      message: `Monthly summary setoran toko ${toko_id} bulan ${month}-${year}`,
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

exports.getTopUsers = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const limit = parseInt(req.query.limit) || 5;
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
    
    const topUsers = await Setoran.getTopUsers(parseInt(toko_id), limit, start_date, end_date);
    
    res.json({
      success: true,
      message: `Top ${limit} users setoran toko ${toko_id}`,
      data: topUsers
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil top users setoran"
    });
  }
};