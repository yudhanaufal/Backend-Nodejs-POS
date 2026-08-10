const db = require('../config/Connection');

// Karena 'return' adalah keyword di JavaScript, kita gunakan ReturnModel
class ReturnModel {

  static async create(data) {
    const { tanggal, users_id, toko_id, keterangan, status, details } = data;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Hitung total otomatis dan ambil nama_produk dari tabel produk
      let total = 0;
      const validatedDetails = [];

      if (details && details.length > 0) {
        for (const detail of details) {
          // Ambil data produk (nama_produk dan harga_beli)
          const [produkRows] = await connection.query(
            'SELECT nama_produk, harga_beli FROM produk WHERE id = ?',
            [detail.produk_id]
          );

          if (produkRows.length === 0) {
            await connection.rollback();
            connection.release();
            throw new Error(`Produk dengan ID ${detail.produk_id} tidak ditemukan`);
          }

          const produk = produkRows[0];
          const quantity = detail.quantity || 1;
          const harga_beli = parseFloat(produk.harga_beli);
          const subtotal = harga_beli * quantity;

          total += subtotal;

          validatedDetails.push({
            produk_id: detail.produk_id,
            nama_produk: produk.nama_produk, // Ambil dari tabel produk
            quantity: quantity,
            harga_beli: harga_beli,
            alasan_return: detail.alasan_return || null
          });
        }
      } else {
        await connection.rollback();
        connection.release();
        throw new Error('Detail return harus diisi');
      }

      // 2. Insert ke tabel return (header) dengan total yang sudah dihitung
      const [returnResult] = await connection.query(
        `INSERT INTO \`return\` (tanggal, total, users_id, toko_id, keterangan, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
        [tanggal, total, users_id, toko_id, keterangan || null, status || 'pending']
      );

      const returnId = returnResult.insertId;

      // 3. Insert detail return
      if (validatedDetails.length > 0) {
        for (const detail of validatedDetails) {
          await connection.query(
            `INSERT INTO detail_return 
           (return_id, produk_id, nama_produk, quantity, harga_beli, alasan_return) 
           VALUES (?, ?, ?, ?, ?, ?)`,
            [
              returnId,
              detail.produk_id,
              detail.nama_produk,
              detail.quantity,
              detail.harga_beli,
              detail.alasan_return
            ]
          );
        }
      }

      await connection.commit();
      connection.release();

      return returnId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * READ - Get all return dengan pagination
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];

    // Filter by toko_id
    if (filters.toko_id) {
      whereClause = 'WHERE r.toko_id = ?';
      params.push(filters.toko_id);
    }

    // Filter by status
    if (filters.status) {
      whereClause = whereClause
        ? `${whereClause} AND r.status = ?`
        : 'WHERE r.status = ?';
      params.push(filters.status);
    }

    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause = whereClause
        ? `${whereClause} AND r.tanggal BETWEEN ? AND ?`
        : 'WHERE r.tanggal BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }

    // Filter by users_id
    if (filters.users_id) {
      whereClause = whereClause
        ? `${whereClause} AND r.users_id = ?`
        : 'WHERE r.users_id = ?';
      params.push(filters.users_id);
    }

    const [rows] = await db.query(
      `SELECT 
         r.*,
         t.nama_toko,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM \`return\` r
       LEFT JOIN toko t ON r.toko_id = t.id
       LEFT JOIN users u ON r.users_id = u.id
       ${whereClause}
       ORDER BY r.tanggal DESC, r.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Ambil detail untuk setiap return
    for (let returnItem of rows) {
      const [details] = await db.query(
        `SELECT dr.*, p.harga_jual as harga_jual_saat_ini
         FROM detail_return dr
         LEFT JOIN produk p ON dr.produk_id = p.id
         WHERE dr.return_id = ? 
         ORDER BY dr.id ASC`,
        [returnItem.id]
      );
      returnItem.details = details;
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM \`return\` r ${whereClause}`,
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
   * READ - Get return by ID
   */
  static async getById(id) {
    // Ambil data header
    const [returnRows] = await db.query(
      `SELECT 
         r.*,
         t.nama_toko,
         t.alamat as toko_alamat,
         u.username as users_username,
         u.nama_lengkap as users_nama,
         u.role as users_role
       FROM \`return\` r
       LEFT JOIN toko t ON r.toko_id = t.id
       LEFT JOIN users u ON r.users_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (returnRows.length === 0) return null;

    const returnItem = returnRows[0];

    // Ambil detail
    const [details] = await db.query(
      `SELECT dr.*, p.harga_jual as harga_jual_saat_ini, p.stok as stok_saat_ini
       FROM detail_return dr
       LEFT JOIN produk p ON dr.produk_id = p.id
       WHERE dr.return_id = ? 
       ORDER BY dr.id ASC`,
      [id]
    );

    returnItem.details = details;

    return returnItem;
  }

  /**
   * READ - Get return by toko_id
   */
  static async getByTokoId(tokoId, page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.toko_id = ?';
    const params = [tokoId];

    // Filter by status
    if (filters.status) {
      whereClause += ' AND r.status = ?';
      params.push(filters.status);
    }

    // Filter by tanggal range
    if (filters.start_date && filters.end_date) {
      whereClause += ' AND r.tanggal BETWEEN ? AND ?';
      params.push(
        `${filters.start_date} 00:00:00`,
        `${filters.end_date} 23:59:59`
      );
    }

    const [rows] = await db.query(
      `SELECT 
       r.*,
       u.username AS users_username,
       u.nama_lengkap AS users_nama
     FROM \`return\` r
     LEFT JOIN users u ON r.users_id = u.id
     ${whereClause}
     ORDER BY r.tanggal DESC, r.id DESC
     LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Ambil detail untuk setiap return
    for (let returnItem of rows) {
      const [details] = await db.query(
        `SELECT dr.*
       FROM detail_return dr
       WHERE dr.return_id = ?
       ORDER BY dr.id ASC`,
        [returnItem.id]
      );

      returnItem.details = details;
    }

    // Total data
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
     FROM \`return\` r
     ${whereClause}`,
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
   * UPDATE STATUS - Update status return
   */
  /**
   * UPDATE STATUS - Update status return dengan handle stok
   */
  static async updateStatus(id, status, adminId = null) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Get current return data
      const [returnRows] = await connection.query(
        'SELECT * FROM `return` WHERE id = ? FOR UPDATE',
        [id]
      );

      if (returnRows.length === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }

      const currentReturn = returnRows[0];
      const oldStatus = currentReturn.status;

      // 2. Prepare update query
      let query = `UPDATE \`return\` SET status = ?, updated_at = CURRENT_TIMESTAMP`;
      const params = [status];

      if (adminId && (status === 'approved' || status === 'completed')) {
        query += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
        params.push(adminId);
      } else if (status === 'pending') {
        query += ', approved_by = NULL, approved_at = NULL';
      }

      query += ' WHERE id = ?';
      params.push(id);

      // 3. Update status
      const [result] = await connection.query(query, params);

      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }

      // 4. Handle stok berdasarkan perubahan status
      if (status === 'approved' && oldStatus !== 'approved') {
        // Jika status berubah menjadi approved, TAMBAH stok produk
        const [details] = await connection.query(
          'SELECT * FROM detail_return WHERE return_id = ?',
          [id]
        );

        for (const detail of details) {
          // Get current stock and price before update
          const [productRows] = await connection.query(
            'SELECT stok, toko_id, harga_beli, harga_jual FROM produk WHERE id = ?',
            [detail.produk_id]
          );

          if (productRows.length > 0) {
            const product = productRows[0];
            const stokSebelum = product.stok;
            const stokSesudah = stokSebelum - detail.quantity;

            // Update stock
            await connection.query(
              `UPDATE produk SET stok = ? WHERE id = ?`,
              [stokSesudah, detail.produk_id]
            );

            // Insert into mutasi_stok dengan harga
            await connection.query(
              `INSERT INTO mutasi_stok (
              produk_id, 
              toko_id, 
              quantity, 
              harga_beli,
              harga_jual,
              stok_sebelum, 
              stok_sesudah, 
              tipe, 
              sumber, 
              ref_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                detail.produk_id,
                product.toko_id,
                detail.quantity,
                product.harga_beli,    // harga_beli dari produk
                product.harga_jual,    // harga_jual dari produk
                stokSebelum,
                stokSesudah,
                'KELUAR', // tipe: in (stok masuk)
                'return', // sumber: return
                currentReturn.no_return || id,
              ]
            );
          }
        }

      } else if (status === 'rejected' && oldStatus === 'approved') {
        // Jika status berubah dari approved ke rejected, KURANGI stok yang sudah ditambah
        const [details] = await connection.query(
          'SELECT * FROM detail_return WHERE return_id = ?',
          [id]
        );

        for (const detail of details) {
          // Get current stock and price before update
          const [productRows] = await connection.query(
            'SELECT stok, toko_id, harga_beli, harga_jual FROM produk WHERE id = ?',
            [detail.produk_id]
          );

          if (productRows.length > 0) {
            const product = productRows[0];
            const stokSebelum = product.stok;
            const stokSesudah = stokSebelum - detail.quantity;

            // Update stock
            await connection.query(
              `UPDATE produk SET stok = ? WHERE id = ?`,
              [stokSesudah, detail.produk_id]
            );

            // Insert into mutasi_stok dengan harga
            await connection.query(
              `INSERT INTO mutasi_stok (
              produk_id, 
              toko_id, 
              quantity, 
              harga_beli,
              harga_jual,
              stok_sebelum, 
              stok_sesudah, 
              tipe, 
              sumber, 
              ref_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                detail.produk_id,
                product.toko_id,
                detail.quantity,
                product.harga_beli,    // harga_beli dari produk
                product.harga_jual,    // harga_jual dari produk
                stokSebelum,
                stokSesudah,
                'MASUK', // tipe: out (stok keluar)
                'return_reversal', // sumber: pembatalan return
                currentReturn.no_return || id,
              ]
            );
          }
        }

      } else if (status === 'pending' && oldStatus === 'approved') {
        // Jika status berubah dari approved ke pending, KURANGI stok yang sudah ditambah
        const [details] = await connection.query(
          'SELECT * FROM detail_return WHERE return_id = ?',
          [id]
        );

        for (const detail of details) {
          // Get current stock and price before update
          const [productRows] = await connection.query(
            'SELECT stok, toko_id, harga_beli, harga_jual FROM produk WHERE id = ?',
            [detail.produk_id]
          );

          if (productRows.length > 0) {
            const product = productRows[0];
            const stokSebelum = product.stok;
            const stokSesudah = stokSebelum - detail.quantity;

            // Update stock
            await connection.query(
              `UPDATE produk SET stok = ? WHERE id = ?`,
              [stokSesudah, detail.produk_id]
            );

            // Insert into mutasi_stok dengan harga
            await connection.query(
              `INSERT INTO mutasi_stok (
              produk_id, 
              toko_id, 
              quantity, 
              harga_beli,
              harga_jual,
              stok_sebelum, 
              stok_sesudah, 
              tipe, 
              sumber, 
              ref_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                detail.produk_id,
                product.toko_id,
                detail.quantity,
                product.harga_beli,    // harga_beli dari produk
                product.harga_jual,    // harga_jual dari produk
                stokSebelum,
                stokSesudah,
                'MASUK', // tipe: out (stok keluar)
                'return_reversal', // sumber: pembatalan return
                currentReturn.no_return || id,
              ]
            );
          }
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
 * UPDATE - Update return (hanya untuk pending status)
 */
  static async update(id, data) {
    const { tanggal, total, keterangan, details } = data;

    // Cek status, hanya bisa update jika pending
    const currentReturn = await this.getById(id);
    if (!currentReturn || currentReturn.status !== 'pending') {
      return false;
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Update header
      const [updateResult] = await connection.query(
        `UPDATE \`return\` 
       SET tanggal = ?, total = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [tanggal, total, keterangan || null, id]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }

      // 2. Hapus detail lama
      await connection.query(
        'DELETE FROM detail_return WHERE return_id = ?',
        [id]
      );

      // 3. Insert detail baru (TIDAK update stok, tunggu approved)
      if (details && details.length > 0) {
        for (const detail of details) {
          await connection.query(
            `INSERT INTO detail_return 
           (return_id, produk_id, nama_produk, quantity, harga_beli, alasan_return) 
           VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              detail.produk_id,
              detail.nama_produk,
              detail.quantity || 1,
              detail.harga_beli,
              detail.alasan_return || null
            ]
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
   * DELETE - Hapus return (hanya untuk pending status)
   */
  static async delete(id) {
    // Cek status, hanya bisa delete jika pending
    const currentReturn = await this.getById(id);
    if (!currentReturn || currentReturn.status !== 'pending') {
      return false;
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Hapus detail (tidak perlu adjust stok karena belum approved)
      await connection.query(
        'DELETE FROM detail_return WHERE return_id = ?',
        [id]
      );

      // Hapus header
      const [result] = await connection.query(
        'DELETE FROM `return` WHERE id = ?',
        [id]
      );

      await connection.commit();
      connection.release();

      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * EXISTS - Cek apakah return ada
   */
  static async exists(id) {
    const [rows] = await db.query(
      'SELECT 1 FROM `return` WHERE id = ? LIMIT 1',
      [id]
    );

    return rows.length > 0;
  }

  /**
   * GET SUMMARY - Ringkasan return per periode
   */
  static async getSummary(tokoId, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         DATE(tanggal) as tanggal,
         COUNT(*) as jumlah_return,
         SUM(total) as total_nilai_return
       FROM \`return\` 
       WHERE toko_id = ? AND tanggal BETWEEN ? AND ?
       GROUP BY DATE(tanggal)
       ORDER BY tanggal DESC`,
      [tokoId, startDate, endDate]
    );

    return rows;
  }

  /**
   * GET BY STATUS - Get return by status
   */
  static async getByStatus(tokoId, status, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT 
         r.*,
         u.username as users_username,
         u.nama_lengkap as users_nama
       FROM \`return\` r
       LEFT JOIN users u ON r.users_id = u.id
       WHERE r.toko_id = ? AND r.status = ?
       ORDER BY r.tanggal DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [tokoId, status, limit, offset]
    );

    // Ambil detail untuk setiap return
    for (let returnItem of rows) {
      const [details] = await db.query(
        `SELECT dr.* 
         FROM detail_return dr
         WHERE dr.return_id = ? 
         ORDER BY dr.id ASC`,
        [returnItem.id]
      );
      returnItem.details = details;
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM \`return\` WHERE toko_id = ? AND status = ?`,
      [tokoId, status]
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
   * GET BY PRODUK - Get return history by produk
   */
  static async getByProduk(produkId, tokoId = null, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE dr.produk_id = ?';
    const params = [produkId];

    if (tokoId) {
      whereClause += ' AND r.toko_id = ?';
      params.push(tokoId);
    }

    const [rows] = await db.query(
      `SELECT 
         r.*,
         dr.quantity,
         dr.harga_beli,
         dr.subtotal,
         dr.alasan_return,
         u.username as users_username
       FROM detail_return dr
       INNER JOIN \`return\` r ON dr.return_id = r.id
       LEFT JOIN users u ON r.users_id = u.id
       ${whereClause}
       ORDER BY r.tanggal DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total 
       FROM detail_return dr
       INNER JOIN \`return\` r ON dr.return_id = r.id
       ${whereClause}`,
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
}

module.exports = ReturnModel;