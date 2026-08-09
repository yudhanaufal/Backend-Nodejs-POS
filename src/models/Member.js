const db = require('../config/Connection');

class Member {
  /**
   * CREATE - Tambah member baru
   */
  static async create(data) {
    const { nama_member, no_tlp, alamat, toko_id } = data;

    const [result] = await db.query(
      `INSERT INTO member (nama_member, no_tlp, alamat, toko_id) 
       VALUES (?, ?, ?, ?)`,
      [nama_member, no_tlp, alamat || null, toko_id]
    );

    return result.insertId;
  }

  /**
   * READ - Get all member dengan pagination
   * Bisa filter by toko_id
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];

    // Filter by toko_id jika ada
    if (filters.toko_id) {
      whereClause = 'WHERE m.toko_id = ?';
      params.push(filters.toko_id);
    }

    // Filter by nama_member atau no_tlp jika ada (search)
    if (filters.search) {
      whereClause = whereClause
        ? `${whereClause} AND (m.nama_member LIKE ? OR m.no_tlp LIKE ?)`
        : 'WHERE (m.nama_member LIKE ? OR m.no_tlp LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const [rows] = await db.query(
      `SELECT 
         m.*,
         t.nama_toko,
         t.alamat as toko_alamat
       FROM member m
       LEFT JOIN toko t ON m.toko_id = t.id
       ${whereClause}
       ORDER BY m.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM member m ${whereClause}`,
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
   * READ - Get member by ID
   */
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT 
         m.*,
         t.nama_toko,
         t.alamat as toko_alamat
       FROM member m
       LEFT JOIN toko t ON m.toko_id = t.id
       WHERE m.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * READ - Get member by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT * FROM member 
       WHERE toko_id = ? AND deleted_at IS NULL
       ORDER BY nama_member ASC
       LIMIT ? OFFSET ?`,
      [tokoId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM member WHERE toko_id = ?`,
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
   * READ - Get member by nomor telepon
   */
  static async getByTelepon(no_tlp, tokoId = null) {
    let query = 'SELECT * FROM member WHERE no_tlp = ?';
    const params = [no_tlp];

    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }

    const [rows] = await db.query(query, params);
    return rows[0] || null;
  }

  /**
   * UPDATE - Update member data
   */
  static async update(id, data) {
    const { nama_member, no_tlp, alamat, sales_id, toko_id } = data;

    const [result] = await db.query(
      `UPDATE member 
       SET nama_member = ?, no_tlp = ?, alamat = ?, sales_id = ?, 
           toko_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nama_member, no_tlp, alamat || null, sales_id || null, toko_id, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * DELETE - Hapus member
   */
  static async delete(id) {
    const [result] = await db.query(
      'UPDATE member SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * SEARCH - Cari member
   */
  static async search(keyword, tokoId = null) {
    const searchTerm = `%${keyword}%`;
    let query = `SELECT * FROM member 
                 WHERE (nama_member LIKE ? OR no_tlp LIKE ? OR alamat LIKE ?)`;
    const params = [searchTerm, searchTerm, searchTerm];

    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }

    query += ' ORDER BY nama_member ASC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * EXISTS - Cek apakah member ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM member WHERE id = ? LIMIT 1',
      [id]
    );

    return rows.length > 0;
  }

  /**
   * CHECK TELEPON - Cek apakah nomor telepon sudah terdaftar
   */
  static async teleponExists(no_tlp, excludeId = null) {
    let query = 'SELECT 1 FROM member WHERE no_tlp = ?';
    const params = [no_tlp];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';

    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

  /**
   * COUNT BY TOKO - Hitung jumlah member per toko
   */
  static async countByToko(tokoId) {
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM member WHERE toko_id = ?',
      [tokoId]
    );

    return parseInt(total);
  }

  /**
   * GET MEMBER STATS - Statistik member per toko
   */
  static async getStatsByToko(tokoId) {
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM member WHERE toko_id = ?',
      [tokoId]
    );

    // Hitung member baru bulan ini
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const [[{ new_this_month }]] = await db.query(
      `SELECT COUNT(*) as new_this_month 
       FROM member 
       WHERE toko_id = ? AND created_at >= ?`,
      [tokoId, firstDay]
    );

    return {
      total: parseInt(total),
      new_this_month: parseInt(new_this_month)
    };
  }
}

module.exports = Member;