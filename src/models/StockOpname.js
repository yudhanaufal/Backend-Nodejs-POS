const db = require('../config/connection');

class StokOpname {

static async createHeader(conn, data) {
  const { tanggal, jenis, totalselisih, total_harga, toko_id, users_id } = data;

  const [result] = await conn.query(
    `INSERT INTO stok_opname
    (tanggal, jenis, totalselisih, total_harga, status, toko_id, users_id)
    VALUES (?, ?, ?, ?, 'approved', ?, ?)`,
    [tanggal, jenis, totalselisih, total_harga, toko_id, users_id]
  );

  return result.insertId;
}
    // =========================
  // GET BY ID
  // =========================
  static async getById(id) {

    const [[header]] = await db.query(`
      SELECT 
        so.id,
        so.tanggal,
        so.total_harga,
        so.totalselisih,
        so.jenis,
        so.status,
        so.users_id,
        so.toko_id,
        so.created_at,
        so.updated_at,

        t.nama_toko,
        t.alamat AS toko_alamat,

        u.username AS users_username,
        u.nama_lengkap AS users_nama,
        u.role AS users_role
      FROM stok_opname so
      JOIN toko t ON t.id = so.toko_id
      JOIN users u ON u.id = so.users_id
      WHERE so.id = ?
    `, [id]);

    if (!header) return null;

    const [details] = await db.query(`
      SELECT
        d.id,
        d.stok_opname_id,
        d.produk_id,
        p.nama_produk,
        d.stok_data,
        d.stok_asli,
        d.selisih,
        d.harga_beli,
        (d.selisih * d.harga_beli) AS subtotal,
        p.stok AS stok_saat_ini,
        d.created_at
      FROM detail_stok_opname d
      JOIN produk p ON p.id = d.produk_id
      WHERE d.stok_opname_id = ?
    `, [id]);

    header.details = details;
    return header;
  }

  // =========================
  // GET ALL (PAGINATION)
  // =========================
  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT 
        so.id,
        so.tanggal,
        so.total_harga,
        so.totalselisih,
        so.jenis,
        so.status,
        so.users_id,
        so.toko_id,
        so.created_at,

        t.nama_toko,
        u.nama_lengkap AS users_nama
      FROM stok_opname so
      JOIN toko t ON t.id = so.toko_id
      JOIN users u ON u.id = so.users_id
      ORDER BY so.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM stok_opname`
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        total_page: Math.ceil(total / limit)
      }
    };
  }

  // =========================
  // GET BY TOKO
  // =========================
  static async getByToko(toko_id, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT 
        so.id,
        so.tanggal,
        so.total_harga,
        so.totalselisih,
        so.jenis,
        so.status,
        so.users_id,
        so.toko_id,
        so.created_at,

        t.nama_toko,
        u.nama_lengkap AS users_nama
      FROM stok_opname so
      JOIN toko t ON t.id = so.toko_id
      JOIN users u ON u.id = so.users_id
      WHERE so.toko_id = ?
      ORDER BY so.id DESC
      LIMIT ? OFFSET ?
    `, [toko_id, limit, offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM stok_opname WHERE toko_id = ?`,
      [toko_id]
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        total_page: Math.ceil(total / limit)
      }
    };
  }



  static async createDetail(conn, data) {
    const { stok_opname_id, produk_id, selisih, stok_asli, stok_data, harga_beli } = data;

    await conn.query(
      `INSERT INTO detail_stok_opname
      (stok_opname_id, produk_id, selisih, stok_asli, stok_data, harga_beli)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [stok_opname_id, produk_id, selisih, stok_asli, stok_data, harga_beli]
    );
  }

  static async createMutasi(conn, data) {
    const {
      produk_id,
      toko_id,
      quantity,
      stok_sebelum,
      stok_sesudah,
      tipe,
      sumber,
      ref_id,
      harga_beli,
      harga_jual
    } = data;

    await conn.query(
      `INSERT INTO mutasi_stok
      (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        produk_id,
        toko_id,
        quantity,
        stok_sebelum,
        stok_sesudah,
        tipe,
        sumber,
        ref_id,
        harga_beli,
        harga_jual
      ]
    );
  }

  static async getProduk(conn, produk_id) {
    const [[row]] = await conn.query(
      `SELECT stok, harga_beli, harga_jual FROM produk WHERE id = ?`,
      [produk_id]
    );
    return row;
  }

  static async updateStokProduk(conn, produk_id, stok) {
    await conn.query(
      `UPDATE produk SET stok = ? WHERE id = ?`,
      [stok, produk_id]
    );
  }
}

module.exports = StokOpname;
