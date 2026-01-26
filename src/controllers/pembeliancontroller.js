const pembelianModel = require('../models/Pembelian');

const pembeliancontroller = {
  // ============================================
  // 1. CREATE PEMBELIAN
  // ============================================
  async createPembelian(req, res) {
    try {
      const { pembelian, detail } = req.body;

      // Validasi input
      if (!pembelian || !detail || !Array.isArray(detail)) {
        return res.status(400).json({
          success: false,
          message: 'Data pembelian dan detail harus diisi'
        });
      }

      // Validasi required fields
      if (!pembelian.users_id || !pembelian.toko_id) {
        return res.status(400).json({
          success: false,
          message: 'users_id dan toko_id harus diisi'
        });
      }

      // Hitung total jika tidak diisi
      if (!pembelian.total) {
        pembelian.total = 0; // Akan dihitung otomatis di model
      }

      const result = await pembelianModel.createPembelian(pembelian, detail);
      
      res.status(201).json({
        success: true,
        message: 'Pembelian berhasil dibuat',
        data: result
      });
    } catch (error) {
      console.error('Error createPembelian:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat pembelian',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============================================
  // 2. GET ALL PEMBELIAN
  // ============================================
  async getAllPembelian(req, res) {
    try {
      const pembelian = await pembelianModel.getAllPembelian();
      res.json({
        success: true,
        data: pembelian,
        count: pembelian.length
      });
    } catch (error) {
      console.error('Error getAllPembelian:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pembelian'
      });
    }
  },

  // ============================================
  // 3. GET PEMBELIAN BY ID
  // ============================================
  async getPembelianById(req, res) {
    try {
      const { id } = req.params;
      const pembelian = await pembelianModel.getPembelianById(id);

      if (!pembelian) {
        return res.status(404).json({
          success: false,
          message: 'Pembelian tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: pembelian
      });
    } catch (error) {
      console.error('Error getPembelianById:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pembelian'
      });
    }
  },

  // ============================================
  // 4. GET PEMBELIAN BY TOKO
  // ============================================
 async getPembelianByToko(req, res) {
try {
const { toko_id } = req.params;


if (!toko_id || isNaN(toko_id)) {
return res.status(400).json({
success: false,
message: 'ID toko harus berupa angka'
});
}


const filters = {
page: parseInt(req.query.page) || 1,
limit: parseInt(req.query.limit) || 20,
status: req.query.status || 'ALL'
};


const result = await pembelianModel.getPembelianByToko(
parseInt(toko_id),
filters
);


res.json({
success: true,
data: result.data,
pagination: result.pagination,
filters
});


} catch (error) {
console.error('Controller getPembelianByToko error:', error);
res.status(500).json({
success: false,
message: 'Gagal mengambil data pembelian'
});
}
},
  // ============================================
  // 5. UPDATE HARGA BELI
  // ============================================
  async updateHargaBeli(req, res) {
    try {
      const { pembelianId, detailId } = req.params;
      const { harga_beli } = req.body;

      if (!harga_beli || isNaN(harga_beli) || harga_beli <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Harga beli harus berupa angka positif'
        });
      }

      const result = await pembelianModel.updateHargaBeli(
        parseInt(pembelianId),
        parseInt(detailId),
        parseFloat(harga_beli)
      );

      res.json({
        success: true,
        message: 'Harga beli berhasil diupdate',
        data: result
      });
    } catch (error) {
      console.error('Error updateHargaBeli:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal update harga beli',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
async updateStatusPembelian(req, res) {
    try {
      const { id } = req.params;
      const { status, alasan_cancel } = req.body;

      // Validasi input
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status harus diisi'
        });
      }

      // Validasi status yang diperbolehkan
      const validStatus = ['DRAFT', 'PROSES', 'SELESAI', 'BATAL'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status harus salah satu dari: ${validStatus.join(', ')}`
        });
      }

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID pembelian harus berupa angka'
        });
      }

      // Panggil model
      const result = await pembelianModel.updateStatusPembelian(
        parseInt(id),
        status,
        alasan_cancel || null
      );

      res.json({
        success: true,
        message: result.message,
        data: result
      });

    } catch (error) {
      console.error('❌ Error updateStatusPembelian:', error.message);

      // Custom error messages
      let errorMessage = 'Gagal mengupdate status pembelian';
      let statusCode = 500;

      if (error.message.includes('tidak ditemukan')) {
        errorMessage = 'Pembelian tidak ditemukan';
        statusCode = 404;
      } else if (error.message.includes('Stok produk')) {
        errorMessage = error.message;
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },


  // ============================================
  // 6. GET HARGA PRODUK
  // ============================================
  async getHargaProduk(req, res) {
    try {
      const { produk_id, toko_id } = req.query;

      if (!produk_id || !toko_id) {
        return res.status(400).json({
          success: false,
          message: 'produk_id dan toko_id diperlukan'
        });
      }

      const produk = await pembelianModel.getHargaProduk(
        parseInt(produk_id),
        parseInt(toko_id)
      );

      if (!produk) {
        return res.status(404).json({
          success: false,
          message: 'Produk tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: produk
      });
    } catch (error) {
      console.error('Error getHargaProduk:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data produk'
      });
    }
  },

  // ============================================
  // 7. SEARCH PRODUK
  // ============================================
  async searchProduk(req, res) {
    try {
      const { keyword, toko_id } = req.query;

      if (!keyword || !toko_id) {
        return res.status(400).json({
          success: false,
          message: 'keyword dan toko_id diperlukan'
        });
      }

      const produk = await pembelianModel.searchProduk(
        keyword,
        parseInt(toko_id)
      );

      res.json({
        success: true,
        data: produk,
        count: produk.length
      });
    } catch (error) {
      console.error('Error searchProduk:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mencari produk'
      });
    }
  },

  // ============================================
  // 8. GET ALL TOKO
  // ============================================
  async getAllToko(req, res) {
    try {
      const toko = await pembelianModel.getAllToko();
      
      res.json({
        success: true,
        data: toko,
        count: toko.length
      });
    } catch (error) {
      console.error('Error getAllToko:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data toko'
      });
    }
  },

  // ============================================
  // 9. UPDATE STATUS PEMBELIAN
  // ============================================
  async updateStatusPembelian(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatus = ['DRAFT', 'PROSES', 'SELESAI', 'BATAL'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status harus salah satu dari: ${validStatus.join(', ')}`
        });
      }

      const result = await pembelianModel.updateStatusPembelian(
        parseInt(id),
        status
      );

      res.json({
        success: true,
        message: 'Status pembelian berhasil diupdate',
        data: result
      });
    } catch (error) {
      console.error('Error updateStatusPembelian:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal update status pembelian'
      });
    }
  },

  // ============================================
  // 10. DELETE PEMBELIAN
  // ============================================
  async deletePembelian(req, res) {
    try {
      const { id } = req.params;

      const result = await pembelianModel.deletePembelian(parseInt(id));

      res.json({
        success: true,
        message: 'Pembelian berhasil dihapus',
        data: result
      });
    } catch (error) {
      console.error('Error deletePembelian:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus pembelian'
      });
    }
  },

  // ============================================
  // 11. GET STATISTIK PEMBELIAN
  // ============================================
  async getStatistikPembelian(req, res) {
    try {
      const { toko_id } = req.params;
      const { periode } = req.query;

      if (!toko_id || isNaN(toko_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID toko harus berupa angka'
        });
      }

      const statistik = await pembelianModel.getStatistikPembelian(
        parseInt(toko_id),
        periode || 'month'
      );

      res.json({
        success: true,
        data: statistik,
        count: statistik.length
      });
    } catch (error) {
      console.error('Error getStatistikPembelian:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil statistik pembelian'
      });
    }
  },

  // ============================================
  // 12. HEALTH CHECK
  // ============================================
  async healthCheck(req, res) {
    try {
      // Test database connection
      const [result] = await pool.query('SELECT 1 as status');
      
      res.json({
        success: true,
        message: 'API berjalan dengan baik',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: error.message
      });
    }
  }
};

module.exports = pembeliancontroller;