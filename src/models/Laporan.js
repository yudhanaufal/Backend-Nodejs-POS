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
        COALESCE(
          (
            SELECT ms_start.stok_sebelum
            FROM mutasi_stok ms_start
            WHERE ms_start.toko_id = ?
              AND ms_start.produk_id = p.id
              AND DATE(ms_start.created_at) BETWEEN ? AND ?
            ORDER BY ms_start.created_at ASC, ms_start.id ASC
            LIMIT 1
          ), 0
        ) AS stok_awal,
        COALESCE(
          (
            SELECT ms_end.stok_sesudah
            FROM mutasi_stok ms_end
            WHERE ms_end.toko_id = ?
              AND ms_end.produk_id = p.id
              AND DATE(ms_end.created_at) BETWEEN ? AND ?
            ORDER BY ms_end.created_at DESC, ms_end.id DESC
            LIMIT 1
          ), 0
        ) AS stok_akhir,
        COALESCE(SUM(CASE 
          WHEN ms.sumber = 'pembelian' THEN ms.quantity
          WHEN ms.sumber = 'cancel_pembelian' THEN -ms.quantity
          ELSE 0
        END), 0) AS total_pembelian,
        COALESCE(SUM(CASE
          WHEN ms.sumber = 'penjualan' THEN ms.quantity
          WHEN ms.sumber = 'cancel_penjualan' THEN -ms.quantity
          ELSE 0
        END), 0) AS total_penjualan
      FROM produk p
      LEFT JOIN mutasi_stok ms ON p.id = ms.produk_id 
        AND ms.toko_id = ?
        AND ms.sumber IN ('pembelian','cancel_pembelian','penjualan','cancel_penjualan')
        AND DATE(ms.created_at) BETWEEN ? AND ?
      GROUP BY p.id, p.nama_produk
      ORDER BY total_penjualan DESC, p.nama_produk ASC
    `, [
      toko_id, startDate, endDate, // Untuk subquery stok_awal
      toko_id, startDate, endDate, // Untuk subquery stok_akhir
      toko_id, startDate, endDate  // Untuk LEFT JOIN mutasi_stok utama
    ]);

    return rows;
  },
  async getInOutproduk(toko_id, startdate, endDate) {
    const [rows] = await db.query(`
        SELECT
          DATE_FORMAT(ms.created_at, '%Y-%m-%d') AS tanggal,
          p.id AS produk_id,
          p.nama_produk,
          SUM(CASE 
            WHEN ms.sumber = 'pembelian' THEN ms.quantity
            WHEN ms.sumber = 'cancel_pembelian' THEN -ms.quantity
            ELSE 0
          END) AS kuantitas_pembelian,
          SUM(CASE
            WHEN ms.sumber = 'penjualan' THEN ms.quantity
            WHEN ms.sumber = 'cancel_penjualan' THEN -ms.quantity
            ELSE 0
          END) AS kuantitas_penjualan
        FROM mutasi_stok ms
        JOIN produk p ON p.id = ms.produk_id
        WHERE ms.toko_id = ?
          AND ms.sumber IN ('pembelian', 'cancel_pembelian', 'penjualan', 'cancel_penjualan')
          AND DATE(ms.created_at) BETWEEN ? AND ?
        GROUP BY p.id, p.nama_produk, DATE_FORMAT(ms.created_at, '%Y-%m-%d')
        ORDER BY p.nama_produk ASC, DATE_FORMAT(ms.created_at, '%Y-%m-%d') ASC
    `, [toko_id, startdate, endDate]);

    // 1. GENERATE LIST TANGGAL LENGKAP BERDASARKAN INPUT
    const listTanggal = [];
    let dCurrent = new Date(startdate);
    const dEnd = new Date(endDate);

    while (dCurrent <= dEnd) {
      listTanggal.push(dCurrent.toISOString().split('T')[0]);
      dCurrent.setDate(dCurrent.getDate() + 1);
    }

    // 2. KELOMPOKKAN DATA DARI DATABASE SEPERTI SEBELUMNYA
    const groupedData = rows.reduce((acc, current) => {
      let produk = acc.find(item => item.produk_id === current.produk_id);
      if (!produk) {
        produk = {
          produk_id: current.produk_id,
          nama_produk: current.nama_produk,
          riwayat: []
        };
        acc.push(produk);
      }
      produk.riwayat.push({
        tanggal: current.tanggal,
        kuantitas_pembelian: Number(current.kuantitas_pembelian),
        kuantitas_penjualan: Number(current.kuantitas_penjualan)
      });
      return acc;
    }, []);

    // 3. SELIPKAN TANGGAL KOSONG DENGAN NILAI 0
    const finalData = groupedData.map(produk => {
      const riwayatLengkap = listTanggal.map(tgl => {
        // Cari apakah di tanggal ini database punya datanya
        const dataAda = produk.riwayat.find(r => r.tanggal === tgl);

        // Jika ada, pakai data asli. Jika tidak ada, buat objek baru bernilai 0
        return dataAda || {
          tanggal: tgl,
          kuantitas_pembelian: 0,
          kuantitas_penjualan: 0
        };
      });

      return {
        ...produk,
        riwayat: riwayatLengkap
      };
    });

    return finalData;
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
      WHERE DATE(t.tanggal) BETWEEN ? AND ?
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
      WHERE DATE(p.tanggal) BETWEEN ? AND ?
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
      WHERE DATE(tanggal) BETWEEN ? AND ?
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
      WHERE DATE(t.tanggal) BETWEEN ? AND ?
        AND t.toko_id = ?
        AND t.status = 'Lunas'
      GROUP BY pelanggan
      ORDER BY total_transaksi DESC
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
      WHERE DATE(t.tanggal) BETWEEN ? AND ?
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
      WHERE DATE(s.tanggal) BETWEEN ? AND ?
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
      WHERE DATE(o.tanggal) BETWEEN ? AND ?
        AND o.toko_id = ?
      ORDER BY o.tanggal DESC, o.id DESC
    `;

    const [rows] = await db.query(query, [start, end, toko_id]);
    return rows;
  },

  async getlaporantoko(start_date, end_date) {
    const query = `
      SELECT
        tk.nama_toko,
        tk.id AS toko_id,
        SUM(t.total) AS total_omset,
        SUM(t.total_laba) AS total_laba,
        SUM(t.total_diskon) AS total_diskon,
        COUNT(t.id) AS total_transaksi
      FROM toko tk
      LEFT JOIN transaksi t ON t.toko_id = tk.id
        AND DATE(t.tanggal) BETWEEN ? AND ?
        AND t.status = 'Lunas'
      GROUP BY tk.id, tk.nama_toko
      ORDER BY tk.nama_toko ASC
    `;
    const [rows] = await db.query(query, [start_date, end_date]);
    return rows;
  },
  async getdetaillaporantoko(start_date, end_date, tokoid) {
    const query = `
      SELECT
        DATE(t.tanggal) AS tanggal,
        tk.nama_toko,
        SUM(t.total) AS total_omset,
        SUM(t.total_laba) AS total_laba,
        SUM(t.total_diskon) AS total_diskon,
        COUNT(t.id) AS total_transaksi
      FROM transaksi t
      JOIN toko tk ON t.toko_id = tk.id
      WHERE DATE(t.tanggal) BETWEEN ? AND ?
        AND t.toko_id = ?
        AND t.status = 'Lunas'
      GROUP BY DATE(t.tanggal), tk.id, tk.nama_toko
      ORDER BY DATE(t.tanggal) ASC
    `;
    const [rows] = await db.query(query, [start_date, end_date, tokoid]);
    return rows;
  },
};

module.exports = Laporan;
