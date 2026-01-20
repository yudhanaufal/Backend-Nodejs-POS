const db = require('../config/connection');
const StokOpname = require('../models/StockOpname');

exports.createStokOpname = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { tanggal, jenis, toko_id, users_id, details } = req.body;

    if (!details || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Detail stok opname wajib diisi'
      });
    }
    let totalselisih = 0;
    let totalHarga = 0;

    for (const item of details) {
        const produk = await StokOpname.getProduk(conn, item.produk_id);

        const stok_data = produk.stok;
        const stok_asli = item.stok_asli;
        const selisih = stok_asli - stok_data;

        totalselisih += selisih;
        totalHarga += selisih * produk.harga_beli;

        item._calculated = {
            stok_data,
            selisih,
            harga_beli: produk.harga_beli,
            harga_jual: produk.harga_jual
        };
    }


    const stokOpnameId = await StokOpname.createHeader(conn, {
    tanggal,
    jenis,
    totalselisih,
    total_harga: totalHarga,
    toko_id,
    users_id
    });


    for (const item of details) {
      const { stok_data, selisih, harga_beli, harga_jual } = item._calculated;

      await StokOpname.createDetail(conn, {
        stok_opname_id: stokOpnameId,
        produk_id: item.produk_id,
        selisih,
        stok_asli: item.stok_asli,
        stok_data,
        harga_beli
      });

      const tipe = selisih < 0 ? 'KELUAR' : 'MASUK';

      await StokOpname.createMutasi(conn, {
        produk_id: item.produk_id,
        toko_id,
        quantity: Math.abs(selisih),
        stok_sebelum: stok_data,
        stok_sesudah: item.stok_asli,
        tipe,
        sumber: 'stock_opname',
        ref_id: stokOpnameId,
        harga_beli,
        harga_jual
      });

      await StokOpname.updateStokProduk(
        conn,
        item.produk_id,
        item.stok_asli
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Stok opname & mutasi stok berhasil disimpan',
      stok_opname_id: stokOpnameId
    });

  } catch (error) {
    await conn.rollback();
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menyimpan stok opname'
    });
  } finally {
    conn.release();
  }
};

// =========================
// GET ALL
// =========================
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await StokOpname.getAll(page, limit);

    res.json({
      success: true,
      message: 'Data stok opname berhasil diambil',
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok opname'
    });
  }
};

// =========================
// GET BY ID
// =========================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await StokOpname.getById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Stok opname tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Stok opname berhasil ditemukan',
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok opname'
    });
  }
};

// =========================
// GET BY TOKO
// =========================
exports.getByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await StokOpname.getByToko(toko_id, page, limit);

    res.json({
      success: true,
      message: 'Data stok opname berdasarkan toko berhasil diambil',
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok opname'
    });
  }
};
