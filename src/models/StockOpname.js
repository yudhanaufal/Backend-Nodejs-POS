const db = require('../config/Connection');

class StokOpname {
  // =========================
  // CREATE HEADER DENGAN DETAIL PRODUK
  // =========================
  static async createWithDetails(conn, data) {
    const { tanggal, jenis, toko_id, users_id, produk_list } = data;

    // 1. Insert header stok opname
    const [headerResult] = await conn.query(
      `INSERT INTO stok_opname 
      (tanggal, jenis, totalselisih, total_harga, status, toko_id, users_id, created_at, updated_at)
      VALUES (?, ?, 0, 0, 'draft', ?, ?, NOW(), NOW())`,
      [tanggal, jenis, toko_id, users_id]
    );

    const stokOpnameId = headerResult.insertId;

    // 2. Insert detail untuk setiap produk (stok_asli masih NULL)
    for (const produk_id of produk_list) {
      // Ambil stok saat ini dan harga beli dari produk
      const [[produk]] = await conn.query(
        `SELECT stok, harga_beli FROM produk WHERE id = ?`,
        [produk_id]
      );

      if (produk) {
        await conn.query(
          `INSERT INTO detail_stok_opname 
          (stok_opname_id, produk_id, selisih, stok_asli, stok_data, harga_beli, subtotal, created_at)
          VALUES (?, ?, 0, NULL, ?, ?, 0, NOW())`,
          [stokOpnameId, produk_id, produk.stok, produk.harga_beli]
        );
      }
    }

    return stokOpnameId;
  }

  // =========================
  // GET BY ID
  // =========================
  static async getById(id) {
    try {
      // 1. Ambil data header
      const [headerRows] = await db.query(`
        SELECT 
          so.*,
          t.nama_toko,
          t.alamat AS toko_alamat,
          u.username,
          u.nama_lengkap AS user_nama
        FROM stok_opname so
        LEFT JOIN toko t ON t.id = so.toko_id
        LEFT JOIN users u ON u.id = so.users_id
        WHERE so.id = ?
      `, [id]);

      if (!headerRows || headerRows.length === 0) return null;
      
      const header = headerRows[0];

      // 2. Ambil data detail
      const [details] = await db.query(`
        SELECT
          d.*,
          p.nama_produk,
          p.kode_produk,
          p.stok AS stok_sekarang
        FROM detail_stok_opname d
        LEFT JOIN produk p ON p.id = d.produk_id
        WHERE d.stok_opname_id = ?
        ORDER BY d.id
      `, [id]);

      header.details = details;
      return header;
    } catch (error) {
      console.error('Error in getById:', error);
      throw error;
    }
  }

  // =========================
  // UPDATE STOK ASLI PADA DETAIL
  // =========================
  static async updateStokAsli(conn, data) {
    const { id, stok_asli } = data;
    
    // 1. Ambil data detail yang akan diupdate
    const [detailRows] = await conn.query(`
      SELECT 
        d.*,
        so.toko_id,
        so.users_id
      FROM detail_stok_opname d
      JOIN stok_opname so ON so.id = d.stok_opname_id
      WHERE d.id = ?
    `, [id]);

    if (!detailRows || detailRows.length === 0) {
      throw new Error('Detail stok opname tidak ditemukan');
    }
    
    const detail = detailRows[0];

    // 2. Hitung selisih (stok_asli - stok_data)
    const selisih = stok_asli - detail.stok_data;
    
    // 3. Hitung subtotal (selisih * harga_beli)
    const subtotal = selisih * detail.harga_beli;

    // 4. Update detail stok opname
    await conn.query(`
      UPDATE detail_stok_opname 
      SET 
        stok_asli = ?,
        selisih = ?,
        subtotal = ?,
        created_at = NOW()
      WHERE id = ?
    `, [stok_asli, selisih, subtotal, id]);

    // 5. Jika ada selisih (stok berubah), buat mutasi stok
    if (selisih !== 0) {
      const tipe = selisih > 0 ? 'MASUK' : 'KELUAR';
      
      // Ambil harga_jual dari produk
      const [[produk]] = await conn.query(
        `SELECT harga_jual FROM produk WHERE id = ?`,
        [detail.produk_id]
      );

      // 6. Buat mutasi stok
      await conn.query(`
        INSERT INTO mutasi_stok 
        (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'stock_opname', ?, ?, ?, NOW())
      `, [
        detail.produk_id,
        detail.toko_id,
        Math.abs(selisih),
        detail.stok_data,
        stok_asli,
        tipe,
        detail.stok_opname_id,
        detail.harga_beli,
        produk.harga_jual || 0
      ]);

      // 7. Update stok produk di tabel produk
      await conn.query(
        `UPDATE produk SET stok = ? WHERE id = ?`,
        [stok_asli, detail.produk_id]
      );
    }

    // 8. Update total di header stok opname
    await this.updateHeaderTotals(conn, detail.stok_opname_id);

    return {
      id: detail.id,
      produk_id: detail.produk_id,
      stok_data: detail.stok_data,
      stok_asli,
      selisih,
      subtotal,
      harga_beli: detail.harga_beli
    };
  }

