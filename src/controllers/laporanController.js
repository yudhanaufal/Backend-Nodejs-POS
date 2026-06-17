const Laporan = require('../models/Laporan');
const ExcelJS = require('exceljs');

exports.getLaporanNilaiStok = async (req, res) => {
  try {
    const { toko_id } = req.params;

    const data = await Laporan.getNilaiStokByToko(toko_id);

    const total_nilai_stok = data.reduce(
      (sum, item) => sum + Number(item.nilai_stok),
      0
    );

    res.json({
      success: true,
      toko_id,
      total_nilai_stok,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan nilai stok'
    });
  }
};

exports.getLaporanNilaiStokByTanggal = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { tanggal } = req.query;

    if (!tanggal) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tanggal diperlukan'
      });
    }

    const data = await Laporan.getNilaiStokByTanggal(toko_id, tanggal);

    const total_nilai_stok = data.reduce(
      (sum, item) => sum + Number(item.nilai_stok),
      0
    );

    res.json({
      success: true,
      toko_id,
      tanggal,
      total_nilai_stok,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan nilai stok'
    });
  }
};

exports.getLaporanProdukTerlaris = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start_date dan end_date diperlukan'
      });
    }

    const data = await Laporan.getProdukTerlaris(toko_id, start_date, end_date);

    res.json({
      success: true,
      toko_id,
      start_date,
      end_date,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan produk terlaris'
    });
  }
};
exports.getInOutProduk = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const toko_id = req.params.toko_id;

    // 1. Validasi apakah tanggalnya diisi
    if (!start_date || !end_date) {
      return res.status(400).json({
        status: false,
        message: "Format salah! start_date dan end_date harus diisi."
      });
    }

    // 2. Hitung selisih hari antara start_date dan end_date
    const date1 = new Date(start_date);
    const date2 = new Date(end_date);

    // Rumus mencari selisih hari
    const selisihMiliDetik = Math.abs(date2 - date1);
    const selisihHari = Math.ceil(selisihMiliDetik / (1000 * 60 * 60 * 24));

    // 3. VALIDASI MAKSIMAL 1 MINGGU (7 HARI)
    if (selisihHari > 7) {
      return res.status(400).json({
        status: false,
        message: "Rentang laporan maksimal adalah 1 minggu (7 hari)!"
      });
    }

    // 4. Jika lolos validasi, baru panggil fungsi Model
    const dataLaporan = await Laporan.getInOutproduk(toko_id, start_date, end_date);

    return res.status(200).json({
      status: true,
      message: "Berhasil mengambil laporan in/out produk",
      data: dataLaporan
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
  }
};

