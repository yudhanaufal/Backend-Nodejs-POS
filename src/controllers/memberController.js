const Member = require('../models/Member');
const Toko = require('../models/Toko');

exports.createMember = async (req, res) => {
  try {
    const { nama_member, no_tlp, alamat, toko_id } = req.body;

    // Validasi input wajib
    if (!nama_member || !no_tlp || !toko_id) {
      return res.status(400).json({
        success: false,
        message: "Nama member, nomor telepon, dan toko wajib diisi"
      });
    }

    // Validasi format telepon
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(no_tlp)) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon harus 10-15 digit angka"
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

    // Cek apakah nomor telepon sudah terdaftar di toko yang sama
    const existingMember = await Member.getByTelepon(no_tlp, toko_id);
    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "Nomor telepon sudah terdaftar untuk toko ini"
      });
    }

    // Create member
    const memberId = await Member.create({
      nama_member,
      no_tlp,
      alamat: alamat || null,
      toko_id: parseInt(toko_id)
    });

    // Get the created member
    const newMember = await Member.getById(memberId);

    res.status(201).json({
      success: true,
      message: "Member berhasil dibuat",
      data: newMember
    });
  } catch (error) {
    console.error('Create Member Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat member",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllMember = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id;
    const search = req.query.search;
    
    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    if (search) filters.search = search;
    
    const result = await Member.getAll(page, limit, filters);
    
    res.json({
      success: true,
      message: "Data member berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all member error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data member"
    });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID member tidak valid"
      });
    }
    
    const member = await Member.getById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Member berhasil ditemukan",
      data: member
    });
  } catch (error) {
    console.error('Get member by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data member"
    });
  }
};

exports.getMemberByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    
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
    
    const result = await Member.getByTokoId(parseInt(toko_id), page, limit);
    
    res.json({
      success: true,
      message: `Data member toko ${toko_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get member by toko error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data member"
    });
  }
};

exports.getMemberByTelepon = async (req, res) => {
  try {
    const { no_tlp } = req.params;
    const { toko_id } = req.query;
    
    if (!no_tlp) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon harus diisi"
      });
    }
    
    const member = await Member.getByTelepon(no_tlp, toko_id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Member berhasil ditemukan",
      data: member
    });
  } catch (error) {
    console.error('Get member by telepon error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mencari member"
    });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_member, no_tlp, alamat, toko_id } = req.body;
    
    // Cek apakah member exists
    const memberExists = await Member.exists(id);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan"
      });
    }
    
    // Validasi input
    if (!nama_member || !no_tlp || !toko_id) {
      return res.status(400).json({
        success: false,
        message: "Nama member, nomor telepon, dan toko wajib diisi"
      });
    }
    
    // Validasi format telepon
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(no_tlp)) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon harus 10-15 digit angka"
      });
    }
    
    // Cek apakah nomor telepon sudah digunakan oleh member lain
    const teleponExists = await Member.teleponExists(no_tlp, id);
    if (teleponExists) {
      return res.status(409).json({
        success: false,
        message: "Nomor telepon sudah digunakan oleh member lain"
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
    
    // Update member
    const updated = await Member.update(id, {
      nama_member,
      no_tlp,
      alamat: alamat || null,
      toko_id: parseInt(toko_id)
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate member"
      });
    }
    
    const updatedMember = await Member.getById(id);
    
    res.json({
      success: true,
      message: "Member berhasil diupdate",
      data: updatedMember
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate member"
    });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah member exists
    const memberExists = await Member.exists(id);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan"
      });
    }
    
    const deleted = await Member.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus member"
      });
    }
    
    res.json({
      success: true,
      message: "Member berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus member"
    });
  }
};

exports.searchMember = async (req, res) => {
  try {
    const { q } = req.query;
    const { toko_id } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Kata kunci pencarian harus diisi"
      });
    }
    
    const results = await Member.search(q.trim(), toko_id);
    
    res.json({
      success: true,
      message: "Pencarian selesai",
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Search member error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal melakukan pencarian"
    });
  }
};

exports.getMemberStats = async (req, res) => {
  try {
    const { toko_id } = req.params;
    
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
    
    const stats = await Member.getStatsByToko(parseInt(toko_id));
    
    res.json({
      success: true,
      message: `Statistik member toko ${toko_id}`,
      data: stats
    });
  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik member"
    });
  }
};