const db = require('../config/Connection');

class Sales {
    static async createSales(data) {
        const { nama_sales, no_tlp, alamat } = data

        const [result] = await db.query(
            `INSERT INTO sales (nama_sales,no_tlp,alamat)
         VALUES (?,?,?)`, [nama_sales, no_tlp, alamat])
        return result.insertId;
    }
    static async updateSales(data) {
        const { id, nama_sales, no_tlp, alamat } = data
        const [result] = await db.query(`
        UPDATE sales
        SET nama_sales = ?, no_tlp = ?, alamat = ?
        WHERE id = ?
      `, [nama_sales, no_tlp, alamat, id]);
        return result;
    }
    static async getSales() {
        const [rows] = await db.query(`
            SELECT 
                s.id,
                s.nama_sales,
                s.no_tlp,
                s.alamat
            FROM sales s
            GROUP BY s.id
            ORDER BY s.id DESC
        `);
        return rows;
    }

    static async getAllSales() {
        const [rows] = await db.query(`
            SELECT 
                s.id,
                s.nama_sales,
                s.no_tlp,
                s.alamat,
                COUNT(DISTINCT m.id) AS jumlah_member,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.Total ELSE 0 END), 0) AS total_omset,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.total_laba ELSE 0 END), 0) AS total_laba
            FROM sales s
            LEFT JOIN member m ON m.sales_id = s.id AND m.deleted_at IS NULL
            LEFT JOIN transaksi t ON t.member_id = m.id
            GROUP BY s.id
            ORDER BY s.id DESC
        `);
        return rows;
    }

    static async getSalesById(id) {
        // 1. Ambil info dasar sales & total akumulasinya
        const [salesInfo] = await db.query(
            `SELECT 
                s.id,
                s.nama_sales,
                s.no_tlp,
                s.alamat,
                COUNT(DISTINCT m.id) AS total_seluruh_member,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.Total ELSE 0 END), 0) AS total_seluruh_omset,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.total_laba ELSE 0 END), 0) AS total_seluruh_laba
            FROM sales s
            LEFT JOIN member m ON m.sales_id = s.id AND m.deleted_at IS NULL
            LEFT JOIN transaksi t ON t.member_id = m.id
            WHERE s.id = ?
            GROUP BY s.id`,
            [id]
        );

        if (!salesInfo[0]) return null;

        // 2. Ambil rincian per toko tempat member sales tersebut terdaftar
        const [perToko] = await db.query(
            `SELECT 
                tk.id AS toko_id,
                tk.nama_toko,
                COUNT(DISTINCT m.id) AS jumlah_member,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.Total ELSE 0 END), 0) AS total_omset,
                COALESCE(SUM(CASE WHEN t.Status != 'Cancel' THEN t.total_laba ELSE 0 END), 0) AS total_laba
            FROM member m
            JOIN toko tk ON m.toko_id = tk.id
            LEFT JOIN transaksi t ON t.member_id = m.id
            WHERE m.sales_id = ? AND m.deleted_at IS NULL
            GROUP BY tk.id, tk.nama_toko
            ORDER BY total_omset DESC`,
            [id]
        );

        return {
            ...salesInfo[0],
            per_toko: perToko
        };
    }

    static async getMemberByTokoAndSales(tokoId, salesId) {
        const [rows] = await db.query(`
        SELECT 
            m.id,
            m.nama_member,
            m.no_tlp,
            m.alamat,
            s.nama_sales,
            t.nama_toko,
            COUNT(DISTINCT CASE WHEN trx.Status != 'Cancel' THEN trx.id END) AS jumlah_transaksi,
            COALESCE(SUM(CASE WHEN trx.Status != 'Cancel' THEN trx.Total ELSE 0 END), 0) AS omset,
            COALESCE(SUM(CASE WHEN trx.Status != 'Cancel' THEN trx.total_laba ELSE 0 END), 0) AS laba
        FROM member m
        LEFT JOIN sales s ON s.id = m.sales_id
        LEFT JOIN toko t ON t.id = m.toko_id
        LEFT JOIN transaksi trx ON trx.member_id = m.id
        WHERE m.deleted_at IS NULL AND m.toko_id = ? AND m.sales_id = ?
        GROUP BY m.id, m.nama_member, m.no_tlp, m.alamat, s.nama_sales, t.nama_toko
        ORDER BY omset DESC
        `, [tokoId, salesId]);
        return rows;
    }

}

module.exports = Sales;