exports.getLaporanTransaksi = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;

    if (!start || !end || !toko_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start, end, dan toko_id wajib diisi'
      });
    }

    const data = await Laporan.getLaporanTransaksi(start, end, toko_id);
    const rekap = await Laporan.getRekap(start, end, toko_id);

    res.json({
      success: true,
      message: 'Laporan penjualan berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.getDetailByTransaksi = async (req, res) => {
  try {
    const { transaksi_id } = req.params;

    const data = await Laporan.getDetailByTransaksi(transaksi_id);

    res.json({
      success: true,
      transaksi_id,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail transaksi'
    });
  }
};

exports.getLaporanPelanggan = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;

    if (!start || !end || !toko_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start, end, dan toko_id wajib diisi'
      });
    }

    const data = await Laporan.getPelanggan(start, end, toko_id);
    const rekap = await Laporan.getRekap(start, end, toko_id);

    res.json({
      success: true,
      message: 'Laporan penjualan berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.detailProdukPelanggan = async (req, res) => {
  try {
    const { nama } = req.params;
    const { start, end, toko_id } = req.query;

    const produk = await Laporan.getProdukByPelanggan(
      nama,
      start,
      end,
      toko_id
    );

    res.json({
      success: true,
      pelanggan: nama,
      produk
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail produk pelanggan'
    });
  }
};

// EXPORT EXCEL
exports.exportNilaiStokExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const data = await Laporan.getNilaiStokByToko(toko_id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Nilai Stok');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Produk', key: 'nama_produk', width: 30 },
      { header: 'Stok Akhir', key: 'stok_akhir', width: 15 },
      { header: 'Harga Beli', key: 'harga_beli', width: 15 },
      { header: 'Nilai Stok', key: 'nilai_stok', width: 20 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nama_produk: item.nama_produk,
        stok_akhir: item.stok_akhir,
        harga_beli: item.harga_beli,
        nilai_stok: item.nilai_stok,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'Laporan_Nilai_Stok.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.exportNilaiStokByTanggalExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { tanggal } = req.query;
    const data = await Laporan.getNilaiStokByTanggal(toko_id, tanggal);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Nilai Stok');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Produk', key: 'nama_produk', width: 30 },
      { header: 'Stok Akhir', key: 'stok_akhir', width: 15 },
      { header: 'Harga Beli', key: 'harga_beli', width: 15 },
      { header: 'Nilai Stok', key: 'nilai_stok', width: 20 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nama_produk: item.nama_produk,
        stok_akhir: item.stok_akhir,
        harga_beli: item.harga_beli,
        nilai_stok: item.nilai_stok,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Laporan_Nilai_Stok_${tanggal}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.exportProdukTerlarisExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start_date, end_date } = req.query;
    const data = await Laporan.getProdukTerlaris(toko_id, start_date, end_date);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produk Terlaris');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Produk', key: 'nama_produk', width: 40 },
      { header: 'Total Terjual', key: 'total_terjual', width: 20 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nama_produk: item.nama_produk,
        total_terjual: item.total_terjual,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Produk_Terlaris_${start_date}_${end_date}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.exportTransaksiExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;
    const data = await Laporan.getLaporanTransaksi(start, end, toko_id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Transaksi');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 20 },
      { header: 'Invoice', key: 'invoice', width: 20 },
      { header: 'Member', key: 'nama_member', width: 20 },
      { header: 'Kasir', key: 'kasir', width: 15 },
      { header: 'Metode', key: 'metode', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Diskon', key: 'total_diskon', width: 15 },
      { header: 'Laba', key: 'total_laba', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        tanggal: item.tanggal,
        invoice: item.invoice,
        nama_member: item.nama_member || 'Non-Member',
        kasir: item.kasir,
        metode: item.metode,
        total: item.total,
        total_diskon: item.total_diskon,
        total_laba: item.total_laba,
        status: item.status,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Laporan_Transaksi_${start}_${end}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.exportPelangganExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;
    const data = await Laporan.getPelanggan(start, end, toko_id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Pelanggan');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Pelanggan', key: 'pelanggan', width: 30 },
      { header: 'Total Transaksi', key: 'total_transaksi', width: 15 },
      { header: 'Total Omset', key: 'total_omset', width: 15 },
      { header: 'Total Laba', key: 'total_laba', width: 15 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        pelanggan: item.pelanggan,
        total_transaksi: item.total_transaksi,
        total_omset: item.total_omset,
        total_laba: item.total_laba,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Laporan_Pelanggan_${start}_${end}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.getLaporanSetoran = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;

    if (!start || !end || !toko_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start, end, dan toko_id wajib diisi'
      });
    }

    const data = await Laporan.getSetoran(start, end, toko_id);

    const rekap = {
      total_cash: data.reduce((sum, item) => sum + Number(item.cash), 0),
      total_transfer: data.reduce((sum, item) => sum + Number(item.transfer), 0),
      total_setoran: data.reduce((sum, item) => sum + Number(item.total), 0),
      jumlah_setoran: data.length
    };

    res.json({
      success: true,
      message: 'Laporan setoran berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.exportSetoranExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;
    const data = await Laporan.getSetoran(start, end, toko_id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Setoran');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 20 },
      { header: 'Kasir', key: 'nama_kasir', width: 20 },
      { header: 'Cash', key: 'cash', width: 15 },
      { header: 'Transfer', key: 'transfer', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        tanggal: item.tanggal,
        nama_kasir: item.nama_kasir,
        cash: Number(item.cash),
        transfer: Number(item.transfer),
        total: Number(item.total),
        keterangan: item.keterangan || '-',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Laporan_Setoran_${start}_${end}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};

exports.getLaporanOperasional = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;

    if (!start || !end || !toko_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start, end, dan toko_id wajib diisi'
      });
    }

    const data = await Laporan.getOperasional(start, end, toko_id);

    const rekap = {
      total_pengeluaran: data.reduce((sum, item) => sum + Number(item.subtotal), 0),
      jumlah_item: data.length
    };

    res.json({
      success: true,
      message: 'Laporan operasional berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.getLaporanToko = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start_date dan end_date wajib cuk '
      });
    }

    const data = await Laporan.getlaporantoko(start_date, end_date);

    const rekap = {
      total_omset: data.reduce((sum, item) => sum + Number(item.total_omset), 0),
      total_laba: data.reduce((sum, item) => sum + Number(item.total_laba), 0),
      jumlah_item: data.length
    };

    res.json({
      success: true,
      message: 'Laporan toko berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.getDetailLaporanToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date || !toko_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter start_date, end_date, dan toko_id wajib diisi'
      });
    }

    const data = await Laporan.getdetaillaporantoko(start_date, end_date, toko_id);

    const rekap = {
      total_omset: data.reduce((sum, item) => sum + Number(item.total_omset), 0),
      total_laba: data.reduce((sum, item) => sum + Number(item.total_laba), 0),
      total_diskon: data.reduce((sum, item) => sum + Number(item.total_diskon), 0),
      total_transaksi: data.reduce((sum, item) => sum + Number(item.total_transaksi), 0),
      jumlah_hari: data.length
    };

    res.json({
      success: true,
      message: 'Detail laporan toko per hari berhasil diambil',
      rekap,
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};



exports.exportOperasionalExcel = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const { start, end } = req.query;
    const data = await Laporan.getOperasional(start, end, toko_id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Operasional');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 20 },
      { header: 'Kasir', key: 'nama_kasir', width: 20 },
      { header: 'Jenis Pengeluaran', key: 'jenis_pengeluaran', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Harga', key: 'harga', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Keterangan Header', key: 'keterangan_header', width: 30 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        tanggal: item.tanggal,
        nama_kasir: item.nama_kasir,
        jenis_pengeluaran: item.jenis_pengeluaran,
        quantity: item.quantity,
        harga: Number(item.harga),
        subtotal: Number(item.subtotal),
        keterangan_header: item.keterangan_header || '-',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Laporan_Operasional_${start}_${end}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal export excel' });
  }
};
