const poll = require('../config/Connection');

class Absensi {
  static async createAbsensi(data) {
    const { nama_lengkap, user_id, toko_id, nama_toko, jenis, foto, tanggal, status } = data;
    const params = [nama_lengkap, user_id, toko_id, nama_toko, jenis, foto, tanggal, status].map(v => v === undefined ? null : v);
    
    const [result] = await poll.execute(
      'INSERT INTO absensi (nama_lengkap, user_id, toko_id, nama_toko, jenis, foto, tanggal, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );
    return result;
  }

  static async getAbsensi(toko_id) {
    if (toko_id) {
      const [rows] = await poll.execute('SELECT * FROM absensi WHERE toko_id = ? ORDER BY id DESC', [toko_id]);
      return rows;
    } else {
      const [rows] = await poll.execute('SELECT * FROM absensi ORDER BY id DESC');
      return rows;
    }
  }
} 

module.exports = Absensi;