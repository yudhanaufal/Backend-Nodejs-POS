const db = require('../config/Connection');

const Laporan = {

  async getNilaiStokByToko(toko_id) {
    const [rows] = await db.query(`
      SELECT
        p.id AS produk_id,
        p.nama_produk,
        ms.stok_sesudah AS stok_akhir,
        ms.harga_beli,
        (ms.stok_sesudah * ms.harga_beli) AS nilai_stok
      FROM mutasi_stok ms
      JOIN (
        SELECT produk_id, toko_id, MAX(created_at) AS last_date
        FROM mutasi_stok
        WHERE toko_id = ?
        GROUP BY produk_id, toko_id
      ) last_mutasi
        ON ms.produk_id = last_mutasi.produk_id
       AND ms.toko_id = last_mutasi.toko_id
       AND ms.created_at = last_mutasi.last_date
      JOIN produk p ON p.id = ms.produk_id
      ORDER BY p.nama_produk ASC
    `, [toko_id]);

    return rows;
  },

 async getNilaiStokByTanggal(toko_id, tanggal) {
    const [rows] = await db.query(`
      SELECT
        p.id AS produk_id,
        p.nama_produk,
        ms.stok_sesudah AS stok_akhir,
        ms.harga_beli,
        (ms.stok_sesudah * ms.harga_beli) AS nilai_stok
      FROM mutasi_stok ms
      JOIN (
        SELECT 
          produk_id, 
          toko_id, 
          MAX(created_at) AS last_date
        FROM mutasi_stok
        WHERE toko_id = ?
          AND DATE(created_at) <= ?
        GROUP BY produk_id, toko_id
      ) last_mutasi
        ON ms.produk_id = last_mutasi.produk_id
       AND ms.toko_id = last_mutasi.toko_id
       AND ms.created_at = last_mutasi.last_date
      JOIN produk p ON p.id = ms.produk_id
      ORDER BY p.nama_produk ASC
    `, [toko_id, tanggal]);

    return rows;
  },
   async getProdukTerlaris(toko_id, startDate, endDate) {
    const [rows] = await db.query(`
      SELECT
        p.id AS produk_id,
        p.nama_produk,
        SUM(ms.quantity) AS total_terjual
      FROM mutasi_stok ms
      JOIN produk p ON p.id = ms.produk_id
      WHERE ms.toko_id = ?
        AND ms.tipe = 'KELUAR'
        AND ms.sumber = 'penjualan'
        AND DATE(ms.created_at) BETWEEN ? AND ?
      GROUP BY p.id, p.nama_produk
      ORDER BY total_terjual DESC
    `, [toko_id, startDate, endDate]);

    return rows;
  },
    async getLaporanTransaksi(startDate, endDate, toko_id) {
    const query = `
      SELECT 
        t.id,
        t.invoice,
        t.total,
        t.kembali,
        t.metode,
        t.kasir,
        t.status,
        t.total_laba,
        t.total_diskon,
        t.tanggal,
        m.nama_member
      FROM transaksi t
      LEFT JOIN member m ON t.member_id = m.id
      WHERE t.tanggal BETWEEN ? AND ?
      AND t.toko_id = ?
      ORDER BY t.tanggal DESC
    `;

    const [rows] = await db.query(query, [
      startDate,
      endDate,
      toko_id
    ]);

    return rows;
  },

  // =============================
  // DETAIL TRANSAKSI
  // =============================
  async getDetailByTransaksi(transaksi_id) {
    const query = `
      SELECT 
        nama_produk,
        harga_jual,
        harga_beli,
        laba,
        diskon,
        quantity,
        subtotal,
        subtotal_diskon
      FROM detail_transaksi
      WHERE transaksi_id = ?
    `;

    const [rows] = await db.query(query, [transaksi_id]);
    return rows;
  },

  async getLaporanPembelian(startDate, endDate, toko_id) {
    const query = `
      SELECT
        p.id AS pembelian_id,
        p.invoice,
        p.total AS total_pembelian,
        p.tanggal
      FROM pembelian p
      WHERE p.tanggal BETWEEN ? AND ?
        AND p.toko_id = ?
      ORDER BY p.tanggal DESC
    `;

    const [rows] = await db.query(query, [startDate, endDate, toko_id]);
    return rows;
  },

  // =============================
  // REKAP TOTAL
  // =============================
 async getRekap(startDate, endDate, toko_id) {
    const query = `
      SELECT
        SUM(total) AS total_omset,
        SUM(total_laba) AS total_laba,
        SUM(total_diskon) AS total_diskon,
        COUNT(id) AS total_transaksi
      FROM transaksi
      WHERE tanggal BETWEEN ? AND ?
      AND toko_id = ?
      AND status = 'Lunas'
    `;

    const [rows] = await db.query(query, [
      startDate,
      endDate,
      toko_id
    ]);

    return rows[0];
  },
async getPelanggan(start, end, toko_id) {
    const query = `
      SELECT 
        COALESCE(m.nama_member, 'Non-Member') AS pelanggan,
        COUNT(DISTINCT t.id) AS total_transaksi,
        SUM(t.total) AS total_omset,
        SUM(t.total_laba) AS total_laba
      FROM transaksi t
      LEFT JOIN member m ON t.member_id = m.id
      WHERE t.tanggal BETWEEN ? AND ?
        AND t.toko_id = ?
        AND t.status = 'Lunas'
      GROUP BY pelanggan
      ORDER BY total_omset DESC
    `;

    const [rows] = await db.query(query, [start, end, toko_id]);
    return rows;
  },

  // =============================
  // DETAIL PRODUK PER PELANGGAN
  // =============================
  async getProdukByPelanggan(nama_pelanggan, start, end, toko_id) {

    const query = `
      SELECT
        dt.nama_produk,
        SUM(dt.quantity) AS total_quantity
      FROM transaksi t
      JOIN detail_transaksi dt ON t.id = dt.transaksi_id
      LEFT JOIN member m ON t.member_id = m.id
      WHERE t.tanggal BETWEEN ? AND ?
        AND t.toko_id = ?
        AND t.status = 'Lunas'
        AND COALESCE(m.nama_member, 'Non-Member') = ?
      GROUP BY dt.nama_produk
      ORDER BY total_quantity DESC
    `;

    const [rows] = await db.query(query, [
      start,
      end,
      toko_id,
      nama_pelanggan
    ]);

    return rows;
  },

  // =============================
  // LAPORAN SETORAN
  // =============================
  async getSetoran(start, end, toko_id) {
    const query = `
      SELECT 
        s.id,
        s.cash,
        s.transfer,
        s.tanggal,
        s.total,
        s.keterangan,
        u.nama_lengkap AS nama_kasir
      FROM setoran s
      LEFT JOIN users u ON s.users_id = u.id
      WHERE s.tanggal BETWEEN ? AND ?
        AND s.toko_id = ?
      ORDER BY s.tanggal DESC
    `;

    const [rows] = await db.query(query, [start, end, toko_id]);
    return rows;
  },

  // =============================
  // LAPORAN OPERASIONAL
  // =============================
  async getOperasional(start, end, toko_id) {
    const query = `
      SELECT 
        o.id,
        o.tanggal,
        o.total AS total_operasional,
        o.keterangan AS keterangan_header,
        do.jenis_pengeluaran,
        do.quantity,
        do.harga,
        (do.quantity * do.harga) AS subtotal,
        u.nama_lengkap AS nama_kasir
      FROM operasional o
      JOIN detail_operasional do ON o.id = do.operasional_id
      LEFT JOIN users u ON o.users_id = u.id
      WHERE o.tanggal BETWEEN ? AND ?
        AND o.toko_id = ?
      ORDER BY o.tanggal DESC, o.id DESC
    `;

    const [rows] = await db.query(query, [start, end, toko_id]);
    return rows;
  }
};

module.exports = Laporan;
