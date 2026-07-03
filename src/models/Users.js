const db = require('../config/Connection')
const bcrypt = require('bcryptjs');

class User {
  /**
   * CREATE - Tambah user baru
   */
  static async create(data) {
    const {
      username,
      password,
      nama_lengkap,
      email,
      telepon,
      role,
      toko_id
    } = data;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users 
       (username, password, nama_lengkap, email, telepon, role, toko_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, nama_lengkap, email || null, telepon || null, role || 'kasir', toko_id || null]
    );

    return result.insertId;
  }

  /**
   * READ - Get all users dengan join ke toko
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];

    // Filter by toko_id jika ada
    if (filters.toko_id) {
      whereClause = 'WHERE u.toko_id = ?';
      params.push(filters.toko_id);
    }

    const [rows] = await db.query(
      `SELECT 
         u.id, 
         u.username, 
         u.nama_lengkap, 
         u.email, 
         u.telepon, 
         u.role,
         u.is_active,
         u.created_at,
         u.toko_id,
         t.nama_toko
       FROM users u
       LEFT JOIN toko t ON u.toko_id = t.id
       ${whereClause}
       ORDER BY u.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Jangan expose password
    const sanitizedRows = rows.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    return {
      data: sanitizedRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * READ - Get user by ID dengan data toko
   */
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT 
         u.id, 
         u.username, 
         u.nama_lengkap, 
         u.email, 
         u.telepon, 
         u.role,
         u.is_active,
         u.created_at,
         u.updated_at,
         u.toko_id,
         t.nama_toko,
         t.alamat as toko_alamat
       FROM users u
       LEFT JOIN toko t ON u.toko_id = t.id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    // Remove password from result
    const { password, ...userWithoutPassword } = rows[0];
    return userWithoutPassword;
  }

  /**
   * READ - Get user by username (untuk login)
   */
  static async getByUsername(username) {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    return rows[0] || null;
  }

  /**
   * READ - Get users by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT 
         u.id, 
         u.username, 
         u.nama_lengkap, 
         u.email, 
         u.telepon, 
         u.role,
         u.is_active
       FROM users u
       WHERE u.toko_id = ?
       ORDER BY u.nama_lengkap ASC
       LIMIT ? OFFSET ?`,
      [tokoId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE toko_id = ?`,
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
   * UPDATE - Update user data
   */
  static async update(id, data) {
    const {
      nama_lengkap,
      email,
      telepon,
      role,
      toko_id,
      is_active
    } = data;

    const [result] = await db.query(
      `UPDATE users 
       SET nama_lengkap = ?, email = ?, telepon = ?, role = ?, 
           toko_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nama_lengkap, email || null, telepon || null, role, toko_id || null, is_active, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * UPDATE - Update password
   */
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * DELETE - Hapus user
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * VERIFY PASSWORD - Untuk login
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * EXISTS - Cek apakah user ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM users WHERE id = ? LIMIT 1',
      [id]
    );

    return rows.length > 0;
  }

  /**
   * CHECK USERNAME - Cek apakah username sudah dipakai
   */
  static async usernameExists(username, excludeId = null) {
    let query = 'SELECT 1 FROM users WHERE username = ?';
    const params = [username];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';

    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

  /**
   * CHECK EMAIL - Cek apakah email sudah dipakai
   */
  static async emailExists(email, excludeId = null) {
    let query = 'SELECT 1 FROM users WHERE email = ?';
    const params = [email];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';

    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }
}

module.exports = User;