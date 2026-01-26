const db = require('../config/Connection');

class Operasional {
  /**
   * CREATE - Tambah operasional baru dengan detail
   */
  static async create(data) {
    const { tanggal, total, toko_id, users_id, keterangan, details } = data;
    
    // Mulai transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Insert ke tabel operasional (header)
      const [operasionalResult] = await connection.query(
        `INSERT INTO operasional (tanggal, total, toko_id, users_id, keterangan) 
         VALUES (?, ?, ?, ?, ?)`,
        [tanggal, total, toko_id, users_id, keterangan || null]
      );
      
      const operasionalId = operasionalResult.insertId;
      
      // 2. Insert detail operasional
      if (details && details.length > 0) {
        for (const detail of details) {
          await connection.query(
            `INSERT INTO detail_operasional 
             (operasional_id, jenis_pengeluaran, quantity, harga) 
             VALUES (?, ?, ?, ?)`,
            [operasionalId, detail.jenis_pengeluaran, detail.quantity || 1, detail.harga]
          );
        }
      }
      
      await connection.commit();
      connection.release();
      
      return operasionalId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * READ - Get all operasional dengan pagination
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    
    // Filter by toko_id
    if (filters.toko_id) {
      whereClause = 'WHERE o.toko_id = ?';
      params.push(filters.toko_id);
    }
    
    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause = whereClause 
        ? `${whereClause} AND o.tanggal BETWEEN ? AND ?`
        : 'WHERE o.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    // Filter by users_id
    if (filters.users_id) {
      whereClause = whereClause 
        ? `${whereClause} AND o.users_id = ?`
        : 'WHERE o.users_id = ?';
      params.push(filters.users_id);
    }
    
    const [rows] = await db.query(
      `SELECT 
         o.*,
         t.nama_toko,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM operasional o
       LEFT JOIN toko t ON o.toko_id = t.id
       LEFT JOIN users u ON o.users_id = u.id
       ${whereClause}
       ORDER BY o.tanggal DESC, o.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // Ambil detail untuk setiap operasional
    for (let operasional of rows) {
      const [details] = await db.query(
        `SELECT * FROM detail_operasional 
         WHERE operasional_id = ? 
         ORDER BY id ASC`,
        [operasional.id]
      );
      operasional.details = details;
    }
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM operasional o ${whereClause}`,
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
   * READ - Get operasional by ID
   */
  static async getById(id) {
    // Ambil data header
    const [operasionalRows] = await db.query(
      `SELECT 
         o.*,
         t.nama_toko,
         t.alamat as toko_alamat,
         u.username as users_username,
         u.nama_lengkap as users_nama,
         u.role as users_role
       FROM operasional o
       LEFT JOIN toko t ON o.toko_id = t.id
       LEFT JOIN users u ON o.users_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (operasionalRows.length === 0) return null;
    
    const operasional = operasionalRows[0];
    
    // Ambil detail
    const [details] = await db.query(
      `SELECT * FROM detail_operasional 
       WHERE operasional_id = ? 
       ORDER BY id ASC`,
      [id]
    );
    
    operasional.details = details;
    
    return operasional;
  }

  /**
   * READ - Get operasional by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE o.toko_id = ?';
    const params = [tokoId];
    
    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause += ' AND o.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    // Filter by users_id
    if (filters.users_id) {
      whereClause += ' AND o.users_id = ?';
      params.push(filters.users_id);
    }
    
    const [rows] = await db.query(
      `SELECT 
         o.*,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM operasional o
       LEFT JOIN users u ON o.users_id = u.id
       ${whereClause}
       ORDER BY o.tanggal DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // Ambil detail untuk setiap operasional
    for (let operasional of rows) {
      const [details] = await db.query(
        `SELECT * FROM detail_operasional 
         WHERE operasional_id = ? 
         ORDER BY id ASC`,
        [operasional.id]
      );
      operasional.details = details;
    }
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM operasional o ${whereClause}`,
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
   * READ - Get operasional by tanggal
   */
  static async getByTanggal(tanggal, tokoId = null) {
    let query = `SELECT * FROM operasional WHERE tanggal = ?`;
    const params = [tanggal];
    
    if (tokoId) {
      query += ' AND toko_id = ?';
      params.push(tokoId);
    }
    
    query += ' ORDER BY id DESC';
    
    const [rows] = await db.query(query, params);
    
    // Ambil detail untuk setiap operasional
    for (let operasional of rows) {
      const [details] = await db.query(
        `SELECT * FROM detail_operasional 
         WHERE operasional_id = ? 
         ORDER BY id ASC`,
        [operasional.id]
      );
      operasional.details = details;
    }
    
    return rows;
  }

  /**
   * UPDATE - Update operasional dan detail
   */
  static async update(id, data) {
    const { tanggal, total, toko_id, users_id, keterangan, details } = data;
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Update header
      const [updateResult] = await connection.query(
        `UPDATE operasional 
         SET tanggal = ?, total = ?, toko_id = ?, users_id = ?, 
             keterangan = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [tanggal, total, toko_id, users_id, keterangan || null, id]
      );
      
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }
      
      // 2. Hapus detail lama
      await connection.query(
        'DELETE FROM detail_operasional WHERE operasional_id = ?',
        [id]
      );
      
      // 3. Insert detail baru
      if (details && details.length > 0) {
        for (const detail of details) {
          await connection.query(
            `INSERT INTO detail_operasional 
             (operasional_id, jenis_pengeluaran, quantity, harga) 
             VALUES (?, ?, ?, ?)`,
            [id, detail.jenis_pengeluaran, detail.quantity || 1, detail.harga]
          );
        }
      }
      
      await connection.commit();
      connection.release();
      
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * DELETE - Hapus operasional beserta detail
   */
  static async delete(id) {
    // Karena ada foreign key dengan ON DELETE CASCADE,
    // detail akan terhapus otomatis saat operasional dihapus
    const [result] = await db.query(
      'DELETE FROM operasional WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * EXISTS - Cek apakah operasional ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM operasional WHERE id = ? LIMIT 1',
      [id]
    );
    
    return rows.length > 0;
  }

  /**
   * GET SUMMARY - Ringkasan operasional per periode
   */
  static async getSummary(tokoId, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         DATE(tanggal) as tanggal,
         COUNT(*) as jumlah_operasional,
         SUM(total) as total_pengeluaran
       FROM operasional 
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
         COUNT(*) as jumlah_operasional,
         SUM(total) as total_pengeluaran
       FROM operasional 
       WHERE toko_id = ? AND tanggal = ?`,
      [tokoId, tanggal]
    );
    
    return row || {
      jumlah_operasional: 0,
      total_pengeluaran: 0
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
         COUNT(*) as jumlah_operasional,
         SUM(total) as total_pengeluaran
       FROM operasional 
       WHERE toko_id = ? AND tanggal BETWEEN ? AND ?`,
      [tokoId, startDate, endDate]
    );
    
    return row || {
      jumlah_operasional: 0,
      total_pengeluaran: 0
    };
  }

  /**
   * GET BY JENIS PENGELUARAN - Statistik pengeluaran per jenis
   */
  static async getByJenisPengeluaran(tokoId, startDate = null, endDate = null) {
    let whereClause = 'WHERE o.toko_id = ?';
    const params = [tokoId];
    
    if (startDate && endDate) {
      whereClause += ' AND o.tanggal BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    const [rows] = await db.query(
      `SELECT 
         d.jenis_pengeluaran,
         SUM(d.quantity) as total_quantity,
         SUM(d.subtotal) as total_subtotal,
         COUNT(d.id) as jumlah_transaksi
       FROM detail_operasional d
       INNER JOIN operasional o ON d.operasional_id = o.id
       ${whereClause}
       GROUP BY d.jenis_pengeluaran
       ORDER BY total_subtotal DESC`,
      params
    );
    
    return rows;
  }
}

module.exports = Operasional;