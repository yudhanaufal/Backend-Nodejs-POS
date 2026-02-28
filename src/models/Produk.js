const db = require('../config/Connection');
const path = require('path');
const fs = require('fs');

class Produk {
  /**
   * CREATE - Tambah produk baru
   */
  static async create(data) {
    const { nama_produk, barcode, harga_beli, harga_jual, stok, gambar, toko_id } = data;
    
    // Check uniqueness
    const uniqueness = await this.isUnique({ nama_produk, barcode, toko_id });
    if (!uniqueness.unique) {
      throw new Error(uniqueness.message);
    }
    
    const [result] = await db.query(
      `INSERT INTO produk (nama_produk, barcode, harga_beli, harga_jual, stok, gambar, toko_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama_produk, barcode, harga_beli, harga_jual, stok || 0, gambar || null, toko_id]
    );
    
    return result.insertId;
  }

  /**
   * GET ALL - Get all produk dengan pagination
   */
  static async getAll(page = 1, limit = 500, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    
    if (filters.toko_id) {
      whereClause = 'WHERE p.toko_id = ?';
      params.push(filters.toko_id);
    }
    
    if (filters.search) {
      whereClause = whereClause 
        ? `${whereClause} AND p.nama_produk LIKE ?`
        : 'WHERE p.nama_produk LIKE ?';
      params.push(`%${filters.search}%`);
    }
    
    const [rows] = await db.query(
      `SELECT 
         p.*,
         t.nama_toko,
         t.alamat as toko_alamat
       FROM produk p
       LEFT JOIN toko t ON p.toko_id = t.id
       ${whereClause}
       ORDER BY p.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // Tambah URL gambar
    const productsWithUrl = rows.map(produk => ({
      ...produk,
      gambar_url: produk.gambar ? this.getImageUrl(produk.gambar) : null
    }));
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM produk p ${whereClause}`,
      params
    );
    
    return {
      data: productsWithUrl,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * GET BY ID - Get produk by ID
   */
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT 
         p.*,
         t.nama_toko,
         t.alamat as toko_alamat
       FROM produk p
       LEFT JOIN toko t ON p.toko_id = t.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const produk = rows[0];
    return {
      ...produk,
      gambar_url: produk.gambar ? this.getImageUrl(produk.gambar) : null
    };
  }

  /**
   * GET BY TOKO - Get produk by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 500) {
    const offset = (page - 1) * limit;
    
    const [rows] = await db.query(
      `SELECT * FROM produk 
       WHERE toko_id = ?
       ORDER BY nama_produk ASC
       LIMIT ? OFFSET ?`,
      [tokoId, limit, offset]
    );
    
    // Tambah URL gambar
    const productsWithUrl = rows.map(produk => ({
      ...produk,
      gambar_url: produk.gambar ? this.getImageUrl(produk.gambar) : null
    }));
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM produk WHERE toko_id = ?`,
      [tokoId]
    );
    
    return {
      data: productsWithUrl,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * UPDATE - Update produk
   */
  static async update(id, data) {
    const { nama_produk, barcode, harga_beli, harga_jual, stok, gambar, toko_id } = data;
    
    // Check uniqueness excluding current ID
    const uniqueness = await this.isUnique({ nama_produk, barcode, toko_id }, id);
    if (!uniqueness.unique) {
      throw new Error(uniqueness.message);
    }
    
    // Jika ada gambar baru dan ingin hapus gambar lama
    if (gambar !== undefined) {
      // Hapus gambar lama jika ada
      const oldProduk = await this.getById(id);
      if (oldProduk && oldProduk.gambar) {
        this.deleteImage(oldProduk.gambar);
      }
    }
    
    const [result] = await db.query(
      `UPDATE produk 
       SET nama_produk = ?, barcode = ?, harga_beli = ?, harga_jual = ?, 
           stok = ?, gambar = ?, toko_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nama_produk, barcode, harga_beli, harga_jual, stok, gambar || null, toko_id, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * UPDATE STOK - Update stok produk
   */
  static async updateStok(id, newStok) {
    const [result] = await db.query(
      `UPDATE produk SET stok = ? WHERE id = ?`,
      [newStok, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * ADJUST STOK - Tambah/kurangi stok
   */
  static async adjustStok(id, quantity) {
    const [result] = await db.query(
      `UPDATE produk SET stok = stok + ? WHERE id = ?`,
      [quantity, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * DELETE - Hapus produk
   */
  static async delete(id) {
    // Hapus gambar terlebih dahulu
    const produk = await this.getById(id);
    if (produk && produk.gambar) {
      this.deleteImage(produk.gambar);
    }
    
    const [result] = await db.query(
      'DELETE FROM produk WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * SEARCH - Cari produk
   */
  static async search(keyword, tokoId = null) {
    const searchTerm = `%${keyword}%`;
    let query = `SELECT * FROM produk WHERE nama_produk LIKE ?`;
    const params = [searchTerm];
    
    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }
    
    query += ' ORDER BY nama_produk ASC';
    
    const [rows] = await db.query(query, params);
    
    // Tambah URL gambar
    return rows.map(produk => ({
      ...produk,
      gambar_url: produk.gambar ? this.getImageUrl(produk.gambar) : null
    }));
  }

  /**
   * EXISTS - Cek apakah produk ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM produk WHERE id = ? LIMIT 1',
      [id]
    );
    
    return rows.length > 0;
  }

  /**
   * CHECK TOKO - Cek apakah produk milik toko tertentu
   */
  static async belongsToToko(produkId, tokoId) {
    const [rows] = await db.query(
      'SELECT 1 FROM produk WHERE id = ? AND toko_id = ? LIMIT 1',
      [produkId, tokoId]
    );
    
    return rows.length > 0;
  }

  /**
   * GET LOW STOCK - Produk dengan stok menipis
   */
  static async getLowStock(threshold = 10, tokoId = null) {
    let query = `SELECT * FROM produk WHERE stok <= ?`;
    const params = [threshold];
    
    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }
    
    query += ' ORDER BY stok ASC';
    
    const [rows] = await db.query(query, params);
    
    // Tambah URL gambar
    return rows.map(produk => ({
      ...produk,
      gambar_url: produk.gambar ? this.getImageUrl(produk.gambar) : null
    }));
  }

  static async findById(produk_id) {
    const [rows] = await db.query(
      `SELECT id, nama_produk, harga_beli, harga_jual, stok
       FROM produk
       WHERE id = ?`,
      [produk_id]
    );
    return rows[0];
  }

  static async getMutasiByProduk(produk_id) {
    const [rows] = await db.query(
      `SELECT 
        id,
        tipe,
        sumber,
        quantity,
        stok_sebelum,
        stok_sesudah,
        harga_beli,
        harga_jual,
        created_at
      FROM mutasi_stok
      WHERE produk_id = ?
      ORDER BY created_at ASC`,
      [produk_id]
    );
    return rows;
  }

  /**
   * GET IMAGE PATH - Helper untuk mendapatkan path fisik gambar
   */
  static getImagePath(filename) {
    if (!filename) return null;
    return path.join(__dirname, '../../uploads/produk', filename);
  }

  /**
   * GET IMAGE URL - Generate URL untuk akses gambar
   */
  static getImageUrl(filename) {
    if (!filename) return null;
    return `/uploads/produk/${filename}`;
  }

  /**
   * DELETE IMAGE - Helper untuk menghapus file gambar
   */
  static deleteImage(filename) {
    if (!filename) return;
    
    const imagePath = this.getImagePath(filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Deleted image: ${filename}`);
    }
  }

  /**
   * UPDATE ONLY GAMBAR - Update hanya gambar saja
   */
  static async updateGambar(id, filename) {
    // Hapus gambar lama jika ada
    const oldProduk = await this.getById(id);
    if (oldProduk && oldProduk.gambar) {
      this.deleteImage(oldProduk.gambar);
    }
    
    const [result] = await db.query(
      `UPDATE produk SET gambar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [filename, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * IS UNIQUE - Cek unique nama_produk dan barcode dalam toko_id yang sama
   */
  static async isUnique(data, excludeId = null) {
    const { nama_produk, barcode, toko_id } = data;
    
    // Cek nama_produk
    let nameQuery = 'SELECT id FROM produk WHERE nama_produk = ? AND toko_id = ?';
    const nameParams = [nama_produk, toko_id];
    
    if (excludeId) {
      nameQuery += ' AND id != ?';
      nameParams.push(excludeId);
    }
    
    const [nameRows] = await db.query(nameQuery, nameParams);
    if (nameRows.length > 0) {
      return { unique: false, message: 'Nama produk sudah ada di toko ini' };
    }
    
    // Cek barcode
    if (barcode) {
      let barcodeQuery = 'SELECT id FROM produk WHERE barcode = ? AND toko_id = ?';
      const barcodeParams = [barcode, toko_id];
      
      if (excludeId) {
        barcodeQuery += ' AND id != ?';
        barcodeParams.push(excludeId);
      }
      
      const [barcodeRows] = await db.query(barcodeQuery, barcodeParams);
      if (barcodeRows.length > 0) {
        return { unique: false, message: 'Barcode sudah digunakan di toko ini' };
      }
    }
    
    return { unique: true };
  }
}

module.exports = Produk;