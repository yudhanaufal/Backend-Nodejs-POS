const Produk = require('../models/Produk');
const Toko = require('../models/Toko');
const { uploadProdukGambar } = require('../config/multer');

/**
 * @desc    Create new produk dengan gambar
 * @route   POST /api/produk
 * @access  Public
 */
exports.createProduk = async (req, res) => {
  try {
    uploadProdukGambar(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      const { nama_produk, barcode,harga_beli, harga_jual, stok, toko_id } = req.body;

      // Validasi input wajib
      if (!nama_produk || !harga_beli ||!barcode || !harga_jual || !toko_id) {
        // Hapus file jika validasi gagal
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Nama produk, harga beli, harga jual, dan toko wajib diisi"
        });
      }

      // Validasi harga
      if (isNaN(harga_beli) || isNaN(harga_jual)) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Harga beli dan harga jual harus berupa angka"
        });
      }

      if (parseFloat(harga_beli) <= 0 || parseFloat(harga_jual) <= 0) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Harga harus lebih dari 0"
        });
      }

      // Validasi stok
      if (stok && (isNaN(stok) || parseInt(stok) < 0)) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Stok harus angka dan tidak boleh negatif"
        });
      }

      // Cek apakah toko exists
      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }

      // Siapkan data produk
      const produkData = {
        nama_produk,
        barcode,
        harga_beli: parseFloat(harga_beli),
        harga_jual: parseFloat(harga_jual),
        stok: stok ? parseInt(stok) : 0,
        gambar: req.file ? req.file.filename : null,
        toko_id: parseInt(toko_id)
      };

      try {
        // Create produk
        const produkId = await Produk.create(produkData);
        const newProduk = await Produk.getById(produkId);

        res.status(201).json({
          success: true,
          message: "Produk berhasil dibuat",
          data: newProduk
        });
      } catch (error) {
        // Hapus file jika create gagal
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        throw error;
      }
    });
  } catch (error) {
    console.error('Create Produk Error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat produk"
    });
  }
};

/**
 * @desc    Get all produk
 * @route   GET /api/produk
 * @access  Public
 */
exports.getAllProduk = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
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

/**
 * @desc    Get produk by ID
 * @route   GET /api/produk/:id
 * @access  Public
 */
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

/**
 * @desc    Get produk by toko
 * @route   GET /api/produk/toko/:toko_id
 * @access  Public
 */
exports.getProdukByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    
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

/**
 * @desc    Update produk dengan gambar
 * @route   PUT /api/produk/:id
 * @access  Public
 */
exports.updateProduk = async (req, res) => {
  try {
    uploadProdukGambar(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      const { id } = req.params;
      const { nama_produk, barcode,harga_beli, harga_jual, stok, toko_id, hapus_gambar } = req.body;

      // Cek apakah produk exists
      const produkExists = await Produk.exists(id);
      if (!produkExists) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan"
        });
      }

      // Validasi input
      if (!nama_produk || !barcode ||!harga_beli || !harga_jual || !toko_id) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Nama produk, harga beli, harga jual, dan toko wajib diisi"
        });
      }

      // Validasi harga
      if (isNaN(harga_beli) || isNaN(harga_jual)) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: "Harga beli dan harga jual harus berupa angka"
        });
      }

      // Cek apakah toko exists
      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }

      // Siapkan data update
      const updateData = {
        nama_produk,
        barcode,
        harga_beli: parseFloat(harga_beli),
        harga_jual: parseFloat(harga_jual),
        stok: stok ? parseInt(stok) : 0,
        toko_id: parseInt(toko_id)
      };

      // Handle gambar
      if (req.file) {
        // Gunakan gambar baru
        updateData.gambar = req.file.filename;
      } else if (hapus_gambar === 'true' || hapus_gambar === true) {
        // Hapus gambar
        updateData.gambar = null;
      } else {
        // Pertahankan gambar lama (tidak update gambar)
        const currentProduk = await Produk.getById(id);
        updateData.gambar = currentProduk.gambar;
      }

      try {
        // Update produk
        const updated = await Produk.update(id, updateData);
        
        if (!updated) {
          if (req.file) {
            require('fs').unlinkSync(req.file.path);
          }
          
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
        if (req.file) {
          require('fs').unlinkSync(req.file.path);
        }
        throw error;
      }
    });
  } catch (error) {
    console.error('Update produk error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate produk"
    });
  }
};

/**
 * @desc    Upload gambar untuk produk
 * @route   POST /api/produk/:id/upload
 * @access  Public
 */
exports.uploadGambar = async (req, res) => {
  try {
    uploadProdukGambar(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File gambar diperlukan"
        });
      }
      
      // Cek apakah produk exists
      const produkExists = await Produk.exists(id);
      if (!produkExists) {
        // Hapus file yang sudah diupload
        require('fs').unlinkSync(req.file.path);
        
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan"
        });
      }
      
      try {
        // Update hanya gambar
        const updated = await Produk.updateGambar(id, req.file.filename);
        
        if (!updated) {
          require('fs').unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            message: "Gagal mengupload gambar"
          });
        }
        
        const produk = await Produk.getById(id);
        
        res.json({
          success: true,
          message: "Gambar berhasil diupload",
          data: {
            produk: produk,
            gambar_info: {
              filename: req.file.filename,
              originalname: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
              url: produk.gambar_url
            }
          }
        });
      } catch (error) {
        // Hapus file jika update gagal
        require('fs').unlinkSync(req.file.path);
        throw error;
      }
    });
  } catch (error) {
    console.error('Upload gambar error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupload gambar"
    });
  }
};

/**
 * @desc    Hapus gambar produk
 * @route   DELETE /api/produk/:id/gambar
 * @access  Public
 */
exports.deleteGambar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah produk exists
    const produk = await Produk.getById(id);
    if (!produk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan"
      });
    }
    
    if (!produk.gambar) {
      return res.status(400).json({
        success: false,
        message: "Produk tidak memiliki gambar"
      });
    }
    
    // Update produk dengan menghapus gambar
    const updated = await Produk.update(id, {
      nama_produk: produk.nama_produk,
      harga_beli: produk.harga_beli,
      harga_jual: produk.harga_jual,
      stok: produk.stok,
      gambar: null,
      toko_id: produk.toko_id
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus gambar"
      });
    }
    
    res.json({
      success: true,
      message: "Gambar produk berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete gambar error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus gambar"
    });
  }
};

/**
 * @desc    Update stok produk
 * @route   PATCH /api/produk/:id/stok
 * @access  Public
 */
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

/**
 * @desc    Delete produk
 * @route   DELETE /api/produk/:id
 * @access  Public
 */
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

/**
 * @desc    Search produk
 * @route   GET /api/produk/search/all
 * @access  Public
 */
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

/**
 * @desc    Get low stock produk
 * @route   GET /api/produk/inventory/low-stock
 * @access  Public
 */
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

exports.getMutasiProduk = async (req, res) => {
    try {
      const { produk_id } = req.params;

      const produk = await Produk.findById(produk_id);
      if (!produk) {
        return res.status(404).json({
          success: false,
          message: 'Produk tidak ditemukan'
        });
      }

      const mutasi = await Produk.getMutasiByProduk(produk_id);

      res.json({
        success: true,
        produk,
        mutasi
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  };

