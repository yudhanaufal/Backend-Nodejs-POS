const Produk = require('../models/Produk');
const Toko = require('../models/Toko');

exports.createProduk = async (req, res) => {
  try {
    const { nama_produk, harga_beli, harga_jual, stok, toko_id } = req.body;

    // Validasi input wajib
    if (!nama_produk || !harga_beli || !harga_jual || !toko_id) {
      return res.status(400).json({
        success: false,
        message: "Nama produk, harga beli, harga jual, dan toko wajib diisi"
      });
    }

    // Validasi harga
    if (isNaN(harga_beli) || isNaN(harga_jual)) {
      return res.status(400).json({
        success: false,
        message: "Harga beli dan harga jual harus berupa angka"
      });
    }

    if (parseFloat(harga_beli) <= 0 || parseFloat(harga_jual) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Harga harus lebih dari 0"
      });
    }

    // Validasi stok (jika ada)
    if (stok && (isNaN(stok) || parseInt(stok) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Stok harus angka dan tidak boleh negatif"
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

    // Create produk
    const produkId = await Produk.create({
      nama_produk,
      harga_beli: parseFloat(harga_beli),
      harga_jual: parseFloat(harga_jual),
      stok: stok ? parseInt(stok) : 0,
      toko_id: parseInt(toko_id)
    });

    // Get the created produk
    const newProduk = await Produk.getById(produkId);

    res.status(201).json({
      success: true,
      message: "Produk berhasil dibuat",
      data: newProduk
    });
  } catch (error) {
    console.error('Create Produk Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat produk",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllProduk = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id;
    const search = req.query.search;
    
    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    if (search) filters.search = search;
    
    const result = await Produk.getAll(page, limit, filters);
    
    res.json({
      success: true,
      message: "Data produk berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data produk"
    });
  }
};

exports.getProdukById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID produk tidak valid"
      });
    }
    
    const produk = await Produk.getById(id);
    
    if (!produk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Produk berhasil ditemukan",
      data: produk
    });
  } catch (error) {
    console.error('Get produk by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data produk"
    });
  }
};

exports.getProdukByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
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
    
    const result = await Produk.getByTokoId(parseInt(toko_id), page, limit);
    
    res.json({
      success: true,
      message: `Data produk toko ${toko_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get produk by toko error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data produk"
    });
  }
};

exports.updateProduk = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, harga_beli, harga_jual, stok, toko_id } = req.body;
    
    // Cek apakah produk exists
    const produkExists = await Produk.exists(id);
    if (!produkExists) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }
    
    // Validasi input
    if (!nama_produk || !harga_beli || !harga_jual || !toko_id) {
      return res.status(400).json({
        success: false,
        message: "Nama produk, harga beli, harga jual, dan toko wajib diisi"
      });
    }
    
    // Validasi harga
    if (isNaN(harga_beli) || isNaN(harga_jual)) {
      return res.status(400).json({
        success: false,
        message: "Harga beli dan harga jual harus berupa angka"
      });
    }
    
    // Validasi toko
    const tokoExists = await Toko.exists(toko_id);
    if (!tokoExists) {
      return res.status(404).json({
        success: false,
        message: "Toko tidak ditemukan"
      });
    }
    
    // Update produk
    const updated = await Produk.update(id, {
      nama_produk,
      harga_beli: parseFloat(harga_beli),
      harga_jual: parseFloat(harga_jual),
      stok: stok ? parseInt(stok) : 0,
      toko_id: parseInt(toko_id)
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate produk"
      });
    }
    
    const updatedProduk = await Produk.getById(id);
    
    res.json({
      success: true,
      message: "Produk berhasil diupdate",
      data: updatedProduk
    });
  } catch (error) {
    console.error('Update produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate produk"
    });
  }
};

exports.updateStok = async (req, res) => {
  try {
    const { id } = req.params;
    const { stok, action, quantity } = req.body;
    
    // Cek apakah produk exists
    const produkExists = await Produk.exists(id);
    if (!produkExists) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }
    
    let updated = false;
    
    if (stok !== undefined) {
      // Update stok langsung
      if (isNaN(stok) || parseInt(stok) < 0) {
        return res.status(400).json({
          success: false,
          message: "Stok harus angka dan tidak boleh negatif"
        });
      }
      
      updated = await Produk.updateStok(id, parseInt(stok));
    } 
    else if (action && quantity) {
      // Adjust stok (tambah/kurangi)
      if (isNaN(quantity)) {
        return res.status(400).json({
          success: false,
          message: "Quantity harus berupa angka"
        });
      }
      
      const qty = action === 'tambah' ? parseInt(quantity) : -parseInt(quantity);
      updated = await Produk.adjustStok(id, qty);
    }
    else {
      return res.status(400).json({
        success: false,
        message: "Berikan stok atau action dengan quantity"
      });
    }
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate stok"
      });
    }
    
    const updatedProduk = await Produk.getById(id);
    
    res.json({
      success: true,
      message: "Stok produk berhasil diupdate",
      data: updatedProduk
    });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate stok"
    });
  }
};

exports.deleteProduk = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah produk exists
    const produkExists = await Produk.exists(id);
    if (!produkExists) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }
    
    const deleted = await Produk.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus produk"
      });
    }
    
    res.json({
      success: true,
      message: "Produk berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus produk"
    });
  }
};

exports.searchProduk = async (req, res) => {
  try {
    const { q } = req.query;
    const { toko_id } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Kata kunci pencarian harus diisi"
      });
    }
    
    const results = await Produk.search(q.trim(), toko_id);
    
    res.json({
      success: true,
      message: "Pencarian selesai",
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Search produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal melakukan pencarian"
    });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const { toko_id } = req.query;
    
    const results = await Produk.getLowStock(threshold, toko_id);
    
    res.json({
      success: true,
      message: `Produk dengan stok ≤ ${threshold}`,
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data low stock"
    });
  }
};