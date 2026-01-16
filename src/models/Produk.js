const db = require ('../config/connection')


class Produk {
  /**
   * CREATE - Tambah produk baru
   */
  static async create(data) {
    const { nama_produk, harga_beli, harga_jual, stok, toko_id } = data;
    
    const [result] = await db.query(
      `INSERT INTO produk (nama_produk, harga_beli, harga_jual, stok, toko_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [nama_produk, harga_beli, harga_jual, stok || 0, toko_id]
    );
    
    return result.insertId;
  }

  /**
   * READ - Get all produk dengan pagination
   * Bisa filter by toko_id
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    
    // Filter by toko_id jika ada
    if (filters.toko_id) {
      whereClause = 'WHERE p.toko_id = ?';
      params.push(filters.toko_id);
    }
    
    // Filter by nama_produk jika ada (search)
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
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM produk p ${whereClause}`,
      params
    );
    
    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * READ - Get produk by ID
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
    
    return rows[0] || null;
  }

  /**
   * READ - Get produk by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const [rows] = await db.query(
      `SELECT * FROM produk 
       WHERE toko_id = ?
       ORDER BY nama_produk ASC
       LIMIT ? OFFSET ?`,
      [tokoId, limit, offset]
    );
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM produk WHERE toko_id = ?`,
      [tokoId]
    );
    
    return {
      data: rows,
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
    const { nama_produk, harga_beli, harga_jual, stok, toko_id } = data;
    
    const [result] = await db.query(
      `UPDATE produk 
       SET nama_produk = ?, harga_beli = ?, harga_jual = ?, 
           stok = ?, toko_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nama_produk, harga_beli, harga_jual, stok, toko_id, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * UPDATE - Update stok produk
   */
  static async updateStok(id, newStok) {
    const [result] = await db.query(
      `UPDATE produk SET stok = ? WHERE id = ?`,
      [newStok, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * UPDATE - Tambah/Reduce stok
   */
  static async adjustStok(id, quantity) {
    // quantity bisa positif (tambah) atau negatif (kurangi)
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
    return rows;
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
    return rows;
  }

  /**
   * COUNT BY TOKO - Hitung jumlah produk per toko
   */
  static async countByToko(tokoId) {
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM produk WHERE toko_id = ?',
      [tokoId]
    );
    
    return parseInt(total);
  }
}

module.exports = Produk;