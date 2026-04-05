const Absensi = require('../models/Absensi');

exports.createAbsensi = async (req, res) => {
  try {
    const { nama_lengkap, user_id, toko_id, nama_toko, jenis, tanggal, status } = req.body;
    
   
    // req.file akan berisi data file jika ada upload dari multer
    const foto = req.file ? req.file.filename : null;
   
    const result = await Absensi.createAbsensi({
      nama_lengkap,
      user_id,
      toko_id,
      nama_toko,
      jenis,
      foto,
      tanggal,
      status
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