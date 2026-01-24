const db = require('../config/Connection');

class Transaksi {
  static async generateInvoice() {
        const date = new Date();
        const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
        const [rows] = await db.query(
            "SELECT COUNT(*) as total FROM Transaksi WHERE DATE(Tanggal) = CURDATE()"
        );
        const nextNumber = (rows[0].total + 1).toString().padStart(3, '0');
        return `INV/${ymd}/${nextNumber}`;
    }

    static async create(data) {
        const { items, member_id, user_id, bayar, metode, toko_id, status } = data;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Ambil Nama Kasir (User)
            const [user] = await connection.query('SELECT nama_lengkap FROM users WHERE id = ?', [user_id]);
            const namaKasir = user[0]?.nama_lengkap || 'Unknown';

            // 2. Ambil Nama Member
            let namaMember = 'Non-Member';
            if (member_id) {
                const [member] = await connection.query('SELECT nama_member FROM member WHERE id = ?', [member_id]);
                namaMember = member[0]?.nama_member || 'Non-Member';
            }

            let totalTransaksi = 0;
            let totalLabaTransaksi = 0;
            let totalDiskonTransaksi = 0;
            const preparedItems = [];

            // 3. Olah Items (Ambil Data Produk & Hitung Otomatis)
            for (const item of items) {
                const [produk] = await connection.query(
                    'SELECT nama_produk, harga_jual, harga_beli, stok FROM produk WHERE id = ?', 
                    [item.produk_id]
                );

                if (!produk[0]) throw new Error(`Produk ID ${item.produk_id} tidak ditemukan`);
                if (produk[0].stok < item.qty) throw new Error(`Stok ${produk[0].nama_produk} habis!`);

                const p = produk[0];
                const diskonPerItem = item.diskon || 0;
                const subtotal = (p.harga_jual - diskonPerItem) * item.qty;
                const labaPerItem = (p.harga_jual - p.harga_beli - diskonPerItem) * item.qty;

                totalTransaksi += subtotal;
                totalLabaTransaksi += labaPerItem;
                totalDiskonTransaksi += (diskonPerItem * item.qty);

                preparedItems.push({
                    ...item,
                    nama_produk: p.nama_produk,
                    harga_jual: p.harga_jual,
                    harga_beli: p.harga_beli,
                    laba: labaPerItem,
                    subtotal: subtotal,
                    diskon: diskonPerItem
                });
            }

            const invoice = await this.generateInvoice();
            const kembali = bayar - totalTransaksi;

            // 4. Simpan ke Tabel Transaksi
            const [resT] = await connection.query(
                `INSERT INTO Transaksi 
                (Invoice, Total, kembali, Member, Metode, Kasir, Status, total_laba, total_diskon, toko_id, member_id, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoice, totalTransaksi, kembali, namaMember, metode, namaKasir, status, totalLabaTransaksi, totalDiskonTransaksi, toko_id, member_id, user_id]
            );

            // 5. Simpan Detail & Update Stok
            for (const pi of preparedItems) {
                await connection.query(
                    `INSERT INTO Detail_Transaksi 
                    (transaksi_id, produk_id, Nama_produk, Harga_Jual, Harga_beli, Laba, Diskon, Quantity, Subtotal) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [resT.insertId, pi.produk_id, pi.nama_produk, pi.harga_jual, pi.harga_beli, pi.laba, pi.diskon, pi.qty, pi.subtotal]
                );

                await connection.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [pi.qty, pi.produk_id]);

                // 1. Ambil nilai stok terbaru setelah di-update untuk kolom stok_sesudah
                const [stokTerbaru] = await connection.query(
                    'SELECT stok FROM produk WHERE id = ?', 
                    [pi.produk_id]
                );
                const stok_sesudah = stokTerbaru[0].stok;
                const stok_sebelum = stok_sesudah + pi.qty; // Stok sebelum adalah sesudah + qty yang dikurangi

                // 2. Jalankan Query Mutasi Stok
                await connection.query(
                    `INSERT INTO mutasi_stok 
                    (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'keluar', 'penjualan', ?, ?, ?, NOW())`,
                    [
                        pi.produk_id, 
                        toko_id, 
                        pi.qty, 
                        stok_sebelum, 
                        stok_sesudah, 
                        resT.insertId, // ref_id diisi ID Transaksi induk
                        pi.harga_beli, 
                        pi.harga_jual
                    ]
                );
            }
            
            await connection.commit();
            return { invoice, total: totalTransaksi,namaMember, namaKasir,kembali,preparedItems };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getAll() {
        // Query Join untuk melihat transaksi beserta detailnya
       
        const [detail] = await db.query(`
            SELECT td.nama_produk, td.qty, td.harga_satuan 
            FROM transaksi_detail td 
        `);
        return detail;
    }

    static async getTransaksi(){
         const [transaksi] = await db.query(`
            SELECT * FROM transaksi 
        `);
        return transaksi;
    }

   static async getById(id) {
    // // 1. Ambil data utama transaksi
    // const [transaksi] = await db.query('SELECT * FROM transaksi WHERE id = ?', [id]);

    // if (transaksi.length === 0) return null;

    // 2. Ambil semua detail item untuk transaksi ini
    const [details] = await db.query('SELECT * FROM detail_transaksi WHERE transaksi_id = ?', [id]);

    // 3. Gabungkan hasilnya
    return details; 
    }

    static async cancel(transaksiId, data) {
        const { user_id, alasan } = data; // Opsional: untuk mencatat siapa yang cancel
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Cek apakah transaksi ada dan statusnya belum 'Cancel'
            const [transaksi] = await connection.query(
                'SELECT Status, toko_id FROM Transaksi WHERE id = ?', 
                [transaksiId]
            );

            if (!transaksi[0]) throw new Error("Transaksi tidak ditemukan");
            if (transaksi[0].Status === 'Cancel') throw new Error("Transaksi sudah dibatalkan sebelumnya");

            const toko_id = transaksi[0].toko_id;

            // 2. Ambil semua detail item dari transaksi tersebut
            const [details] = await connection.query(
                'SELECT produk_id, Quantity, Harga_Beli, Harga_Jual FROM Detail_Transaksi WHERE transaksi_id = ?',
                [transaksiId]
            );

            // 3. Loop untuk mengembalikan stok dan catat mutasi
            for (const item of details) {
                // A. Ambil stok saat ini sebelum dikembalikan
                const [produk] = await connection.query('SELECT stok FROM produk WHERE id = ?', [item.produk_id]);
                const stok_sebelum = produk[0].stok;
                const stok_sesudah = stok_sebelum + item.Quantity;

                // B. Update stok di tabel produk (Tambah Kembali)
                await connection.query(
                    'UPDATE produk SET stok = ? WHERE id = ?',
                    [stok_sesudah, item.produk_id]
                );

                // C. Catat di Mutasi Stok (Tipe: Masuk, Sumber: cancel_penjualan)
                await connection.query(
                    `INSERT INTO mutasi_stok 
                    (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'masuk', 'cancel_penjualan', ?, ?, ?, NOW())`,
                    [item.produk_id, toko_id, item.Quantity, stok_sebelum, stok_sesudah, transaksiId, item.Harga_Beli, item.Harga_Jual]
                );
            }

            // 4. Ubah status transaksi menjadi 'Cancel'
            await connection.query(
                'UPDATE Transaksi SET Status = "Cancel" WHERE id = ?',
                [transaksiId]
            );

            await connection.commit();
            return { message: "Transaksi berhasil dibatalkan dan stok telah dikembalikan" };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Transaksi;