  // =========================
  // UPDATE TOTAL HEADER STOK OPNAME
  // =========================
  static async updateHeaderTotals(conn, stok_opname_id) {
    // 1. Hitung total selisih dan total harga dari semua detail
    const [totalRows] = await conn.query(`
      SELECT 
        COALESCE(SUM(selisih), 0) AS totalselisih,
        COALESCE(SUM(subtotal), 0) AS total_harga
      FROM detail_stok_opname 
      WHERE stok_opname_id = ?
    `, [stok_opname_id]);

    const totals = totalRows[0];

    // 2. Cek apakah semua detail sudah diisi stok_asli
    const [statusRows] = await conn.query(`
      SELECT 
        COUNT(*) AS total_detail,
        SUM(CASE WHEN stok_asli IS NULL THEN 1 ELSE 0 END) AS belum_diisi
      FROM detail_stok_opname 
      WHERE stok_opname_id = ?
    `, [stok_opname_id]);

    const statusCheck = statusRows[0];
    
    // Tentukan status
    let status = 'draft';
    if (statusCheck.total_detail > 0 && statusCheck.belum_diisi === 0) {
      status = 'completed';
    } else if (statusCheck.total_detail > 0 && statusCheck.belum_diisi < statusCheck.total_detail) {
      status = 'partial';
    }

    // 3. Update header
    await conn.query(`
      UPDATE stok_opname 
      SET 
        totalselisih = ?,
        total_harga = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [totals.totalselisih, totals.total_harga, status, stok_opname_id]);

    return {
      totalselisih: totals.totalselisih,
      total_harga: totals.total_harga,
      status
    };
  }

  // =========================
  // ADD PRODUCT TO EXISTING STOK OPNAME
  // =========================
  static async addProduct(conn, data) {
    const { stok_opname_id, produk_id } = data;
    
    // 1. Cek apakah produk sudah ada di stok opname ini
    const [existingRows] = await conn.query(`
      SELECT id FROM detail_stok_opname 
      WHERE stok_opname_id = ? AND produk_id = ?
    `, [stok_opname_id, produk_id]);

    if (existingRows && existingRows.length > 0) {
      throw new Error('Produk sudah ada dalam stok opname ini');
    }

    // 2. Ambil data produk
    const [[produk]] = await conn.query(
      `SELECT stok, harga_beli FROM produk WHERE id = ?`,
      [produk_id]
    );

    if (!produk) {
      throw new Error('Produk tidak ditemukan');
    }

    // 3. Tambahkan produk ke detail
    await conn.query(`
      INSERT INTO detail_stok_opname 
      (stok_opname_id, produk_id, selisih, stok_asli, stok_data, harga_beli, subtotal, created_at)
      VALUES (?, ?, 0, NULL, ?, ?, 0, NOW())
    `, [stok_opname_id, produk_id, produk.stok, produk.harga_beli]);

    // 4. Update status header ke draft (karena ada detail baru)
    await conn.query(
      `UPDATE stok_opname SET status = 'draft', updated_at = NOW() WHERE id = ?`,
      [stok_opname_id]
    );

    return {
      stok_opname_id,
      produk_id,
      stok_data: produk.stok,
      harga_beli: produk.harga_beli
    };
  }

  // =========================
  // REMOVE PRODUCT FROM STOK OPNAME
  // =========================
  static async removeProduct(conn, detail_id) {
    // 1. Ambil data detail
    const [detailRows] = await conn.query(`
      SELECT 
        d.*,
        d.stok_opname_id
      FROM detail_stok_opname d
      WHERE d.id = ?
    `, [detail_id]);

    if (!detailRows || detailRows.length === 0) {
      throw new Error('Detail stok opname tidak ditemukan');
    }

    const detail = detailRows[0];

    // 2. Cek jika stok_asli sudah diisi (tidak bisa hapus)
    if (detail.stok_asli !== null) {
      throw new Error('Tidak dapat menghapus produk yang sudah diisi stok asli');
    }

    // 3. Hapus detail
    await conn.query(
      `DELETE FROM detail_stok_opname WHERE id = ?`,
      [detail_id]
    );

    // 4. Update totals di header
    await this.updateHeaderTotals(conn, detail.stok_opname_id);

    return detail;
  }

  // =========================
  // BATCH UPDATE STOK ASLI
  // =========================
  static async batchUpdateStokAsli(conn, stok_opname_id, updates) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateStokAsli(conn, {
          id: update.detail_id,
          stok_asli: update.stok_asli
        });
        results.push({
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          success: false,
          detail_id: update.detail_id,
          error: error.message
        });
      }
    }

    // Update header totals
    await this.updateHeaderTotals(conn, stok_opname_id);

    return results;
  }

  // =========================
  // GET ALL STOK OPNAME (PAGINATION)
  // =========================
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // Filter by toko_id jika ada
    if (filters.toko_id) {
      whereClauses.push('so.toko_id = ?');
      params.push(filters.toko_id);
    }

    // Filter by status jika ada
    if (filters.status) {
      whereClauses.push('so.status = ?');
      params.push(filters.status);
    }

    // Filter by tanggal jika ada
    if (filters.tanggal_dari) {
      whereClauses.push('so.tanggal >= ?');
      params.push(filters.tanggal_dari);
    }

    if (filters.tanggal_sampai) {
      whereClauses.push('so.tanggal <= ?');
      params.push(filters.tanggal_sampai);
    }

    const whereSQL = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';

    // Query data
    const [rows] = await db.query(`
      SELECT 
        so.*,
        t.nama_toko,
        u.nama_lengkap AS user_nama
      FROM stok_opname so
      LEFT JOIN toko t ON t.id = so.toko_id
      LEFT JOIN users u ON u.id = so.users_id
      ${whereSQL}
      ORDER BY so.created_at DESC, so.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Query total
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM stok_opname so ${whereSQL}`,
      params
    );

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        total_page: Math.ceil(total / limit)
      }
    };
  }

  // =========================
  // GET BY TOKO ID
  // =========================
  static async getByToko(toko_id, page = 1, limit = 10) {
    return await this.getAll(page, limit, { toko_id });
  }

  // =========================
  // DELETE STOK OPNAME
  // =========================
  static async delete(conn, stok_opname_id) {
    // 1. Cek apakah ada detail yang sudah diisi stok_asli
    const [detailRows] = await conn.query(`
      SELECT COUNT(*) as count FROM detail_stok_opname 
      WHERE stok_opname_id = ? AND stok_asli IS NOT NULL
    `, [stok_opname_id]);

    if (detailRows[0].count > 0) {
      throw new Error('Tidak dapat menghapus stok opname yang sudah memiliki stok asli');
    }

    // 2. Hapus detail terlebih dahulu
    await conn.query(
      `DELETE FROM detail_stok_opname WHERE stok_opname_id = ?`,
      [stok_opname_id]
    );

    // 3. Hapus header
    const [result] = await conn.query(
      `DELETE FROM stok_opname WHERE id = ?`,
      [stok_opname_id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = StokOpname;