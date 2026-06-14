const Absensi = require('../models/Absensi');

exports.createAbsensi = async (req, res) => {
  try {
    const { user_id, toko_id, jenis, tanggal } = req.body;


    // req.file akan berisi data file jika ada upload dari multer
    const foto = req.file ? req.file.filename : null;

    const result = await Absensi.createAbsensi({
      user_id,
      toko_id,
      jenis,
      foto,
      tanggal
    });

    res.status(201).json({ message: 'Absensi created successfully', data: result });
  } catch (error) {
    console.error('Error creating absensi:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAbsensi = async (req, res) => {
  try {
    const { toko_id } = req.query; // Bisa kirim params toko_id di url (misal: /api/absensi?toko_id=1)
    const result = await Absensi.getAbsensi(toko_id);
    res.status(200).json({ message: 'Success', data: result });
  } catch (error) {
    console.error('Error fetching absensi:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAbsensiByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    let { start_date, end_date } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id wajib diisi'
      });
    }

    // default 1 bulan terakhir
    if (!start_date || !end_date) {
      const today = new Date();
      end_date = today.toISOString().split('T')[0];

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      start_date = lastMonth.toISOString().split('T')[0];
    }

    const data = await Absensi.getAbsensiByUser(
      user_id,
      start_date,
      end_date
    );

    return res.status(200).json({
      success: true,
      start_date,
      end_date,
      data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};