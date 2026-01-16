const db = require('../config/connection');

class Setoran {
  /**
   * CREATE - Tambah setoran baru
   */
  static async create(data) {
    const { cash, transfer, tanggal, total, toko_id, users_id, keterangan } = data;
    
    const [result] = await db.query(
      `INSERT INTO setoran (cash, transfer, tanggal, total, toko_id, users_id, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cash || 0, transfer || 0, tanggal, total, toko_id, users_id, keterangan || null]
    );
    
    return result.insertId;
  }

  /**
   * READ - Get all setoran dengan pagination
   * Bisa filter by toko_id, users_id, tanggal
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    
    // Filter by toko_id jika ada
    if (filters.toko_id) {
      whereClause = 'WHERE s.toko_id = ?';
      params.push(filters.toko_id);
    }
    
    // Filter by users_id jika ada
    if (filters.users_id) {
      whereClause = whereClause 
        ? `${whereClause} AND s.users_id = ?`
        : 'WHERE s.users_id = ?';
      params.push(filters.users_id);
    }
    
    // Filter by tanggal (range)
    if (filters.start_date && filters.end_date) {
      whereClause = whereClause 
        ? `${whereClause} AND s.tanggal BETWEEN ? AND ?`
        : 'WHERE s.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    } else if (filters.tanggal) {
      // Filter by tanggal spesifik
      whereClause = whereClause 
        ? `${whereClause} AND s.tanggal = ?`
        : 'WHERE s.tanggal = ?';
      params.push(filters.tanggal);
    }
    
    const [rows] = await db.query(
      `SELECT 
         s.*,
         t.nama_toko,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM setoran s
       LEFT JOIN toko t ON s.toko_id = t.id
       LEFT JOIN users u ON s.users_id = u.id
       ${whereClause}
       ORDER BY s.tanggal DESC, s.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [[{ total: totalRows }]] = await db.query(
      `SELECT COUNT(*) as total FROM setoran s ${whereClause}`,
      params
    );
    
    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalRows),
        totalPages: Math.ceil(totalRows / limit)
      }
    };
  }

  /**
   * READ - Get setoran by ID
   */
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT 
         s.*,
         t.nama_toko,
         t.alamat as toko_alamat,
         u.username as users_username,
         u.nama_lengkap as users_nama,
         u.role as users_role
       FROM setoran s
       LEFT JOIN toko t ON s.toko_id = t.id
       LEFT JOIN users u ON s.users_id = u.id
       WHERE s.id = ?`,
      [id]
    );
    
    return rows[0] || null;
  }

  /**
   * READ - Get setoran by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE s.toko_id = ?';
    const params = [tokoId];
    
    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause += ' AND s.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    // Filter by users_id
    if (filters.users_id) {
      whereClause += ' AND s.users_id = ?';
      params.push(filters.users_id);
    }
    
    const [rows] = await db.query(
      `SELECT 
         s.*,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM setoran s
       LEFT JOIN users u ON s.users_id = u.id
       ${whereClause}
       ORDER BY s.tanggal DESC, s.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM setoran s ${whereClause}`,
      params
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
   * READ - Get setoran by users_id
   */
  static async getByUserId(userId, page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE s.users_id = ?';
    const params = [userId];
    
    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause += ' AND s.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    // Filter by toko_id
    if (filters.toko_id) {
      whereClause += ' AND s.toko_id = ?';
      params.push(filters.toko_id);
    }
    
    const [rows] = await db.query(
      `SELECT 
         s.*,
         t.nama_toko
       FROM setoran s
       LEFT JOIN toko t ON s.toko_id = t.id
       ${whereClause}
       ORDER BY s.tanggal DESC, s.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM setoran s ${whereClause}`,
      params
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
   * READ - Get setoran by tanggal
   */
  static async getByTanggal(tanggal, tokoId = null) {
    let query = 'SELECT * FROM setoran WHERE tanggal = ?';
    const params = [tanggal];
    
    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }
    
    query += ' ORDER BY id DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * UPDATE - Update setoran
   */
  static async update(id, data) {
    const { cash, transfer, tanggal, total, toko_id, users_id, keterangan } = data;
    
    const [result] = await db.query(
      `UPDATE setoran 
       SET cash = ?, transfer = ?, tanggal = ?, total = ?, 
           toko_id = ?, users_id = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cash || 0, transfer || 0, tanggal, total, toko_id, users_id, keterangan || null, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * DELETE - Hapus setoran
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM setoran WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * EXISTS - Cek apakah setoran ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM setoran WHERE id = ? LIMIT 1',
      [id]
    );
    
    return rows.length > 0;
  }

  /**
   * GET SUMMARY - Ringkasan setoran per periode
   */
  static async getSummary(tokoId, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         DATE(tanggal) as tanggal,
         COUNT(*) as jumlah_setoran,
         SUM(cash) as total_cash,
         SUM(transfer) as total_transfer,
         SUM(total) as total_setoran
       FROM setoran 
       WHERE toko_id = ? AND tanggal BETWEEN ? AND ?
       GROUP BY DATE(tanggal)
       ORDER BY tanggal DESC`,
      [tokoId, startDate, endDate]
    );
    
    return rows;
  }

  /**
   * GET DAILY SUMMARY - Ringkasan harian
   */
  static async getDailySummary(tokoId, tanggal) {
    const [[row]] = await db.query(
      `SELECT 
         COUNT(*) as jumlah_setoran,
         SUM(cash) as total_cash,
         SUM(transfer) as total_transfer,
         SUM(total) as total_setoran
       FROM setoran 
       WHERE toko_id = ? AND tanggal = ?`,
      [tokoId, tanggal]
    );
    
    return row || {
      jumlah_setoran: 0,
      total_cash: 0,
      total_transfer: 0,
      total_setoran: 0
    };
  }

  /**
   * GET MONTHLY SUMMARY - Ringkasan bulanan
   */
  static async getMonthlySummary(tokoId, year, month) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    const [[row]] = await db.query(
      `SELECT 
         COUNT(*) as jumlah_setoran,
         SUM(cash) as total_cash,
         SUM(transfer) as total_transfer,
         SUM(total) as total_setoran
       FROM setoran 
       WHERE toko_id = ? AND tanggal BETWEEN ? AND ?`,
      [tokoId, startDate, endDate]
    );
    
    return row || {
      jumlah_setoran: 0,
      total_cash: 0,
      total_transfer: 0,
      total_setoran: 0
    };
  }

  /**
   * GET BY USER DATE - Cek apakah user sudah setor di tanggal tertentu
   */
  static async getByUserDate(users_id, tanggal) {
    const [rows] = await db.query(
      'SELECT * FROM setoran WHERE users_id = ? AND tanggal = ?',
      [users_id, tanggal]
    );
    
    return rows;
  }

  /**
   * GET TOP USERS - User dengan setoran terbanyak
   */
  static async getTopUsers(tokoId, limit = 5, startDate = null, endDate = null) {
    let whereClause = 'WHERE s.toko_id = ?';
    const params = [tokoId];
    
    if (startDate && endDate) {
      whereClause += ' AND s.tanggal BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    const [rows] = await db.query(
      `SELECT 
         u.id as user_id,
         u.nama_lengkap,
         u.username,
         COUNT(s.id) as jumlah_setoran,
         SUM(s.total) as total_setoran
       FROM users u
       LEFT JOIN setoran s ON u.id = s.users_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY total_setoran DESC
       LIMIT ?`,
      [...params, limit]
    );
    
    return rows;
  }
}

module.exports = Setoran;