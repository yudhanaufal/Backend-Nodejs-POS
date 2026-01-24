const db = require('../config/Connection');

class Toko {
  static async create(data) {
    const { nama_toko, alamat, pemilik, telepon, email } = data;
    
    const [result] = await db.query(
      `INSERT INTO toko (nama_toko, alamat, pemilik, telepon, email) 
       VALUES (?, ?, ?, ?, ?)`,
      [nama_toko, alamat, pemilik || null, telepon || null, email || null]
    );
    
    return result.insertId;
  }
  
  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Get data with pagination
    const [rows] = await db.query(
      `SELECT * FROM toko 
       ORDER BY id DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    // Get total count
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM toko'
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
  
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM toko WHERE id = ?',
      [id]
    );
    
    return rows[0] || null;
  }
  
  static async update(id, data) {
    const { nama_toko, alamat, pemilik, telepon, email } = data;
    
    const [result] = await db.query(
      `UPDATE toko 
       SET nama_toko = ?, alamat = ?, pemilik = ?, telepon = ?, email = ?
       WHERE id = ?`,
      [nama_toko, alamat, pemilik, telepon, email, id]
    );
    
    return result.affectedRows > 0;
  }
  
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM toko WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
  
  static async search(keyword) {
    const searchTerm = `%${keyword}%`;
    
    const [rows] = await db.query(
      `SELECT * FROM toko 
       WHERE nama_toko LIKE ? 
          OR alamat LIKE ? 
          OR pemilik LIKE ? 
          OR telepon LIKE ? 
          OR email LIKE ?
       ORDER BY nama_toko ASC`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    return rows;
  }
  
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM toko WHERE id = ? LIMIT 1',
      [id]
    );
    
    return rows.length > 0;
  }
}

module.exports = Toko;