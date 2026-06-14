const db = require('../config/Connection');
const path = require('path');
const fs = require('fs');
class Absensi {
  static async createAbsensi(data) {
    const { user_id, toko_id, jenis, foto, tanggal } = data;

    // Ambil nama_lengkap dari tabel users berdasarkan user_id
    let nama_lengkap = null;
    if (user_id) {
      const [userRows] = await db.query('SELECT nama_lengkap FROM users WHERE id = ?', [user_id]);
      if (userRows.length > 0) {
        nama_lengkap = userRows[0].nama_lengkap;
      }
    }

    // Ambil nama_toko dari tabel toko berdasarkan toko_id
    let nama_toko = null;
    if (toko_id) {
      const [tokoRows] = await db.query('SELECT nama_toko FROM toko WHERE id = ?', [toko_id]);
      if (tokoRows.length > 0) {
        nama_toko = tokoRows[0].nama_toko;
      }
    }

    const params = [nama_lengkap, user_id, toko_id, nama_toko, jenis, foto, tanggal].map(v => v === undefined ? null : v);

    const [result] = await db.query(
      'INSERT INTO absensi (nama_lengkap, user_id, toko_id, nama_toko, jenis, foto, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params
    );
    return result;
  }
  static async getAbsensiByUser(user_id, start_date, end_date) {
    try {
      const [rows] = await db.query(
        `
      SELECT *
      FROM absensi
      WHERE user_id = ?
      AND STR_TO_DATE(tanggal, '%d-%m-%Y')
          BETWEEN ? AND ?
      ORDER BY id DESC
      `,
        [user_id, start_date, end_date]
      );

      return rows;
    } catch (error) {
      console.error('Error getAbsensiByUser:', error);
      throw error;
    }
  }
  static async getAbsensi(toko_id) {
    if (toko_id) {
      const [rows] = await db.query('SELECT * FROM absensi WHERE toko_id = ? ORDER BY id DESC', [toko_id]);
      return rows;
    } else {
      const [rows] = await db.query('SELECT * FROM absensi ORDER BY id DESC');
      return rows;
    }
  }
}

module.exports = Absensi;